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
// IMPROVED TF-IDF VECTORIZER (Zero-Dependencies RAG)
// Maintains corpus statistics for better semantic matching
// -------------------------------------------------------------
let corpusStats = {
  totalDocs: 0,
  docFrequency: {},
  wordScores: {}
};

export function generateLocalVector(text, updateCorpus = false) {
  const vector = new Array(768).fill(0);
  const words = text.toLowerCase().split(/[^\w]+/).filter(w => w.length > 2);
  
  // Count word occurrences in this document
  const wordCounts = {};
  const uniqueWords = new Set();
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
    uniqueWords.add(word);
  });
  
  // Update corpus statistics if requested (during document upload)
  if (updateCorpus) {
    corpusStats.totalDocs++;
    uniqueWords.forEach(word => {
      corpusStats.docFrequency[word] = (corpusStats.docFrequency[word] || 0) + 1;
    });
  }
  
  // Calculate TF-IDF for each word
  const docLength = words.length || 1;
  words.forEach(word => {
    // Term Frequency
    const tf = wordCounts[word] / docLength;
    
    // Inverse Document Frequency (with smoothing to avoid zeros)
    const df = corpusStats.docFrequency[word] || 1;
    const idf = Math.log((corpusStats.totalDocs + 1) / (df + 1)) + 1;
    
    const tfidf = tf * idf;
    
    // Map to 768-dimensional index using stable hash
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 768;
    vector[index] += tfidf;
  });

  // L2 Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + (val * val), 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

