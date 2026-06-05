import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
let genAI = null;
// Gemini runtime calls are DISABLED — all answers use local RAG + static knowledge
const useRealAI = false;

if (API_KEY && API_KEY.trim() !== '' && API_KEY !== 'YOUR_API_KEY_HERE') {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    // NOTE: genAI is initialized for summary generation only, NOT for chat answers
    console.log('[Gemini] SDK initialized (summary use only — chat answers use local RAG)');
  } catch (err) {
    console.error('✗ Error initializing Gemini SDK:', err.message);
  }
} else {
  console.warn('⚠ No valid GEMINI_API_KEY found. Running in full local RAG mode.');
}

// -------------------------------------------------------------
// STATIC KNOWLEDGE BASE — 40+ answers, replaces Gemini for general queries
// -------------------------------------------------------------
const staticAnswers = {
  // Tech & CS fundamentals
  'what is ai': 'Artificial Intelligence (AI) is technology that enables computers to mimic human intelligence — including learning, reasoning, and problem-solving.',
  'what is artificial intelligence': 'Artificial Intelligence (AI) is technology that enables computers to mimic human intelligence — including learning, reasoning, and problem-solving.',
  'what is machine learning': 'Machine Learning is a branch of AI where systems learn patterns from data and improve automatically without being explicitly programmed.',
  'what is ml': 'Machine Learning (ML) is a branch of AI where systems learn patterns from data and improve automatically without being explicitly programmed.',
  'what is deep learning': 'Deep Learning is a subset of machine learning that uses multi-layered neural networks to learn from large amounts of data.',
  'what is nlp': 'NLP stands for Natural Language Processing — a branch of AI that deals with understanding and generating human language.',
  'what is natural language processing': 'Natural Language Processing (NLP) is a branch of AI that enables computers to understand, interpret, and generate human language.',
  'what is cnn': 'CNN stands for Convolutional Neural Network, a type of deep learning model widely used for image recognition and computer vision tasks.',
  'what is rnn': 'RNN stands for Recurrent Neural Network, a type of neural network designed to work with sequential data like text and time series.',
  'what is llm': 'LLM stands for Large Language Model — an AI model trained on vast amounts of text data to understand and generate human language (e.g., GPT, Claude, Gemini).',
  'what is rag': 'RAG stands for Retrieval-Augmented Generation. It retrieves relevant documents from a knowledge base before generating an answer, improving accuracy.',
  'what is python': 'Python is a high-level, easy-to-read programming language widely used for AI, machine learning, web development, data science, and automation.',
  'what is java': 'Java is an object-oriented programming language known for portability ("write once, run anywhere"), widely used in enterprise software and Android development.',
  'what is javascript': 'JavaScript is a scripting language primarily used to make web pages interactive. It runs in the browser and also on servers via Node.js.',
  'what is html': 'HTML (HyperText Markup Language) is the standard language used to structure web pages and their content.',
  'what is css': 'CSS (Cascading Style Sheets) is used to style and visually format HTML elements on web pages — controlling layout, colors, fonts, etc.',
  'what is sql': 'SQL (Structured Query Language) is used to manage and query relational databases — for inserting, updating, and retrieving data.',
  'what is dbms': 'DBMS (Database Management System) is software used to create, manage, and interact with databases. Examples include MySQL, PostgreSQL, and Oracle.',
  'what is oop': 'OOP (Object-Oriented Programming) is a programming paradigm that organizes code into objects with properties and methods. Core concepts: Encapsulation, Inheritance, Polymorphism, Abstraction.',
  'what is dsa': 'DSA stands for Data Structures and Algorithms — the study of organizing data efficiently (arrays, trees, graphs) and solving problems using algorithms.',
  'what is data structure': 'A Data Structure is a way of organizing and storing data in a computer so it can be accessed and modified efficiently. Examples: arrays, linked lists, stacks, queues, trees, graphs.',
  'what is algorithm': 'An Algorithm is a step-by-step procedure for solving a problem or performing a computation. Examples: sorting, searching, pathfinding algorithms.',
  'what is cloud computing': 'Cloud Computing is the delivery of computing services (servers, storage, databases, networking, software) over the internet. Examples: AWS, Azure, Google Cloud.',
  'what is operating system': 'An Operating System (OS) is system software that manages computer hardware and software resources. Examples: Windows, Linux, macOS, Android.',
  'what is os': 'An Operating System (OS) is system software that manages hardware and software resources of a computer. Examples: Windows, Linux, macOS.',
  'what is networking': 'Computer Networking is the practice of connecting computers and devices to share data and resources. Key concepts include IP addresses, protocols (TCP/IP, HTTP), and network topologies.',
  'what is cybersecurity': 'Cybersecurity is the practice of protecting systems, networks, and data from digital attacks, unauthorized access, and damage.',
  'what is git': 'Git is a distributed version control system used to track changes in source code during software development. It allows teams to collaborate on code.',
  'what is github': 'GitHub is a web-based platform built on Git. It hosts code repositories and enables collaboration, version control, and open-source contribution.',
  'what is api': 'API (Application Programming Interface) is a set of rules that allows different software applications to communicate with each other.',
  'what is blockchain': 'Blockchain is a distributed ledger technology that stores data in linked blocks, making records tamper-proof. Used in cryptocurrencies and secure transactions.',
  'what is bitcoin': 'Bitcoin is a decentralized digital cryptocurrency that uses blockchain technology for secure peer-to-peer transactions without a central authority.',
  'what is internet': 'The Internet is a global network of interconnected computers that communicate using standardized protocols (TCP/IP) to share information and services.',
  'what is compiler': 'A Compiler is a program that translates source code written in a high-level language (like C, Java) into machine code that the computer can execute.',
  'what is recursion': 'Recursion is a programming technique where a function calls itself to solve smaller instances of the same problem. It requires a base case to stop.',

  // General knowledge / India / World
  'who is trump': 'Donald Trump is an American businessman and politician who served as the 45th President of the United States (2017–2021) and was elected 47th President in 2024.',
  'who is donald trump': 'Donald Trump is an American businessman and politician who served as the 45th President of the United States (2017–2021) and was elected 47th President in 2024.',
  'who is elon musk': 'Elon Musk is a billionaire entrepreneur and CEO of Tesla, SpaceX, and X (formerly Twitter). He is known for advancing electric vehicles and space exploration.',
  'who is bill gates': 'Bill Gates is the co-founder of Microsoft and a prominent philanthropist. He is one of the wealthiest people in the world.',
  'who is mark zuckerberg': 'Mark Zuckerberg is the co-founder and CEO of Meta (formerly Facebook), one of the world\'s largest social media companies.',
  'who is jeff bezos': 'Jeff Bezos is the founder of Amazon and Blue Origin. He is one of the wealthiest people in the world.',
  'prime minister of india': 'The Prime Minister of India is Narendra Modi (as of the last available data). He has served since May 2014.',
  'who is prime minister of india': 'The Prime Minister of India is Narendra Modi (as of the last available data). He has served since May 2014.',
  'president of india': 'The President of India is Droupadi Murmu, who assumed office on July 25, 2022, becoming the first tribal woman to hold the position.',
  'who is president of india': 'The President of India is Droupadi Murmu, who assumed office on July 25, 2022, becoming the first tribal woman to hold the position.',
  'capital of india': 'The capital of India is New Delhi.',
  'what is the capital of india': 'The capital of India is New Delhi.',
  'how many planets': 'There are 8 planets in our solar system: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.',
  'how many planets are there': 'There are 8 planets in our solar system: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.',
  'what is solar system': 'The Solar System consists of the Sun and all objects gravitationally bound to it, including 8 planets, their moons, asteroids, and comets.',
};

