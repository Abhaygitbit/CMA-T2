import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './database/database.js';
import { processDocumentUpload, sanitizeExtractedText } from './api/pdfExtractor.js';
import { gemini, cosineSimilarity, updateCorpusStatistics, classifyIntent } from './api/geminiClient.js';
import { uploadToFirebase } from './database/firebaseUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Startup env check
console.log('[server.js] SUPABASE_URL:', process.env.SUPABASE_URL || '❌ MISSING');
console.log('[server.js] SERVICE KEY LOADED:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const app = express();
const PORT = process.env.PORT || 5000;
const uploadsDir = path.join(__dirname, 'uploads');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

function safeUploadName(originalName) {
  const parsed = path.parse(originalName || 'document');
  const base = parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'document';
  const ext = (parsed.ext || '').replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12);
  return `${Date.now()}_${base}${ext}`;
}

// Local upload fallback removed — all files go to Supabase Storage

// Set up Multer for in-memory uploads (handles both PDF and DOCX)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|docx|txt)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are supported.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// -------------------------------------------------------------
// AUTHENTICATION & PORTAL APPROVAL APIS
// -------------------------------------------------------------

// User Signup Flow (Default state is always pending!)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, department_id } = req.body;
    
    if (!name || !email || !password || !role || !department_id) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const newUser = await db.insertUser({
      name,
      email,
      password,
      role, // student | teacher
      department_id,
      status: 'pending' // Enforces approval gate
    });

    res.status(201).json({
      message: 'Registration request submitted successfully. Account is pending approval.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        department_id: newUser.department_id
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Signup process failed.' });
  }
});

// User Login Flow (Checks status gates!)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.getUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    // Check status gates
    if (user.status === 'pending') {
      return res.status(403).json({ 
        error: 'Your registration request is currently pending approval by the faculty or administrator.' 
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ 
        error: 'Your registration request has been rejected. Please contact the administrator.' 
      });
    }

    // Successful login - return user profile
    res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        department_id: user.department_id,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login process failed.' });
  }
});

// Fetch Active Profile
app.get('/api/auth/me', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized session.' });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Active user session not located.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Session fetch error:', err);
    res.status(500).json({ error: 'Session fetch failed.' });
  }
});

// Update Profile Page & Password
app.put('/api/auth/profile', async (req, res) => {
  try {
    const { user_id, name, password, avatar, department_id, phone } = req.body;
    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized request.' });
    }

    const updates = {};
    if (name !== undefined && name.trim() !== '') updates.name = name.trim();
    if (password !== undefined && password.trim() !== '') updates.password = password;
    if (avatar !== undefined) updates.avatar = avatar;
    if (department_id !== undefined) updates.department_id = department_id;
    // Only include phone if the column exists in the schema
    if (phone !== undefined) updates.phone = phone;

    const updatedUser = await db.updateUserProfile(user_id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Target profile not found.' });
    }

    // Update localStorage-safe user object (no password)
    const safeUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      department_id: updatedUser.department_id,
      avatar: updatedUser.avatar,
      phone: updatedUser.phone || null
    };

    res.json({
      message: 'Profile updated successfully.',
      user: safeUser
    });
  } catch (err) {
    console.error('Profile update error:', err);
    // If the error is about a missing column, give a helpful message
    if (err.message && err.message.includes('phone')) {
      return res.status(500).json({ 
        error: 'Database schema needs updating. Please run the SUPABASE_SCHEMA.sql migration to add the phone column.' 
      });
    }
    res.status(500).json({ error: 'Failed to update profile settings.' });
  }
});

// Get Pending Registrations Queue (Admin sees all; Teachers see only department students)
app.get('/api/auth/pending', async (req, res) => {
  try {
    const { role, department_id } = req.query;

    if (role === 'admin') {
      // Admin sees pending teachers and students
      const pending = await db.getPendingUsers();
      res.json(pending);
    } else if (role === 'teacher') {
      // Teacher sees pending students in their department only
      const pending = await db.getPendingUsers('student');
      const filtered = pending.filter(u => u.department_id === department_id);
      res.json(filtered);
    } else {
      res.status(403).json({ error: 'Access denied.' });
    }
  } catch (err) {
    console.error('Pending queue fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch pending approval list.' });
  }
});

