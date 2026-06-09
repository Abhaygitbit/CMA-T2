import { Groq } from "groq-sdk";
import { pipeline } from "@xenova/transformers";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Lazy-load the local embedding pipeline once and reuse it
let _embedder = null;
async function getEmbedder() {
  if (!_embedder) {
    console.log('[Embeddings] Loading BAAI/bge-small-en-v1.5 locally (first run downloads ~130MB)...');
    _embedder = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
      quantized: true // smaller, faster quantized model
    });
    console.log('[Embeddings] Model loaded and cached ✓');
  }
  return _embedder;
}

export async function getEmbedding(text) {
  try {
    const embedder = await getEmbedder();
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    // Convert Float32Array to plain Array for Supabase pgvector
    return Array.from(output.data);
  } catch (err) {
    console.error("Local embedding error:", err);
    throw err;
  }
}

export async function generateSummary(docTitle, docContent) {
  const prompt = `Analyze and summarize the following university document. Provide a structured Markdown summary.
Document Title: "${docTitle}"
Content: ${docContent.substring(0, 10000)}

Provide:
## 📋 Document Overview
## 📌 Key Information
## 📝 Summary
## ✅ Action Items`;
  
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });
    return chatCompletion.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("Groq Summary error:", err);
    throw err;
  }
}

export async function generateAnswerWithRAG(question, chunks, context = null) {
  let contextText = "";
  chunks.forEach((c, i) => {
    contextText += `[Citation ${i + 1}] Source Doc ID: ${c.document_id}\nContent: ${c.chunk_text}\n\n`;
  });

  const prompt = `You are a helpful academic AI assistant. Answer the user's question based ONLY on the provided context.
If the answer is not in the context, say "I couldn't find the answer in the uploaded documents."
When you use information from the context, include a citation in the format [1], [2], etc., corresponding to the Citation number.

Context:
${contextText}

Question: ${question}
Answer:`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a precise, academic AI assistant that provides citation-backed answers." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
    });
    return chatCompletion.choices[0]?.message?.content || "No answer generated.";
  } catch (err) {
    console.error("Groq RAG error:", err);
    throw err;
  }
}

export async function generateQuiz(documentContent) {
  const prompt = `Generate a 5-question multiple-choice quiz based on the following text.
Return the result strictly as a JSON array of objects with keys: "question", "options" (array of 4 strings), and "answer" (the correct option string).
Do not include any markdown formatting like \`\`\`json, just the raw JSON.

Text: ${documentContent.substring(0, 8000)}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });
    const content = chatCompletion.choices[0]?.message?.content || "[]";
    return JSON.parse(content.trim().replace(/^```json|```$/g, ''));
  } catch (err) {
    console.error("Quiz generation error:", err);
    return [];
  }
}

export async function generateStudyGuide(documentContent) {
  const prompt = `Generate a structured study guide based on the following text.
Include a Brief Overview, Key Concepts (bullet points), and Important Definitions.

Text: ${documentContent.substring(0, 10000)}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });
    return chatCompletion.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("Study Guide error:", err);
    return "";
  }
}

export async function generateFlashcards(documentContent) {
  const prompt = `Generate 5 flashcards based on the following text.
Return the result strictly as a JSON array of objects with keys: "front" (the question/concept) and "back" (the answer/definition).
Do not include any markdown formatting like \`\`\`json, just the raw JSON.

Text: ${documentContent.substring(0, 8000)}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });
    const content = chatCompletion.choices[0]?.message?.content || "[]";
    return JSON.parse(content.trim().replace(/^```json|```$/g, ''));
  } catch (err) {
    console.error("Flashcard error:", err);
    return [];
  }
}
