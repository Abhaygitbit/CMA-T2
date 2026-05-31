import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const API_KEY = process.env.GEMINI_API_KEY;
let genAI = null;
let useRealAI = false;

if (API_KEY && API_KEY.trim() !== '') {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    useRealAI = true;
    console.log('Gemini AI Client initialized with real API credentials.');
  } catch (err) {
    console.error('Error initializing Gemini SDK, falling back to simulated mode:', err);
  }
} else {
  console.log('No GEMINI_API_KEY found in environment. Running in high-fidelity AI SIMULATION mode.');
}

// -------------------------------------------------------------
// PURE JS 768-DIMENSIONAL TERM HASH VECTORIZER (Zero-Dependencies RAG)
// -------------------------------------------------------------
export function generateLocalVector(text) {
  const vector = new Array(768).fill(0);
  const words = text.toLowerCase().split(/[^\w]+/);
  
  words.forEach(word => {
    if (word.length <= 2) return; // skip stop words
    
    // Stable hash function
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Map to 768-dimensional index
    const index = Math.abs(hash) % 768;
    vector[index] += 1;
  });

  // L2 Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + (val * val), 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

// Compute cosine similarity between two float arrays
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// -------------------------------------------------------------
// AI PIPELINE ADAPTERS
// -------------------------------------------------------------
export const gemini = {
  /**
    * Generates a 768-dimensional float embedding vector for any text chunk.
    */
  getEmbedding: async (text) => {
    if (useRealAI && genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text);
        if (result.embedding && result.embedding.values) {
          return result.embedding.values;
        }
      } catch (err) {
        console.warn('Real Gemini Embeddings failed, using local vectorizer:', err.message);
      }
    }
    // Fallback to stable JS word-hash vector
    return generateLocalVector(text);
  },

  /**
    * Summarizes an uploaded document.
    */
  generateSummary: async (docTitle, docContent) => {
    const textSample = docContent.substring(0, 10000);
    
    if (useRealAI && genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
          You are the Campus Memory Assistant. Synthesize a professional academic summary of the following document.
          Respond in Markdown format. Outline:
          
          ### Overview & Objective
          Summarize what this document represents, who uploaded it, and its main purpose.
          
          ### Core Contents
          Detail the core information, dates, schedules, formulas, or guidelines included in this text. Be highly precise.
          
          ### Essential Takeaways
          Provide a bulleted list of dates, times, requirements, or key numbers.
          
          Document Title: "${docTitle}"
          Document Contents:
          ${textSample}
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (err) {
        console.warn('Gemini summary failed, falling back to simulation:', err);
      }
    }
    
    return `
### Overview & Objective
This document, titled **"${docTitle}"**, serves as an essential reference material uploaded to the Campus Memory Assistant repository.

### Core Contents
The text addresses key departmental guidelines, operational timelines, and student checklists. The operational details outline modular expectations to maximize administrative efficiency.

### Essential Takeaways
*   **Context:** Prepped for immediate student integration and review.
*   **Dates & Milestones:** Subject to departmental scheduling.
*   **Support:** Ask the Gemini Research chat for further details.
`;
  },

  /**
   * Generates an answer based on query and provided context.
   * Used by the RAG Search API to answer questions with document context.
   */
  generateAnswer: async (query, context, userProfile = '') => {
    const hasContext = Boolean(context && context.trim() !== '');
    const userName = extractDisplayName(userProfile);

    if (useRealAI && genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
          You are the Campus Memory Assistant, a helpful AI tutor.
          Use the provided document context when it is relevant, but do not refuse to answer when the context is incomplete.
          If the context does not fully answer the question, provide the best helpful general answer you can and clearly separate it from document-based facts.
          
          Strict Guidelines:
          - Be concise, accurate, and helpful.
          - Prefer the document context for factual campus-specific details.
          - When needed, supplement with general knowledge instead of stopping at "no match".
          - If the user profile is provided, address the user by name naturally.
          - Do not claim unsupported document facts as certain.
          
          ${userProfile ? `${userProfile}\n` : ''}
          Context:
          ${hasContext ? context : 'No document context was provided.'}
          
          User Question:
          ${query}
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (err) {
        console.warn('Real Gemini answer generation failed, falling back to simulation:', err);
      }
    }
    
    if (!hasContext) {
      return `${userName ? `${userName}, ` : ''}I could not find a direct document match for "${query}", but I can still help with a general answer.`;
    }

    // Simulated response
    return `${userName ? `${userName}, ` : ''}No exact match was found in the uploaded documents for "${query}". Please refine the question or check the source documents for the relevant section.`;
  },

  /**
    * Processes a strict RAG query.
    * Matches question against all chunks, extracts context, and prompts Gemini.
    */
  answerQueryWithRAG: async (question, allChunks, userContext = null) => {
    if (!allChunks || allChunks.length === 0) {
      return fallbackGeneralAnswer(question, "No college documents are uploaded yet.");
    }

    // 1. Generate query embedding
    const queryVector = await gemini.getEmbedding(question);

    // 2. Score similarity on all chunks
    const scoredChunks = allChunks.map(chunk => {
      const score = cosineSimilarity(queryVector, chunk.embedding);
      return { ...chunk, similarity: score };
    });

    // 3. Sort and filter matching chunks (threshold 0.15 for word-hash vectors, 0.3 for real embeddings)
    const sortedMatches = scoredChunks
      .filter(c => c.similarity > 0.15)
      .sort((a, b) => b.similarity - a.similarity);

    // Take a wider set of chunks so Gemini has more surrounding context
    const topChunks = sortedMatches.slice(0, 5);

    // Determine if we found relevant data
    const hasContext = topChunks.length > 0 && topChunks[0].similarity > 0.18;

    const userProfile = userContext
      ? `Student profile: ${userContext.name || 'User'} (${userContext.role || 'user'}${userContext.department_id ? `, department ${userContext.department_id}` : ''})`
      : 'Student profile: Not provided';
    const userName = userContext?.name || extractDisplayName(userProfile);

    if (hasContext) {
      // Compile RAG context block
      const contextStr = topChunks.map(c => `[From Document: "${c.doc_title}" (Category: ${c.doc_type})] \nContext Content: ${c.chunk_text}`).join('\n\n');

      if (useRealAI && genAI) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const prompt = `
            You are the Campus Memory Assistant, a helpful AI tutor.
            Use the college document context as the primary source.
            If the context does not fully answer the question, provide a helpful general answer and clearly label any general knowledge.
            
            Strict Guidelines:
            - Be concise, accurate, and helpful.
            - Cite source documents naturally when using document facts.
            - Do not invent campus-specific details that are not supported by the context.
            - Address the user by name if the profile is available.
            
            ${userProfile}

            College Documents Context:
            ${contextStr}
            
            Student Question:
            ${question}
          `;
          
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (err) {
          console.warn('Real Gemini RAG answering failed, falling back to simulated RAG:', err);
        }
      }
      
      // Simulated RAG answering (Pure JS matches)
      const matchedTexts = topChunks.map(c => `"${c.chunk_text.trim()}"`).join(' and ');
      const greeting = userName ? `${userName}, ` : '';
      return `${greeting}according to the uploaded document **"${topChunks[0].doc_title}"** (${topChunks[0].doc_type}), the records indicate: ${matchedTexts}. If you want, I can also explain the general concept behind this in simpler terms.`;
    }

    // 4. FALLBACK: If no relevant context is found in uploaded documents
    const warning = `⚠️ *No strong document match found. Showing a general AI answer plus any nearby context.*\n\n`;
    
    if (useRealAI && genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
          You are an expert AI college assistant.
          The student asked a question, but there is no strong exact matching record in the uploaded campus documents.
          Provide a helpful, polite, and general academic response based on your general knowledge, and mention if the documents do not contain the exact answer.
          Address the user by name if available.
          
          ${userProfile}

          Student Question:
          ${question}
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return warning + response.text();
      } catch (err) {
        console.error('Fallback Gemini call failed:', err);
      }
    }

    // Local general intelligence simulation
    const generalAnswer = simulateGeneralKnowledgeResponse(question);
    return warning + (userName ? `${userName}, ` : '') + generalAnswer;
  }
};

function extractDisplayName(profileText) {
  if (!profileText || typeof profileText !== 'string') return '';
  const match = profileText.match(/(?:User|Student) profile:\s*([^()\n]+)/i);
  return match ? match[1].trim() : '';
}

function fallbackGeneralAnswer(question, reason) {
  const explanation = reason ? `${reason} ` : '';
  return `${explanation}No exact match was found in the uploaded documents for: "${question}".`;
}

function simulateGeneralKnowledgeResponse(question) {
  const q = question.toLowerCase();
  
  if (q.includes('capital') && q.includes('france')) {
    return "The capital of France is Paris. Paris is a major European city and a global center for art, fashion, gastronomy, and culture.";
  }
  if (q.includes('exam') || q.includes('schedule') || q.includes('monday')) {
    return "I am currently unable to find any uploaded exam schedules or timetables for Monday in the college document portal. Please request your course teacher or department administrator to upload the timetable.docx or notes.pdf file so I can retrieve the exact date.";
  }
  
  return `Regarding your inquiry about "${question}", this is a general topic in its respective domain. For exact campus-specific deadlines, exam timetables, or notes, please make sure your course instructor uploads the official course documents into the Faculty Panel. Let me know if you would like me to explain the general academic concepts related to this topic!`;
}
