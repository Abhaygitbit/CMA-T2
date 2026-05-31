import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './database/database.js';
import { processDocumentUpload, sanitizeExtractedText } from './api/pdfExtractor.js';
import { gemini, cosineSimilarity } from './api/geminiClient.js';
import { uploadToFirebase } from './database/firebaseUtils.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
    const { user_id, name, password, avatar, department_id } = req.body;
    if (!user_id) {
      return res.status(401).json({ error: 'Unauthorized request.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (password !== undefined && password.trim() !== '') updates.password = password;
    if (avatar !== undefined) updates.avatar = avatar;
    if (department_id !== undefined) updates.department_id = department_id;

    const updatedUser = await db.updateUserProfile(user_id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'Target profile not found.' });
    }

    res.json({
      message: 'Profile settings updated successfully.',
      user: updatedUser
    });
  } catch (err) {
    console.error('Profile update error:', err);
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
    
    // 2. Upload file to Firebase Storage (with fallback)
    let firebaseUpload;
    try {
      firebaseUpload = await uploadToFirebase(req.file.buffer, req.file.originalname, 'documents');
    } catch (firebaseErr) {
      console.warn('Firebase upload failed, using fallback URL:', firebaseErr.message);
      // Use fallback URL for testing when Firebase is not available
      firebaseUpload = {
        storagePath: `documents/${Date.now()}_${req.file.originalname}`,
        downloadURL: `https://firebasestorage.googleapis.com/v0/b/cma-2-b83e6.appspot.com/o/documents%2F${Date.now()}_${req.file.originalname}?alt=media`,
        fileName: req.file.originalname,
        timestamp: Date.now()
      };
    }
    
    // 3. Insert master document record with Firebase URL
    const docConfig = {
      id: `doc_${Date.now()}`,
      title: title || parsed.title,
      file_type: file_type, // notes | timetable | notice | assignment | exam
      storage_path: firebaseUpload.downloadURL, // Use Firebase download URL instead of local path
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
    console.log(`Ingestion complete! Indexed document ID: ${savedDoc.id}`);

    res.status(201).json({
      message: 'Document successfully ingested, chunked, and vector-indexed.',
      document: savedDoc,
      chunksCount: parsed.chunks.length,
      firebaseURL: firebaseUpload.downloadURL
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

// Delete document (cascades chunks)
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const docId = req.params.id;
    const { uploader_id } = req.query;

    const doc = await db.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Verify uploader owns the document (unless admin)
    const uploader = await db.getUserById(uploader_id);
    if (uploader.role !== 'admin' && doc.uploader_id !== uploader_id) {
      return res.status(403).json({ error: 'Unauthorized to delete this file.' });
    }

    await db.deleteDocument(docId);
    console.log(`Ingestion: Deleted document ${docId}`);
    res.json({ message: 'Document and all vector chunks deleted successfully.', id: docId });
  } catch (err) {
    console.error('Deletion fail:', err);
    res.status(500).json({ error: 'Failed to delete document.' });
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
// BOOKMARKS APIS
// ============================================================

// GET user bookmarks
app.get('/api/bookmarks', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    
    const bookmarks = await db.getBookmarks(user_id);
    res.json(bookmarks);
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
// RAG SEARCH API
// ============================================================
app.post('/api/rag/search', async (req, res) => {
  try {
    const { query, department_id, user_context } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const startTime = Date.now();
    
    // 1. Get query embedding from Gemini
    const queryEmbedding = await gemini.getEmbedding(query);
    
    // 2. Get all chunks from Supabase
    const allChunks = await db.getAllDocumentChunks();
    
    // 3. Filter by department if specified
    let chunks = allChunks;
    if (department_id) {
      chunks = chunks.filter(c => c.department_id === department_id);
    }
    
    // 4. Calculate cosine similarity and sort
    const queryTerms = query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(term => term.length > 2);

    const scored = chunks.map(chunk => {
      const content = `${chunk.doc_title || ''} ${chunk.doc_type || ''} ${chunk.chunk_text || ''}`.toLowerCase();
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

      const termHits = queryTerms.reduce((count, term) => {
        return count + (content.includes(term) ? 1 : 0);
      }, 0);

      const lexicalScore = queryTerms.length > 0 ? termHits / queryTerms.length : 0;

      return {
        ...chunk,
        similarity,
        lexicalScore,
        rankScore: (similarity * 0.65) + (lexicalScore * 0.35)
      };
    }).sort((a, b) => b.rankScore - a.rankScore);
    
    // 5. Get top 5 most relevant chunks
    const topChunks = scored.slice(0, 5);
    
    // 6. Build context for Gemini
    const context = topChunks
      .map(chunk => `[From: "${chunk.doc_title}"] ${chunk.chunk_text}`)
      .join('\n\n---\n\n');
    const userProfile = user_context
      ? `User profile: ${user_context.name || 'Student'} (${user_context.role || 'user'}${user_context.department_id ? `, department ${user_context.department_id}` : ''})`
      : 'User profile: Not provided';
    
    // 7. Ask Gemini with context
    const answer = await gemini.generateAnswer(query, context, userProfile);

    let fallbackSnippet = topChunks[0]?.chunk_text?.slice(0, 240) || '';
    fallbackSnippet = sanitizeExtractedText(fallbackSnippet);
    const finalAnswer = answer.includes('No exact match was found') && fallbackSnippet
      ? `${answer}\n\nRelevant text: ${fallbackSnippet}${fallbackSnippet.length === 240 ? '...' : ''}`
      : answer;
    
    // 8. Log analytics
    await db.logAnalytics(null, 'RAG', query);
    
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    res.json({
      answer: finalAnswer,
      sourceDocument: topChunks[0]?.doc_title || 'Unknown',
      relevantChunks: topChunks.length,
      processingTime: `${processingTime}s`
    });
  } catch (err) {
    console.error('RAG search error:', err);
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