// Approve or Reject Users
app.put('/api/auth/users/:id/approve', async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body; // approved | rejected

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid approval status selection.' });
    }

    const changed = await db.updateUserStatus(userId, status);
    if (!changed) {
      return res.status(404).json({ error: 'Target registration request not found.' });
    }

    res.json({ message: `User registration status updated to: ${status}.`, success: true });
  } catch (err) {
    console.error('Approval change error:', err);
    res.status(500).json({ error: 'Curation approval failed.' });
  }
});

// -------------------------------------------------------------
// RAG INGESTION & DOCUMENT MANAGEMENT (FACULTY & CURATORS)
// -------------------------------------------------------------

// Upload Document -> Chunk & Embedding vector generation!
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }
    const { title, file_type, uploader_id, department_id } = req.body;

    if (!file_type || !uploader_id || !department_id) {
      return res.status(400).json({ error: 'All fields (file_type, uploader_id, department_id) are required.' });
    }

    console.log(`Ingestion: Processing upload "${req.file.originalname}" of type "${file_type}"...`);

    // 1. Process document: extract text & generate overlapping 800-char chunks
    const parsed = await processDocumentUpload(req.file.buffer, req.file.originalname);
    
    // VALIDATE: Check if extracted text is acceptable quality
    if (!parsed.rawText || parsed.rawText.trim().length < 20) {
      return res.status(400).json({ 
        error: 'Document extraction failed: Could not extract readable text from the uploaded file. ' +
               'Please ensure the file is not corrupted, encrypted, or in an unsupported format. ' +
               'Try uploading as TXT or DOCX instead of PDF.'
      });
    }
    
    // VALIDATE: Check if text looks like garbage (mostly non-ASCII characters)
    const validChars = parsed.rawText.match(/[a-zA-Z0-9\s:.,;'"()\-\n]/g) || [];
    const validRatio = validChars.length / parsed.rawText.length;
    
    if (validRatio < 0.4) {
      return res.status(400).json({ 
        error: `Document quality issue: Extracted text appears corrupted or unreadable (${(validRatio*100).toFixed(1)}% valid). ` +
               'This may be an encrypted PDF or image-based PDF. Please provide a text-based or word document instead.'
      });
    }
    
    console.log(`Extraction quality check: ${(validRatio*100).toFixed(1)}% valid characters - PASSED`);
    
    // Update corpus statistics for TF-IDF vectorization
    updateCorpusStatistics(parsed.rawText);
    
    // 2. Upload file to Supabase Storage
    const supabaseUpload = await uploadToFirebase(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype  // ← correct MIME type, fixes "signature verification failed"
    );
    console.log('[server.js] ✓ Upload complete:', supabaseUpload.publicUrl);

    // 3. Insert master document record with Supabase public URL
    const docConfig = {
      id: `doc_${Date.now()}`,
      title: title || parsed.title,
      file_type: file_type, // notes | timetable | notice | assignment | exam
      storage_path: supabaseUpload.publicUrl, // Supabase public URL — never a local path
      uploader_id,
      department_id
    };
    
    const savedDoc = await db.insertDocument(docConfig);

    // 4. Loop chunks and compile 768-dimensional embeddings via Gemini/JS vectors
    const chunkRecords = [];
    console.log(`Ingestion: Document split into ${parsed.chunks.length} chunks. Generating embeddings...`);

    for (let i = 0; i < parsed.chunks.length; i++) {
      const chunkText = parsed.chunks[i];
      const vector = await gemini.getEmbedding(chunkText);
      chunkRecords.push({
        id: `chk_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
        document_id: savedDoc.id,
        chunk_text: chunkText,
        embedding: vector
      });
    }

    // 5. Save chunk records into document_chunks table
    await db.insertDocumentChunks(chunkRecords);
    
    db.logAnalytics(savedDoc.id, 'upload');
    console.log(`✓ Upload complete: "${savedDoc.title}" → ${parsed.chunks.length} chunks indexed`);

    res.status(201).json({
      message: `Document "${savedDoc.title}" uploaded and indexed successfully. ${parsed.chunks.length} chunks processed.`,
      document: savedDoc,
      chunksCount: parsed.chunks.length,
      storageURL: supabaseUpload.publicUrl
    });
  } catch (err) {
    console.error('Administrative ingestion failed:', err);
    res.status(500).json({ error: err.message || 'File ingestion process failed.' });
  }
});

// Fetch catalog list of documents
app.get('/api/documents', async (req, res) => {
  try {
    const { q, dept, type, uploader_id } = req.query;
    
    if (q) {
      db.logAnalytics(null, 'search', q);
    }

    const docs = await db.getDocuments({
      q,
      department_id: dept,
      file_type: type,
      uploader_id
    });
    res.json(docs);
  } catch (err) {
    console.error('Error fetching documents list:', err);
    res.status(500).json({ error: 'Failed to retrieve documents catalog.' });
  }
});

// Download document — redirects to Supabase public URL
app.get('/api/documents/:id/download', async (req, res) => {
  try {
    const doc = await db.getDocumentById(req.params.id);
    if (!doc || !doc.storage_path) {
      return res.status(404).json({ error: 'Document file not found.' });
    }
    const requesterDept = req.query.department_id || req.query.user_department_id;
    if (requesterDept && doc.department_id && doc.department_id !== requesterDept) {
      return res.status(403).json({ error: 'You can only access documents from your department.' });
    }

    // All new uploads are Supabase public URLs — redirect directly
    if (/^https?:\/\//i.test(doc.storage_path)) {
      return res.redirect(doc.storage_path);
    }

    // Legacy local path fallback (old uploads before migration)
    return res.status(410).json({
      error: 'This document was uploaded before Supabase migration and is no longer available. Please ask the teacher to re-upload it.'
    });
  } catch (err) {
    console.error('Document download failed:', err);
    res.status(500).json({ error: 'Failed to download document.' });
  }
});

// Delete document (cascades chunks)
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const { uploader_id } = req.query;

    const doc = await db.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Verify ownership — skip check if no uploader_id provided (trust the caller)
    if (uploader_id) {
      const uploader = await db.getUserById(uploader_id);
      if (uploader && uploader.role !== 'admin' && doc.uploader_id !== uploader_id) {
        return res.status(403).json({ error: 'Unauthorized to delete this file.' });
      }
    }

    await db.deleteDocument(docId);
    console.log(`Deleted document: ${docId}`);
    res.json({ message: 'Document deleted successfully.', id: docId });
  } catch (err) {
    console.error('Deletion fail:', err);
    res.status(500).json({ error: err.message || 'Failed to delete document.' });
  }
});

// Get document details & triggers views
app.get('/api/documents/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const doc = await db.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    db.logAnalytics(docId, 'view');
    res.json(doc);
  } catch (err) {
    console.error('Details fetch fail:', err);
    res.status(500).json({ error: 'Failed to fetch details.' });
  }
});

// Generate document AI summary
app.get('/api/documents/:id/summary', async (req, res) => {
  try {
    const docId = req.params.id;
    const doc = await db.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Pull raw document text from its chunks
    const chunks = await db.getAllDocumentChunks();
    const docChunks = chunks.filter(c => c.document_id === docId);
    const fullText = docChunks.map(c => c.chunk_text).join('\n\n');

    db.logAnalytics(docId, 'ai_summary');
    const summary = await gemini.generateSummary(doc.title, fullText || 'No text extracted.');
    res.json({ summary });
  } catch (err) {
    console.error('AI summary fail:', err);
    res.status(500).json({ error: 'Failed to generate AI summary.' });
  }
});

// Research catalog search for the Research Hub
app.get('/api/research/search', async (req, res) => {
  try {
    const { q = '', dept = '', year = '' } = req.query;
    const terms = String(q || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(term => term.length > 2);

    let papers = await db.getDocuments({
      department_id: dept || undefined,
      file_type: 'research'
    });

    const allChunks = await db.getAllDocumentChunks();
    const chunksByDocument = allChunks.reduce((map, chunk) => {
      if (!map[chunk.document_id]) {
        map[chunk.document_id] = [];
      }
      map[chunk.document_id].push(chunk);
      return map;
    }, {});

    papers = papers.map(paper => {
      const paperChunks = chunksByDocument[paper.id] || [];
      const reconstructedText = paper.full_text || paperChunks.map(chunk => chunk.chunk_text).join('\n\n');
      const reconstructedAbstract = paper.abstract || paperChunks[0]?.chunk_text || '';
      const content = `${paper.title || ''} ${reconstructedAbstract || ''} ${reconstructedText || ''}`.toLowerCase();
      const hitCount = terms.reduce((count, term) => count + (content.includes(term) ? 1 : 0), 0);
      const queryScore = terms.length > 0 ? hitCount / terms.length : 1;

      return {
        ...paper,
        abstract: reconstructedAbstract,
        full_text: reconstructedText,
        searchScore: queryScore
      };
    }).filter(paper => {
      const matchesYear = !year || String(paper.year || '') === String(year);
      const matchesQuery = terms.length === 0 || paper.searchScore > 0;
      return matchesYear && matchesQuery;
    }).sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0)).map(paper => ({
      ...paper,
      department_id: paper.department_id || dept || '1'
    }));

    res.json(papers);
  } catch (err) {
    console.error('Research search failed:', err);
    res.status(500).json({ error: 'Failed to search research catalog.' });
  }
});

app.get('/api/research/:id/summary', async (req, res) => {
  try {
    const paperId = req.params.id;
    const paper = await db.getDocumentById(paperId);

    if (!paper) {
      return res.status(404).json({ error: 'Research paper not found.' });
    }

    const chunks = await db.getAllDocumentChunks();
    const paperChunks = chunks.filter(chunk => chunk.document_id === paperId);
    const fullText = paper.full_text || paperChunks.map(chunk => chunk.chunk_text).join('\n\n');

    const summary = await gemini.generateSummary(paper.title || 'Research Paper', fullText || paper.abstract || 'No text extracted.');
    res.json({ summary });
  } catch (err) {
    console.error('Research summary failed:', err);
    res.status(500).json({ error: 'Failed to generate research summary.' });
  }
});

// Multi-paper literature review synthesis
app.post('/api/research/lit-review', async (req, res) => {
  try {
    const { paperIds, topic } = req.body;

    if (!Array.isArray(paperIds) || paperIds.length < 2) {
      return res.status(400).json({ error: 'At least two paperIds are required.' });
    }

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'topic is required.' });
    }

    const selectedPapers = [];
    for (const paperId of paperIds) {
      const paper = await db.getDocumentById(paperId);
      if (paper) selectedPapers.push(paper);
    }

    if (selectedPapers.length < 2) {
      return res.status(404).json({ error: 'Unable to locate enough papers for synthesis.' });
    }

    const reviewContext = selectedPapers.map(paper => (
      `Title: ${paper.title || 'Untitled'}\nAbstract: ${paper.abstract || ''}\nText: ${(paper.full_text || '').slice(0, 5000)}`
    )).join('\n\n---\n\n');

    const review = await gemini.generateAnswer(
      `Write a comparative literature review focused on: ${topic}`,
      reviewContext
    );

    res.json({ review });
  } catch (err) {
    console.error('Literature review synthesis failed:', err);
    res.status(500).json({ error: 'Failed to generate literature review.' });
  }
});

// -------------------------------------------------------------
// STUDENT CORE RAG DISCUSSION APIS
// -------------------------------------------------------------

// 1. General Department RAG Chat (RAG over ALL department uploads)
app.post('/api/research/general/chat', async (req, res) => {
  try {
    const { question, department_id, user_context } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    // Pull all chunks in college
    const allChunks = await db.getAllDocumentChunks();
    const effectiveDepartmentId = department_id || user_context?.department_id || null;
    const deptChunks = effectiveDepartmentId
      ? allChunks.filter(c => c.department_id === effectiveDepartmentId)
      : allChunks;

    db.logAnalytics(null, 'rag_chat', question);
    const answer = await gemini.answerQueryWithRAG(question, deptChunks, user_context);
    res.json({ answer });
  } catch (err) {
    console.error('General RAG Chat failed:', err);
    res.status(500).json({ error: 'Failed to retrieve general AI answer.' });
  }
});

// 2. Target Document RAG Chat (RAG over specific document ONLY)
app.post('/api/research/:id/chat', async (req, res) => {
  try {
    const docId = req.params.id;
    const { question, user_context } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    // Pull all chunks in college
    const allChunks = await db.getAllDocumentChunks();
    // Filter chunks of this specific document only
    const docChunks = allChunks.filter(c => c.document_id === docId);

    db.logAnalytics(docId, 'doc_chat', question);
    const answer = await gemini.answerQueryWithRAG(question, docChunks, user_context);
    res.json({ answer });
  } catch (err) {
    console.error('Target document RAG Q&A failed:', err);
    res.status(500).json({ error: 'Failed to retrieve document AI answer.' });
  }
});

// -------------------------------------------------------------
// BOOKMARK ENDPOINTS
// -------------------------------------------------------------
app.get('/api/user/bookmarks', async (req, res) => {
  try {
    const userId = req.query.user_id || 'default_user';
    const bookmarks = await db.getBookmarks(userId);
    res.json(bookmarks);
  } catch (err) {
    console.error('Bookmarks fail:', err);
    res.status(500).json({ error: 'Failed to load bookmarks.' });
  }
});

app.post('/api/research/:id/bookmark', async (req, res) => {
  try {
    const docId = req.params.id;
    const userId = req.body.user_id || 'default_user';
    const bookmark = await db.addBookmark(userId, docId);
    res.json({ success: true, bookmark });
  } catch (err) {
    console.error('Bookmark add failed:', err);
    res.status(500).json({ error: 'Failed to add bookmark.' });
  }
});

app.delete('/api/research/:id/bookmark', async (req, res) => {
  try {
    const docId = req.params.id;
    const userId = req.query.user_id || 'default_user';
    await db.removeBookmark(userId, docId);
    res.json({ success: true });
  } catch (err) {
    console.error('Bookmark remove failed:', err);
    res.status(500).json({ error: 'Failed to remove bookmark.' });
  }
});

// Admin: Get pending users
app.get('/api/admin/pending-users', async (req, res) => {
  try {
    const { role } = req.query;
    const users = await db.getPendingUsers(role || null);
    res.json(users);
  } catch (err) {
    console.error('Error fetching pending users:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: Approve or reject user
app.post('/api/admin/users/:userId/approve', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await db.updateUserStatus(req.params.userId, status);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch portal usage statistics
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const stats = await db.getAnalyticsSummary();
    res.json(stats);
  } catch (err) {
    console.error('Error generating usage statistics:', err);
    res.status(500).json({ error: 'Analytics stats generation failed.' });
  }
});

// Get departments list
app.get('/api/departments', async (req, res) => {
  try {
    const departments = await db.getDepartments();
    res.json(departments);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: 'Failed to fetch departments.' });
  }
});

// Admin: Upload research document with department targeting
app.post('/api/admin/research/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }
    const { department_id } = req.body;

    if (!department_id) {
      return res.status(400).json({ error: 'Department ID is required.' });
    }

    console.log(`Admin Research Ingestion: Processing upload "${req.file.originalname}" for dept ${department_id}...`);

    // 1. Process document: extract text & generate overlapping chunks
    const parsed = await processDocumentUpload(req.file.buffer, req.file.originalname);
    
    // 2. Insert master document record with status 'pending' for admin review
    const docConfig = {
      id: `doc_${Date.now()}`,
      title: parsed.title || req.file.originalname,
      file_type: 'research', // Mark as research document
      storage_path: `uploads/${Date.now()}_${req.file.originalname}`,
      uploader_id: 'admin',
      department_id,
      status: 'pending' // Start as pending for admin review
    };
    
    const savedDoc = await db.insertDocument(docConfig);

    // 3. Loop chunks and compile embeddings via Gemini
    const chunkRecords = [];
    console.log(`Admin Research: Document split into ${parsed.chunks.length} chunks. Generating embeddings...`);

    for (let i = 0; i < parsed.chunks.length; i++) {
      const chunkText = parsed.chunks[i];
      const vector = await gemini.getEmbedding(chunkText);
      chunkRecords.push({
        id: `chk_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
        document_id: savedDoc.id,
        chunk_text: chunkText,
        embedding: vector
      });
    }

    // 4. Save chunk records into document_chunks table
    await db.insertDocumentChunks(chunkRecords);
    
    db.logAnalytics(savedDoc.id, 'admin_upload');
    console.log(`Admin Research: Indexed document ID: ${savedDoc.id}`);

    res.status(201).json({
      message: 'Research document successfully ingested and queued for review.',
      paper: {
        id: savedDoc.id,
        title: savedDoc.title,
        file_type: savedDoc.file_type,
        department_id: savedDoc.department_id,
        status: savedDoc.status,
        chunksCount: parsed.chunks.length,
        authors: 'To be verified',
        year: new Date().getFullYear(),
        abstract: parsed.chunks[0] || 'Document excerpt pending review'
      }
    });
  } catch (err) {
    console.error('Admin research ingestion failed:', err);
    res.status(500).json({ error: err.message || 'Research upload process failed.' });
  }
});