/**
 * Look up a static answer using normalized key matching.
 * Supports exact match and partial/keyword matching.
 */
function lookupStaticAnswer(question) {
  const q = question.toLowerCase().trim().replace(/[?!.]+$/, '').trim();

  // Exact match
  if (staticAnswers[q]) return staticAnswers[q];

  // Try removing filler words for a second-pass exact match
  const simplified = q.replace(/\b(please|can you|could you|tell me|explain|describe|define)\b/g, '').trim();
  if (staticAnswers[simplified]) return staticAnswers[simplified];

  // Partial key match: check if any static key is contained in the query or vice versa
  for (const [key, answer] of Object.entries(staticAnswers)) {
    if (q.includes(key) || key.includes(q)) return answer;
  }

  return null;
}

// -------------------------------------------------------------
// IMPROVED TF-IDF VECTORIZER (Zero-Dependencies RAG)
// -------------------------------------------------------------
let corpusStats = {
  totalDocs: 0,
  docFrequency: {},
  wordScores: {}
};

export function generateLocalVector(text, updateCorpus = false) {
  const vector = new Array(768).fill(0);
  const words = text.toLowerCase().split(/[^\w]+/).filter(w => w.length > 2);

  const wordCounts = {};
  const uniqueWords = new Set();
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
    uniqueWords.add(word);
  });

  if (updateCorpus) {
    corpusStats.totalDocs++;
    uniqueWords.forEach(word => {
      corpusStats.docFrequency[word] = (corpusStats.docFrequency[word] || 0) + 1;
    });
  }

  const docLength = words.length || 1;
  words.forEach(word => {
    const tf = wordCounts[word] / docLength;
    const df = corpusStats.docFrequency[word] || 1;
    const idf = Math.log((corpusStats.totalDocs + 1) / (df + 1)) + 1;
    const tfidf = tf * idf;

    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 768;
    vector[index] += tfidf;
  });

  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + (val * val), 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}