// Keyword-based similarity for fallback/hybrid search
export function calculateKeywordSimilarity(query, text) {
  const queryTerms = query.toLowerCase().split(/[^\w]+/).filter(w => w.length > 0);
  const textTerms = text.toLowerCase().split(/[^\w]+/).filter(w => w.length > 0);
  
  if (queryTerms.length === 0 || textTerms.length === 0) return 0;
  
  const textSet = new Set(textTerms);
  const matches = queryTerms.filter(term => textSet.has(term)).length;
  
  // Jaccard-inspired similarity: matches / max(queryTerms, textTerms)
  // More lenient than union-based to reward partial matches
  const maxTerms = Math.max(queryTerms.length, textTerms.length);
  return matches / maxTerms;
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

// Update corpus statistics during document upload (improve TF-IDF over time)
export function updateCorpusStatistics(documentText) {
  generateLocalVector(documentText, true);
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
    * Processes a strict RAG query with improved matching and fallback strategies.
    * Uses hybrid search: vector similarity + keyword matching for better results.
    */
  answerQueryWithRAG: async (question, allChunks, userContext = null) => {
    if (!allChunks || allChunks.length === 0) {
      return fallbackGeneralAnswer(question, "No college documents are uploaded yet.");
    }

    // 1. Generate query embedding
    const queryVector = await gemini.getEmbedding(question);

    // 2. Score all chunks with HYBRID SCORING (vector + keyword)
    const scoredChunks = allChunks.map(chunk => {
      // Vector similarity (semantic matching)
      const vectorScore = cosineSimilarity(queryVector, chunk.embedding);
      
      // Keyword similarity (exact term matching)
      const keywordScore = calculateKeywordSimilarity(question, chunk.chunk_text);
      
      // Combine scores: 50% vector, 50% keyword (balanced approach)
      // Keyword matching is critical for exact phrase queries like "what is on monday"
      const combinedScore = (vectorScore * 0.5) + (keywordScore * 0.5);
      
      return { 
        ...chunk, 
        vectorScore,
        keywordScore,
        similarity: combinedScore
      };
    });

    // 3. Sort by combined score
    const sortedMatches = scoredChunks
      .sort((a, b) => b.similarity - a.similarity);

    // 4. Apply EXTREME thresholds - ANY keyword match = VALID match
    // If query keywords appear in document, this MUST be used!
    const strongMatches = sortedMatches.filter(c => c.keywordScore > 0.2 || c.similarity > 0.001);
    const reasonableMatches = sortedMatches.filter(c => c.keywordScore > 0.1 || c.similarity > 0.0001);
    const topChunks = sortedMatches.length > 0 
      ? sortedMatches.slice(0, 15)  // Take up to 15 best matches
      : [];

    // Determine if we found relevant data - EXTREMELY PERMISSIVE
    const hasStrongContext = topChunks.length > 0;
    const hasAnyContext = topChunks.length > 0;

    const userProfile = userContext
      ? `Student profile: ${userContext.name || 'User'} (${userContext.role || 'user'}${userContext.department_id ? `, department ${userContext.department_id}` : ''})`
      : 'Student profile: Not provided';
    const userName = userContext?.name || extractDisplayName(userProfile);

    // 5. PRIMARY PATH: Strong semantic match found
    if (hasStrongContext) {
      const contextStr = topChunks.map(c => `[From Document: "${c.doc_title}" (${c.doc_type})] ${c.chunk_text}`).join('\n\n');

      if (useRealAI && genAI) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const systemPrompt = `You are Campus Memory Assistant, a helpful AI that answers student questions about their courses using uploaded documents.

CRITICAL RULES:
1. ALWAYS cite the document name when answering from documents
2. Use the exact information from the document provided
3. Be concise and helpful
4. Address the student by their name (${userName}) when possible
5. Format times and dates clearly
6. If asked about something not in the document, clearly say so`;

          const userPrompt = `${userProfile}

Document Information:
${contextStr}

Student Question: ${question}

Answer the question using ONLY the information from the document above. If information is not in the document, say so clearly.`;
          
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: systemPrompt
          });
          
          const response = await result.response;
          const text = response.text();
          return text;
        } catch (err) {
          console.error('Gemini API error:', err.message);
          // Fallback to formatted document response
          const matchedTexts = topChunks.map(c => c.chunk_text.trim()).join('\n');
          return `Hello ${userName}! 👋 Here's what I found in your documents:\n\n${matchedTexts}`;
        }
      }
      
      // Simulated RAG answering (Pure JS matches) - backup only
      const matchedTexts = topChunks.map(c => c.chunk_text.trim()).join('\n');
      return `Hello ${userName}! 👋 According to **${topChunks[0].doc_title}**:\n\n${matchedTexts}`;
    }

    // 6. SECONDARY PATH: Weak match found (use with caution)
    if (hasAnyContext && (topChunks[0].similarity > 0.001 || topChunks[0].keywordScore > 0.15)) {
      console.log(`RAG match found (score: ${topChunks[0].similarity.toFixed(3)}, keyword: ${topChunks[0].keywordScore?.toFixed(3) || 'N/A'}). Using available context.`);
      const contextStr = topChunks.map(c => `[From Document: "${c.doc_title}"] ${c.chunk_text}`).join('\n');

      if (useRealAI && genAI) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const prompt = `
            The user asked a question and we found a partial document match.
            Use the provided context if relevant, but supplement with general knowledge.
            
            ${userProfile}
            Context: ${contextStr}
            Question: ${question}
          `;
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (err) {
          console.warn('Weak context Gemini call failed:', err);
        }
      }
      
      const greeting = userName ? `${userName}, ` : '';
      return `${greeting}I found partial information in the documents: ${topChunks[0].chunk_text.substring(0, 200)}... However, I recommend checking the full document "${topChunks[0].doc_title}" for complete details.`;
    }

    // 7. FALLBACK: No relevant context found in documents
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
  
  // Better handling for schedule/timetable queries
  if (q.includes('exam') || q.includes('schedule') || q.includes('timetable') || q.includes('monday') || q.includes('time')) {
    return "For exam schedules, class timetables, and course timings, please check the documents uploaded by your course instructor in the Faculty Panel. The most current and accurate schedule information should be available there. If the document hasn't been uploaded yet, please request your course teacher to upload it.";
  }
  
  // Handle lab/room/location queries
  if (q.includes('lab') || q.includes('room') || q.includes('location') || q.includes('where')) {
    return "For specific lab locations, room numbers, and classroom assignments, please refer to the documents uploaded by your faculty. These details are usually found in course syllabi or room assignment documents. If you can't find this information, please ask your course instructor to upload the relevant document.";
  }
  
  // Handle course/curriculum queries
  if (q.includes('course') || q.includes('subject') || q.includes('syllabus') || q.includes('requirement')) {
    return "For detailed course information, requirements, and syllabus details, please check the documents uploaded by your course instructor. These documents contain essential information about course objectives, grading, and expectations. If the document is not available, please request your instructor to upload it to the Faculty Panel.";
  }

  return `Regarding your inquiry about "${question}", this is a general topic in its respective domain. For exact campus-specific deadlines, exam timetables, course details, or room assignments, please ensure your course instructor has uploaded the official course documents into the Faculty Panel. Let me know if you would like me to explain the general academic concepts related to this topic!`;
}