// Admin: Get pending research uploads for review
app.get('/api/admin/research/pending', async (req, res) => {
  try {
    const docs = await db.getDocuments({ status: 'pending', file_type: 'research' });
    res.json(docs);
  } catch (err) {
    console.error('Error fetching pending research:', err);
    res.status(500).json({ error: 'Failed to fetch pending uploads.' });
  }
});

// Admin: Review/Approve/Reject research document
app.put('/api/admin/research/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const { title, authors, year, abstract, approved, reject } = req.body;

    if (!docId) {
      return res.status(400).json({ error: 'Document ID is required.' });
    }

    const doc = await db.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Research document not found.' });
    }

    // Update document metadata if being approved with changes
    if (approved) {
      const updates = {
        title: title || doc.title,
        status: 'approved'
      };
      const updated = await db.updateDocument(docId, updates);
      db.logAnalytics(docId, 'research_approved');
      
      return res.json({
        message: 'Research document approved and indexed.',
        document: updated
      });
    }

    // Reject the document
    if (reject) {
      await db.deleteDocument(docId);
      db.logAnalytics(docId, 'research_rejected');
      
      return res.json({
        message: 'Research document rejected and removed.',
        id: docId
      });
    }

    res.status(400).json({ error: 'Invalid action. Specify approved or reject.' });
  } catch (err) {
    console.error('Research document review failed:', err);
    res.status(500).json({ error: err.message || 'Failed to process research review.' });
  }
});