export function calculateKeywordSimilarity(query, text) {
  const queryTerms = query.toLowerCase().split(/[^\w]+/).filter(w => w.length > 0);
  const textTerms = text.toLowerCase().split(/[^\w]+/).filter(w => w.length > 0);
  if (queryTerms.length === 0 || textTerms.length === 0) return 0;
  const textSet = new Set(textTerms);
  const matches = queryTerms.filter(term => textSet.has(term)).length;
  const maxTerms = Math.max(queryTerms.length, textTerms.length);
  return matches / maxTerms;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term =>
      term.length > 2 &&
      !['tell', 'about', 'what', 'which', 'please', 'show', 'give', 'there', 'their', 'have', 'this', 'that', 'from'].includes(term)
    );
}

function countMatches(terms, text) {
  const lower = String(text || '').toLowerCase();
  return terms.filter(term => lower.includes(term)).length;
}

export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function updateCorpusStatistics(documentText) {
  generateLocalVector(documentText, true);
}

// -------------------------------------------------------------
// INTENT CLASSIFICATION
// -------------------------------------------------------------

/**
 * Classifies query intent:
 * - 'greeting'    : hi, hello, how are you
 * - 'general'     : who is trump, what is AI
 * - 'personalized': my cgpa, my profile, my semester
 * - 'academic'    : timetable, student list, exam, assignment, uploaded documents
 *
 * IMPORTANT: Queries mentioning student list, document, pdf, attendance,
 * timetable, assignment, exam, eligible, or list always route to 'academic'.
 */
export function classifyIntent(question) {
  const q = question.toLowerCase().trim();

  // Greeting patterns — check first
  const greetingPatterns = [
    /^(hi|hello|hey|hiya|howdy|greetings|sup|what'?s up|yo)\b/,
    /^how are you/,
    /^good (morning|afternoon|evening|night)/,
    /^(what can you do|what do you do|help me|who are you|introduce yourself|tell me about yourself)\??$/,
    /^(thanks?|thank you|ok|okay|cool|got it|nice|great|awesome|perfect)\b/,
    /^(bye|goodbye|see you|cya|later)\b/,
  ];
  if (greetingPatterns.some(p => p.test(q))) return 'greeting';

  // PRIORITY: Academic document-related keywords ALWAYS → academic
  // This prevents misrouting "tell me my name is in student list" to personalized
  const hardAcademicKeywords = [
    /\b(student list|pdf|document|uploaded|timetable|assignment|exam|attendance|eligible|eligib|mst)\b/,
    /\b(in the list|in list|on the list|on list|name in|in student)\b/,
    /\b(schedule|syllabus|module|unit|viva|practical|lab|datesheet|date sheet)\b/,
    /\b(class|lecture|period|academic calendar|deadline|submission|homework)\b/,
    /\b(notice|important questions?|previous year|question paper|quiz|test)\b/,
  ];
  if (hardAcademicKeywords.some(p => p.test(q))) return 'academic';

  // General knowledge patterns
  const generalPatterns = [
    /\b(who is|who was|who are)\b.{3,}/,
    /\b(what is|what are|explain|define|describe)\s+(a |an |the )?(ai|artificial intelligence|machine learning|deep learning|blockchain|bitcoin|crypto|internet|computer|programming|python|java|javascript|html|css|cnn|rnn|llm|rag|sql|dbms|oop|dsa|git|github|cloud|networking|cybersecurity|nlp|api|recursion|compiler|algorithm|data structure)\b/,
    /\b(capital of|president of|prime minister|history of|population of)\b/,
    /\b(donald trump|elon musk|bill gates|mark zuckerberg|jeff bezos|steve jobs)\b/,
    /\b(world war|olympic|football|cricket|movie|music|song)\b/,
    /\b(how many planets|solar system|galaxy|universe|country|countries|states|continents?)\b/,
  ];
  if (generalPatterns.some(p => p.test(q))) return 'general';

  // Personalized — ONLY for genuine personal profile queries (no doc keywords)
  const personalPatterns = [
    /\b(my cgpa|my profile|my semester|my attendance|my marks|my grade|my result)\b/,
    /\b(my subjects?|my schedule|my eligibility|my mst)\b/,
    /\b(my performance|my progress|my weak subject|my strong subject)\b/,
    /\b(am i eligible|do i have|can i appear)\b/,
  ];
  if (personalPatterns.some(p => p.test(q))) return 'personalized';

  // Default → academic (triggers RAG)
  return 'academic';
}

// -------------------------------------------------------------
// AI PIPELINE HELPERS
// -------------------------------------------------------------

function cleanText(text) {
  return String(text || '')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/â€"/g, '-')
    .replace(/â†'/g, '->')
    .replace(/ðŸ[^\s]*/g, '')
    .trim();
}

function makeExtractiveAnswer(question, chunks) {
  const terms = question.toLowerCase().split(/[^\w]+/).filter(t => t.length > 2);
  const bestChunk = chunks.find(c => c?.chunk_text) || null;
  if (!bestChunk) {
    return `I couldn't find this information in the uploaded documents.`;
  }

  const sentences = cleanText(bestChunk.chunk_text)
    .split(/(?<=[.!?\n])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const matches = sentences
    .map(sentence => ({
      sentence,
      score: terms.filter(term => sentence.toLowerCase().includes(term)).length
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.sentence);

  const answerLines = matches.length > 0 ? matches : sentences.slice(0, 3);
  return `From **${bestChunk.doc_title || 'the uploaded document'}**:\n\n${answerLines.join('\n')}`;
}

// Lowered threshold for better retrieval
const RAG_CONFIDENCE_THRESHOLD = 0.30;

const QUERY_DOCUMENT_RULES = [
  { name: 'eligibility', queryTerms: ['mst', 'eligibility', 'eligible', 'attendance', 'name', 'list'], preferred: ['eligib', 'mst', 'attendance', 'exam', 'notice'], blocked: ['timetable', 'schedule', 'lecture', 'class'] },
  { name: 'timetable', queryTerms: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'class', 'lecture', 'schedule', 'timetable', 'calendar'], preferred: ['timetable', 'schedule', 'calendar', 'lecture', 'class'], blocked: ['eligib', 'assignment', 'viva'] },
  { name: 'syllabus', queryTerms: ['syllabus', 'module', 'unit', 'topic', 'topics', 'course'], preferred: ['syllabus', 'module', 'course', 'curriculum'], blocked: ['timetable', 'eligib'] },
  { name: 'viva', queryTerms: ['viva', 'practical', 'lab', 'manual', 'experiment', 'interview', 'questions'], preferred: ['viva', 'practical', 'lab', 'manual', 'experiment'], blocked: ['timetable', 'eligib'] },
  { name: 'assignment', queryTerms: ['assignment', 'submit', 'submission', 'deadline', 'homework', 'pending'], preferred: ['assignment', 'deadline', 'submission'], blocked: ['timetable', 'eligib'] },
  { name: 'exam', queryTerms: ['exam', 'test', 'quiz', 'datesheet', 'date', 'paper', 'important'], preferred: ['exam', 'test', 'quiz', 'paper', 'notice', 'important'], blocked: ['timetable'] }
];

function getQueryProfile(question) {
  const q = question.toLowerCase();
  const matchedRules = QUERY_DOCUMENT_RULES.filter(rule => rule.queryTerms.some(term => q.includes(term)));
  return {
    names: matchedRules.map(rule => rule.name),
    preferred: [...new Set(matchedRules.flatMap(rule => rule.preferred))],
    blocked: [...new Set(matchedRules.flatMap(rule => rule.blocked))]
  };
}

function getChunkMetadataText(chunk) {
  return [chunk.doc_title, chunk.doc_type, chunk.category, chunk.subject, chunk.department, chunk.tags, chunk.department_id].filter(Boolean).join(' ');
}

function getRecentRelevanceScore(chunk) {
  const rawDate = chunk.doc_created_at || chunk.created_at || chunk.upload_date || chunk.uploadDate;
  if (!rawDate) return 0;
  const uploadedAt = new Date(rawDate).getTime();
  if (Number.isNaN(uploadedAt)) return 0;
  const ageDays = Math.max(0, (Date.now() - uploadedAt) / (1000 * 60 * 60 * 24));
  return Math.max(0, 1 - (ageDays / 365));
}

function scoreChunk(question, chunk, queryVector, profile) {
  const chunkText = cleanText(chunk.chunk_text || '');
  const queryTerms = tokenize(question);
  const metadataText = getChunkMetadataText(chunk);
  const combinedText = `${metadataText} ${chunkText}`;
  const storedVector = Array.isArray(chunk.embedding) && chunk.embedding.length === 768 ? chunk.embedding : null;
  const vectorScore = cosineSimilarity(queryVector, storedVector || generateLocalVector(chunkText));
  const keywordScore = queryTerms.length > 0 ? countMatches(queryTerms, chunkText) / queryTerms.length : 0;
  const metadataScore = profile.preferred.length > 0
    ? countMatches(profile.preferred, metadataText) / profile.preferred.length
    : countMatches(queryTerms, metadataText) / Math.max(queryTerms.length, 1);
  const phraseScore = queryTerms.length > 0 ? countMatches(queryTerms, combinedText) / queryTerms.length : 0;
  const recentScore = getRecentRelevanceScore(chunk);
  const blockedScore = profile.blocked.length > 0 ? countMatches(profile.blocked, metadataText) / profile.blocked.length : 0;
  const rawScore =
    (keywordScore * 0.40) +
    (metadataScore * 0.25) +
    (Math.max(0, vectorScore) * 0.20) +
    (phraseScore * 0.25) +
    (recentScore * 0.05) -
    (blockedScore * 0.45);
  const confidence = Math.max(0, Math.min(1, rawScore));
  return { ...chunk, vectorScore, keywordScore, metadataScore, phraseScore, recentScore, blockedScore, rankScore: confidence, confidence, clean_chunk_text: chunkText };
}

function rankChunks(question, chunks) {
  const queryVector = generateLocalVector(question);
  const profile = getQueryProfile(question);
  return chunks
    .map(chunk => scoreChunk(question, chunk, queryVector, profile))
    .sort((a, b) => b.rankScore - a.rankScore);
}

function buildFocusedContext(question, chunks) {
  const terms = tokenize(question);
  return chunks.slice(0, 4).map((chunk, index) => {
    const sentences = cleanText(chunk.clean_chunk_text || chunk.chunk_text)
      .split(/(?<=[.!?\n])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    const bestSentences = sentences
      .map(sentence => ({ sentence, score: countMatches(terms, sentence) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.sentence);
    const excerpt = (bestSentences.length > 0 ? bestSentences : sentences.slice(0, 2)).join(' ').slice(0, 900);
    return `[Source ${index + 1}: ${chunk.doc_title || 'Document'} (${chunk.doc_type || 'notes'})]\n${excerpt}`;
  }).join('\n\n---\n\n');
}

/**
 * Student name lookup with partial + full name matching (case-insensitive).
 * Supports: "is ajay in student list", "is abhay pratap singh present"
 */
function findStudentInChunks(question, chunks) {
  const lowerQuery = question.toLowerCase();

  // Extract name hint from query — words after "is", "for", "named", "name is", etc.
  const nameHintMatch = lowerQuery.match(
    /(?:is|for|named?|find|search|check|name\s+is|student\s+named?)\s+([a-z][a-z\s]{1,40}?)(?:\s+in|\s+on|\s+at|\s+present|\s+there|$|\?)/
  );
  const queryNameHint = nameHintMatch ? nameHintMatch[1].trim() : null;

  if (!queryNameHint) return null;

  const hintParts = queryNameHint.split(/\s+/).filter(p => p.length > 1);
  if (hintParts.length === 0) return null;

  // Combine all chunk text for searching
  const combinedText = chunks
    .map(c => c.clean_chunk_text || c.chunk_text || c.text || '')
    .join('\n');

  const lowerCombined = combinedText.toLowerCase();

  // Try full name match first
  if (lowerCombined.includes(queryNameHint)) {
    // Capitalize first letters for display
    const displayName = queryNameHint.replace(/\b\w/g, ch => ch.toUpperCase());
    return { found: true, name: displayName };
  }

  // Try partial match — any single part of the name found
  const matchedPart = hintParts.find(part => lowerCombined.includes(part));
  if (matchedPart) {
    const displayName = matchedPart.replace(/\b\w/g, ch => ch.toUpperCase());
    return { found: true, name: displayName };
  }

  // Name hint extracted but not found in chunks
  const displayName = queryNameHint.replace(/\b\w/g, ch => ch.toUpperCase());
  return { found: false, name: displayName };
}

// Gemini is ONLY called for document summaries, never for chat answers
async function callGeminiForSummary(prompt, systemInstruction = null) {
  if (!genAI) return null;
  try {
    const modelConfig = { model: GEMINI_MODEL };
    if (systemInstruction) modelConfig.systemInstruction = systemInstruction;
    const model = genAI.getGenerativeModel(modelConfig);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error('[Gemini Summary] Request Failed:', err?.message || String(err));
    return null;
  }
}

function extractDisplayName(profileText) {
  if (!profileText || typeof profileText !== 'string') return '';
  const match = profileText.match(/(?:User|Student):\s*([^|()\n]+)/i);
  return match ? match[1].trim() : (profileText.split('|')[0].trim() || '');
}

// -------------------------------------------------------------
// MAIN EXPORTS
// -------------------------------------------------------------

export const gemini = {
  /**
   * Generates a float embedding vector for any text chunk.
   * Uses local TF-IDF only.
   */
  getEmbedding: async (text) => {
    return generateLocalVector(text);
  },

  /**
   * Generates a structured academic summary of a document.
   * Uses Gemini if available, otherwise returns a clean local fallback.
   */
  generateSummary: async (docTitle, docContent) => {
    const textSample = docContent.substring(0, 12000);

    const systemInstruction = `You are the Campus Memory Assistant — a professional AI assistant for university students and faculty.
Your summaries are accurate, well-structured, and directly grounded in the uploaded document text.
Never fabricate dates, names, or data. Always extract from the actual document content provided.`;

    const prompt = `Analyze and summarize the following university document. Provide a structured Markdown summary.

Document Title: "${docTitle}"

Document Content:
${textSample}

Produce a structured summary with these sections:
## 📋 Document Overview
Brief description of what this document is and its purpose.

## 📌 Key Information
Extract and list ALL specific facts: dates, deadlines, times, exam schedules, room numbers, course names, marks, requirements — exactly as they appear in the document. This section is critical for student reference.

## 📝 Summary
A concise 2-3 paragraph narrative summary of the document content.

## ✅ Action Items / Important Points
Bullet-point list of the most important things students need to know or act on.`;

    const result = await callGeminiForSummary(prompt, systemInstruction);
    if (result) return result;

    return `## 📋 Document Overview
This document titled **"${docTitle}"** has been uploaded to the Campus Memory Assistant.

## 📌 Key Information
- Document has been indexed and is searchable via the AI chat assistant.

## 📝 Summary
The document is available for AI-assisted Q&A. Ask specific questions in the chat to extract information from this document.

## ✅ Action Items
- Use the AI chat to ask questions about this document
- The RAG system will retrieve relevant information automatically`;
  },

  /**
   * Generates an answer based on query and provided context string.
   * LOCAL ONLY — no Gemini calls.
   */
  generateAnswer: async (query, context, userProfile = '') => {
    const hasContext = Boolean(context && context.trim().length > 10);
    const userName = extractDisplayName(userProfile);

    if (hasContext) {
      return `${userName ? `Hi ${userName}! ` : ''}Based on the uploaded documents:\n\n${context.substring(0, 500)}`;
    }
    return `${userName ? `Hi ${userName}! ` : ''}I couldn't find specific campus documents for your question. For accurate answers, ask your teacher to upload the relevant materials (timetable, syllabus, etc.) to the portal.`;
  },

  /**
   * Core RAG pipeline with intent classification.
   * Routes: greeting → static greeting | general → static knowledge | personalized → profile | academic → local RAG
   * NO Gemini calls during chat.
   */
  answerQueryWithRAG: async (question, allChunks, userContext = null) => {
    const userName = userContext?.name || '';
    const intent = classifyIntent(question);
    console.log(`[AI] Intent: "${intent}" for query: "${question.substring(0, 60)}"`);

    // ─────────────────────────────────────────────────
    // PATH 1: GREETING — static friendly responses
    // ─────────────────────────────────────────────────
    if (intent === 'greeting') {
      const q = question.toLowerCase().trim();
      if (/^(bye|goodbye|see you|cya|later)\b/.test(q)) {
        return `Goodbye${userName ? ` ${userName}` : ''}! 👋 Feel free to come back anytime you have questions.`;
      }
      if (/^(thanks?|thank you)\b/.test(q)) {
        return `You're welcome${userName ? ` ${userName}` : ''}! 😊 Let me know if you need anything else.`;
      }
      if (/^(how are you)/.test(q)) {
        return `I'm doing great, thanks for asking${userName ? ` ${userName}` : ''}! 😊 How can I help you today?`;
      }
      if (/^good (morning|afternoon|evening|night)/.test(q)) {
        const timeOfDay = q.match(/good (\w+)/)?.[1] || 'day';
        return `Good ${timeOfDay}${userName ? ` ${userName}` : ''}! 🌟 How can I assist you today?`;
      }
      if (/\b(what can you do|who are you|introduce yourself)\b/.test(q)) {
        return `I'm Campus Memory Assistant 🎓 — your academic AI companion! I can:\n- Answer questions from uploaded documents (timetables, syllabi, attendance, exam schedules)\n- Look up students in lists\n- Answer common knowledge questions\n- Help with academic queries\n\nJust ask me anything!`;
      }
      return `Hello${userName ? ` ${userName}` : ''}! 👋 I'm your Campus Memory Assistant. I can help with uploaded academic documents and common knowledge questions. What would you like to know?`;
    }

    // ─────────────────────────────────────────────────
    // PATH 2: GENERAL — static knowledge, NO Gemini
    // ─────────────────────────────────────────────────
    if (intent === 'general') {
      const staticAnswer = lookupStaticAnswer(question);
      if (staticAnswer) {
        console.log(`[AI] Static answer matched for: "${question.substring(0, 50)}"`);
        return staticAnswer;
      }
      console.log(`[AI] No static answer found for general query: "${question.substring(0, 50)}"`);
      return `I can answer academic questions from uploaded documents. General knowledge support is limited right now. Try asking about timetables, assignments, exams, or student lists from uploaded documents.`;
    }

    // ─────────────────────────────────────────────────
    // PATH 3: PERSONALIZED — profile-based answers
    // ─────────────────────────────────────────────────
    if (intent === 'personalized') {
      console.log(`[AI] Personalization path for student="${userName || 'unknown'}"`);

      // Eligibility check — search chunks for the user's name
      if (/\b(eligible|eligibility)\b/i.test(question) && userName && allChunks && allChunks.length > 0) {
        const nameParts = userName.toLowerCase().split(/\s+/).filter(Boolean);
        const eligibilityChunks = rankChunks(question, allChunks)
          .filter(c => c.confidence >= 0.25 && /\b(eligib|mst|attendance|exam)\b/i.test(`${c.doc_title} ${c.doc_type}`))
          .slice(0, 5);
        console.log(`[AI] Selected Document: ${eligibilityChunks[0]?.doc_title || 'none'}`);
        console.log(`[AI] Confidence Score: ${(eligibilityChunks[0]?.confidence || 0).toFixed(2)}`);
        const combined = eligibilityChunks.map(c => (c.chunk_text || '').toLowerCase()).join('\n');
        const hasFullName = combined.includes(userName.toLowerCase());
        const hasNameParts = nameParts.length > 0 && nameParts.every(part => combined.includes(part));
        if (hasFullName || hasNameParts) {
          return 'Yes, your name appears in the MST eligibility list.';
        }
        if (eligibilityChunks.length > 0) {
          return 'No, your name was not found in the MST eligibility list available to your department.';
        }
      }

      const userProfileContext = userContext ? `
Current Student Profile:
- Name: ${userContext.name || 'Not provided'}
- Role: ${userContext.role || 'student'}
- Department ID: ${userContext.department_id || 'Not provided'}
- Email: ${userContext.email || 'Not provided'}
` : 'No student profile available.';

      if (allChunks && allChunks.length > 0) {
        const relevant = rankChunks(question, allChunks)
          .filter(c => c.confidence >= 0.25)
          .slice(0, 4);
        if (relevant.length > 0) {
          console.log(`[AI] Selected Document: ${relevant[0]?.doc_title || 'none'}`);
          return `${userName ? `Hi ${userName}. ` : ''}I found relevant uploaded academic information for your question, but your exact personal result is not available in your current profile. Please check with your teacher or the admin panel for confirmed personal data.`;
        }
      }

      return `${userName ? `Hi ${userName}. ` : ''}I don't have access to your specific academic data like attendance, marks, results, or semester details in the current profile. Please check with your teacher or the admin panel for accurate personal information.`;
    }

    // ─────────────────────────────────────────────────
    // PATH 4: ACADEMIC — pure local RAG, NO Gemini
    // ─────────────────────────────────────────────────
    if (!allChunks || allChunks.length === 0) {
      return `No academic documents have been uploaded yet. Please ask your teacher to upload relevant materials (timetable, syllabus, attendance list, exam schedule) so I can answer your questions.`;
    }

    const sorted = rankChunks(question, allChunks);
    const topChunks = sorted.slice(0, 6);
    const bestChunk = topChunks[0] || null;
    const bestScore = bestChunk?.confidence || 0;
    const hasRelevantContent = bestScore >= RAG_CONFIDENCE_THRESHOLD;

    // Improved chunk filtering — more lenient for better coverage
    const relevantChunks = topChunks
      .filter(c => c.confidence >= Math.max(0.25, bestScore - 0.20))
      .slice(0, 5);

    // ── Student name lookup ──
    const isStudentLookup =
      /\b(student list|in the list|in list|on the list|in student|name in|present|is there|any student)\b/i.test(question) ||
      /\b(is\s+\w+\s+in|find\s+\w+|check\s+\w+|search\s+\w+)\b/i.test(question);

    if (isStudentLookup && relevantChunks.length > 0) {
      const result = findStudentInChunks(question, relevantChunks);
      if (result) {
        if (result.found) {
          return `Yes, **${result.name}** was found in the uploaded document.`;
        } else {
          return `No, **${result.name}** was not found in the uploaded document.`;
        }
      }
    }

    // ── General academic RAG answer ──
    if (hasRelevantContent && relevantChunks.length > 0) {
      console.log(`[AI] Selected Document: ${relevantChunks[0]?.doc_title || 'none'}`);
      console.log(`[AI] Confidence Score: ${bestScore.toFixed(2)}`);

      const contextStr = buildFocusedContext(question, relevantChunks);
      const extractiveAnswer = makeExtractiveAnswer(question, relevantChunks);

      if (extractiveAnswer && !extractiveAnswer.includes("couldn't find")) {
        return extractiveAnswer;
      }

      if (contextStr) {
        return `Based on the uploaded document:\n\n${contextStr.slice(0, 600)}`;
      }
    }

    // Low confidence — give best-effort answer
    if (bestChunk) {
      console.log(`[AI] Low confidence fallback (score=${bestScore.toFixed(2)})`);
      const fallbackAnswer = makeExtractiveAnswer(question, topChunks.slice(0, 2));
      if (fallbackAnswer && !fallbackAnswer.includes("couldn't find")) {
        return fallbackAnswer;
      }
    }

    return `I couldn't find a strong match in the uploaded documents for your question. Please ensure your teacher has uploaded the relevant course materials, or try rephrasing your question.`;
  }
};