// ============================================================
// ADMIN: ALL DOCUMENTS ACCESS
// ============================================================

// Admin: Get ALL documents from all teachers (with optional filters)
app.get('/api/admin/documents', async (req, res) => {
  try {
    const { q, dept, type } = req.query;
    const docs = await db.getDocuments({
      q,
      department_id: dept || undefined,
      file_type: type || undefined
    });
    res.json(docs);
  } catch (err) {
    console.error('Admin documents fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// Admin: Delete any document (admin override)
app.delete('/api/admin/documents/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const doc = await db.getDocumentById(docId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    await db.deleteDocument(docId);
    res.json({ message: 'Document deleted successfully.', id: docId });
  } catch (err) {
    console.error('Admin doc delete error:', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

// ============================================================
// BOOKMARKS APIS
// ============================================================

// GET user bookmarks
app.get('/api/bookmarks', async (req, res) => {
  try {
    const { user_id, department_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    
    const bookmarks = await db.getBookmarks(user_id);
    res.json(department_id ? bookmarks.filter(doc => doc.department_id === department_id) : bookmarks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD bookmark
app.post('/api/bookmarks', async (req, res) => {
  try {
    const { user_id, document_id } = req.body;
    if (!user_id || !document_id) {
      return res.status(400).json({ error: 'user_id and document_id required' });
    }
    
    const bookmark = await db.addBookmark(user_id, document_id);
    res.status(201).json({ success: true, bookmark });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REMOVE bookmark
app.delete('/api/bookmarks/:docId', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    
    await db.removeBookmark(user_id, req.params.docId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// RAG SEARCH API — uses improved answerQueryWithRAG
// ============================================================
app.post('/api/rag/search', async (req, res) => {
  try {
    const { query, department_id, user_context } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();

    // Get all chunks, filtered by department
    const allChunks = await db.getAllDocumentChunks();
    const effectiveDeptId = department_id || user_context?.department_id || null;
    const filteredChunks = effectiveDeptId
      ? allChunks.filter(c => c.department_id === effectiveDeptId)
      : allChunks;

    const intent = classifyIntent(query);
    console.log(`[RAG] intent=${intent} dept=${effectiveDeptId || 'all'} chunks=${filteredChunks.length} query="${query.substring(0, 80)}"`);

    // Use the unified RAG pipeline (handles both doc-based and general knowledge)
    const answer = await gemini.answerQueryWithRAG(query, filteredChunks, user_context);

    // Log analytics
    await db.logAnalytics(null, 'RAG', query);

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    res.json({
      answer,
      sourceDocument: ['academic', 'personalized'].includes(intent) ? null : 'General Knowledge',
      intent,
      relevantChunks: filteredChunks.length,
      processingTime: `${processingTime}s`
    });
  } catch (err) {
    console.error('RAG search error:', err);
    res.status(500).json({ error: err.message || 'AI search failed.' });
  }
});

// ============================================================
// ADMIN USER MANAGEMENT APIS
// ============================================================

// GET all users (admin: all, teacher: own dept students only)
app.get('/api/admin/users', async (req, res) => {
  try {
    const { role, department_id, caller_role, caller_dept } = req.query;
    const users = await db.getAllUsers({ role, department_id });
    if (caller_role === 'teacher') {
      const filtered = users.filter(u => u.role === 'student' && u.department_id === caller_dept);
      return res.json(filtered);
    }
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE user (admin only — auto-approved)
app.post('/api/admin/users', async (req, res) => {
  try {
    const { name, email, password, role, department_id, phone } = req.body;
    if (!name || !email || !password || !role || !department_id) {
      return res.status(400).json({ error: 'name, email, password, role, and department_id are required.' });
    }
    const existing = await db.getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'A user with this email already exists.' });
    const newUser = await db.insertUser({ name, email, password, role, department_id, phone: phone || null, status: 'approved' });
    res.status(201).json({ message: 'User created and auto-approved.', user: newUser });
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE user (admin edit)
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { name, email, department_id, role, status, phone } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (department_id !== undefined) updates.department_id = department_id;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    if (phone !== undefined) updates.phone = phone;
    await db.updateUserProfile(req.params.id, updates);
    const updated = await db.getUserById(req.params.id);
    res.json({ message: 'User updated successfully.', user: updated });
  } catch (err) {
    console.error('Admin update user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE user (admin only)
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await db.deleteUser(userId);
    res.json({ message: 'User account permanently deleted.', id: userId });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// SUSPEND / REACTIVATE user
app.put('/api/admin/users/:id/suspend', async (req, res) => {
  try {
    const { action } = req.body;
    const newStatus = action === 'suspend' ? 'suspended' : 'approved';
    await db.updateUserStatus(req.params.id, newStatus);
    res.json({ message: `User ${action === 'suspend' ? 'suspended' : 'reactivated'}.`, status: newStatus });
  } catch (err) {
    console.error('Suspend/reactivate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET department-wise user stats
app.get('/api/admin/user-stats', async (req, res) => {
  try {
    const stats = await db.getUserStats();
    res.json(stats);
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Teacher: GET students in their department
app.get('/api/teacher/students', async (req, res) => {
  try {
    const { department_id } = req.query;
    if (!department_id) return res.status(400).json({ error: 'department_id is required.' });
    const students = await db.getAllUsers({ role: 'student', department_id });
    res.json(students);
  } catch (err) {
    console.error('Teacher students fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Approve / reject department students
app.put('/api/teacher/students/:id/approve', async (req, res) => {
  try {
    const { status, teacher_department_id } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const student = await db.getUserById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    if (student.role !== 'student') return res.status(403).json({ error: 'Can only approve students.' });
    if (teacher_department_id && student.department_id !== teacher_department_id) {
      return res.status(403).json({ error: 'You can only approve students from your department.' });
    }
    await db.updateUserStatus(req.params.id, status);
    res.json({ message: `Student ${status} successfully.`, success: true });
  } catch (err) {
    console.error('Teacher approve student error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server listener
app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`  Campus Memory Assistant Backend Server running on Port ${PORT}`);
  console.log(`  RAG and Vector-Embeddings indexing active.`);
  console.log(`=============================================================`);
});