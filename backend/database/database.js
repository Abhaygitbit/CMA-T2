import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { fallbackDB } from './fallbackDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('✓ Connected to Supabase database');

// Check if we should use fallback DB
// Default to Supabase so the assistant can read real uploaded documents.
let useLocalFallback = process.env.USE_LOCAL_FALLBACK === 'true';

// Default departments for seeding
const defaultDepts = [
  { id: '1', name: 'Computer Science', description: 'AI, Machine Learning, Systems, and Software Engineering.' },
  { id: '2', name: 'Electrical Engineering', description: 'Microelectronics, Embedded Devices, Robotics, and IoT.' }
];

const seedUsers = [
  {
    id: 'u_admin',
    name: 'Principal Admin',
    email: 'admin@cma.edu',
    password: 'admin',
    role: 'admin',
    status: 'approved',
    department_id: '1',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    created_at: new Date().toISOString()
  },
  {
    id: 'u_teacher',
    name: 'Professor Evelyn Finch',
    email: 'teacher@cma.edu',
    password: 'password123',
    role: 'teacher',
    status: 'approved',
    department_id: '1',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    created_at: new Date().toISOString()
  },
  {
    id: 'u_student',
    name: 'Samuel Chen',
    email: 'student@cma.edu',
    password: 'password456',
    role: 'student',
    status: 'approved',
    department_id: '1',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    created_at: new Date().toISOString()
  }
];

// Initialize database tables if needed
const initializeDatabase = async () => {
  try {
    // Check if departments exist
    const { data: depts } = await supabase.from('departments').select('id').limit(1);
    
    if (!depts || depts.length === 0) {
      console.log('Seeding departments...');
      await supabase.from('departments').insert(defaultDepts);
    }
    try {
      await supabase.from('departments').delete().eq('id', '3');
      await supabase.from('departments').delete().ilike('name', '%bioengineering%');
    } catch (deptCleanupErr) {
      console.warn('Bioengineering department cleanup skipped:', deptCleanupErr.message);
    }

    // Check if users exist
    const { data: users } = await supabase.from('users').select('id').limit(1);
    
    if (!users || users.length === 0) {
      console.log('Seeding admin and test accounts...');
      await supabase.from('users').insert(seedUsers);
    }
  } catch (err) {
    console.warn('Error initializing database:', err.message);
  }
};

initializeDatabase();

// Database API
const dbReal = {
  // ============ DEPARTMENTS ============
  getDepartments: async () => {
    const { data, error } = await supabase.from('departments').select('*');
    if (error) throw error;
    return (data || []).filter(d => d.id !== '3' && !/bioengineering/i.test(d.name || ''));
  },

  // ============ USERS / AUTHENTICATION ============
  getUserByEmail: async (email) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;
  },

  getUserById: async (id) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  insertUser: async (user) => {
    const newUser = {
      id: user.id || `u_${Date.now()}`,
      name: user.name,
      email: user.email.toLowerCase(),
      password: user.password,
      role: user.role || 'student',
      status: user.status || 'pending', // Allow override (e.g. admin creates auto-approved user)
      department_id: user.department_id || '1',
      avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`,
      created_at: new Date().toISOString()
    };

    // Check for duplicates
    const existing = await dbReal.getUserByEmail(newUser.email);
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const { data, error } = await supabase.from('users').insert([newUser]).select().single();
    if (error) throw error;
    return data;
  },

  getPendingUsers: async (roleFilter = null) => {
    let query = supabase.from('users').select('*').eq('status', 'pending');
    
    if (roleFilter) {
      query = query.eq('role', roleFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  updateUserStatus: async (id, status) => {
    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  updateUserProfile: async (id, updates) => {
    const allowedFields = ['name', 'password', 'avatar', 'department_id', 'email', 'role', 'status', 'phone'];
    const fieldsToUpdate = Object.keys(updates).filter(k => allowedFields.includes(k));
    
    if (fieldsToUpdate.length === 0) return null;

    const updateData = {};
    fieldsToUpdate.forEach(f => {
      updateData[f] = updates[f];
    });

    // Try with all fields first; if phone column is missing, retry without it
    try {
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      // If error is about missing 'phone' column, retry without it
      if (err.message && (err.message.includes('phone') || err.message.includes('column'))) {
        console.warn('phone column not found in users table, retrying without it:', err.message);
        const { phone: _omit, ...updateDataWithoutPhone } = updateData;
        if (Object.keys(updateDataWithoutPhone).length > 0) {
          const { error: retryErr } = await supabase
            .from('users')
            .update(updateDataWithoutPhone)
            .eq('id', id);
          if (retryErr) throw retryErr;
        }
      } else {
        throw err;
      }
    }

    return dbReal.getUserById(id);
  },

  getAllUsers: async (filters = {}) => {
    const { role, department_id } = filters;
    let query = supabase.from('users').select('*').order('created_at', { ascending: false });
    if (role) query = query.eq('role', role);
    if (department_id) query = query.eq('department_id', department_id);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(u => ({ ...u, password: undefined }));
  },

  deleteUser: async (id) => {
    // Remove bookmarks first
    await supabase.from('bookmarks').delete().eq('user_id', id);
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  getUserStats: async () => {
    const stats = { totalStudents: 0, totalTeachers: 0, pendingApprovals: 0, activeUsers: 0, byDepartment: [] };
    try {
      const { data: allUsers } = await supabase.from('users').select('role, status, department_id, departments(name)');
      const users = allUsers || [];
      stats.totalStudents = users.filter(u => u.role === 'student').length;
      stats.totalTeachers = users.filter(u => u.role === 'teacher').length;
      stats.pendingApprovals = users.filter(u => u.status === 'pending').length;
      stats.activeUsers = users.filter(u => u.status === 'approved').length;
      const deptMap = {};
      users.forEach(u => {
        const dn = u.departments?.name || 'Unknown';
        if (!deptMap[dn]) deptMap[dn] = { students: 0, teachers: 0 };
        if (u.role === 'student') deptMap[dn].students++;
        if (u.role === 'teacher') deptMap[dn].teachers++;
      });
      stats.byDepartment = Object.entries(deptMap).map(([dept, c]) => ({ dept, ...c }));
      return stats;
    } catch (err) {
      console.error('getUserStats error:', err);
      return stats;
    }
  },

  // ============ DOCUMENTS ============
  getDocuments: async (filters = {}) => {
    const { q, department_id, file_type, uploader_id, status } = filters;

    let query = supabase
      .from('documents')
      .select(`
        *,
        uploader:users(name)
      `);

    if (department_id) query = query.eq('department_id', department_id);
    if (file_type) query = query.eq('file_type', file_type);
    if (uploader_id) query = query.eq('uploader_id', uploader_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    // Process results
    let results = (data || []).map(d => ({
      ...d,
      uploader_name: d.uploader?.name || 'Faculty'
    }));

    // Filter by search query if provided
    if (q) {
      const term = q.toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(term) ||
        (r.file_type || '').toLowerCase().includes(term)
      );
    }

    return results;
  },

  getDocumentById: async (id) => {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        uploader:users(name)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) return null;
    return {
      ...data,
      uploader_name: data.uploader?.name || 'Faculty'
    };
  },

  insertDocument: async (doc) => {
    const newDoc = {
      id: doc.id || `doc_${Date.now()}`,
      title: doc.title || 'Untitled Material',
      file_type: doc.file_type || 'notes',
      storage_path: doc.storage_path || '',
      uploader_id: doc.uploader_id || 'u_teacher',
      department_id: doc.department_id || '1',
      status: doc.status || 'active',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('documents')
      .insert([newDoc])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateDocument: async (id, updates) => {
    const fields = Object.keys(updates);
    if (fields.length === 0) return null;

    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return dbReal.getDocumentById(id);
  },

  deleteDocument: async (id) => {
    // Remove dependent records first so Supabase foreign keys do not block deletion.
    await supabase.from('analytics').delete().eq('document_id', id);
    await supabase.from('bookmarks').delete().eq('document_id', id);
    await supabase.from('document_chunks').delete().eq('document_id', id);
    
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  // ============ DOCUMENT CHUNKS & EMBEDDINGS ============
  insertDocumentChunks: async (chunks) => {
    if (chunks.length === 0) return true;

    const chunkData = chunks.map(chunk => ({
      id: chunk.id || `chk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      document_id: chunk.document_id,
      chunk_text: chunk.chunk_text,
      embedding: JSON.stringify(chunk.embedding || [])
    }));

    const { error } = await supabase
      .from('document_chunks')
      .insert(chunkData);

    if (error) throw error;
    return true;
  },

  getAllDocumentChunks: async () => {
    const { data, error } = await supabase
      .from('document_chunks')
      .select(`
        *,
        documents(title, file_type, department_id)
      `);

    if (error) throw error;

    return (data || []).map(c => ({
      ...c,
      doc_title: c.documents?.title || 'Document',
      doc_type: c.documents?.file_type || 'notes',
      department_id: c.documents?.department_id || '1',
      embedding: JSON.parse(c.embedding || '[]')
    }));
  },

  // ============ BOOKMARKS ============
  getBookmarks: async (userId = 'default_user') => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        *,
        documents(*)
      `)
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map(b => ({
      ...b.documents,
      bookmark_id: b.id,
      bookmarked_at: b.created_at
    }));
  },

  addBookmark: async (userId, docId) => {
    // Check if bookmark already exists
    const { data: existing } = await supabase
      .from('bookmarks')
      .select(`
        *,
        documents(*)
      `)
      .eq('user_id', userId)
      .eq('document_id', docId)
      .single();

    if (existing) {
      return {
        ...existing.documents,
        bookmark_id: existing.id,
        bookmarked_at: existing.created_at
      };
    }

    const newBookmark = {
      id: `b_${Date.now()}`,
      user_id: userId,
      document_id: docId,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('bookmarks')
      .insert([newBookmark])
      .select(`
        *,
        documents(*)
      `)
      .single();

    if (error) throw error;
    
    return {
      ...data.documents,
      bookmark_id: data.id,
      bookmarked_at: data.created_at
    };
  },

  removeBookmark: async (userId, docId) => {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('document_id', docId);

    if (error) throw error;
    return true;
  },

  // ============ ANALYTICS ============
  logAnalytics: async (docId, actionType, query = '') => {
    const log = {
      id: `a_${Date.now()}`,
      document_id: docId || null,
      action_type: actionType,
      query: query,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase.from('analytics').insert([log]);
    if (error) console.error('Error logging analytics:', error);
  },

  getAnalyticsSummary: async () => {
    const stats = {
      totalUsers: 0,
      totalDocuments: 0,
      totalBookmarks: 0,
      totalSearches: 0,
      deptDistribution: [],
      popularDocs: [],
      recentActivity: []
    };

    try {
      // Total users
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      stats.totalUsers = userCount || 0;

      // Total documents
      const { count: docCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });
      stats.totalDocuments = docCount || 0;

      // Total bookmarks
      const { count: bookmarkCount } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true });
      stats.totalBookmarks = bookmarkCount || 0;

      // Total searches
      const { count: searchCount } = await supabase
        .from('analytics')
        .select('*', { count: 'exact', head: true })
        .eq('action_type', 'search');
      stats.totalSearches = searchCount || 0;

      // Department distribution
      const { data: deptData } = await supabase
        .from('documents')
        .select('department_id, departments(name)')
        .order('department_id');

      const deptMap = {};
      (deptData || []).forEach(d => {
        const deptName = d.departments?.name || 'Unknown';
        deptMap[deptName] = (deptMap[deptName] || 0) + 1;
      });
      stats.deptDistribution = Object.entries(deptMap).map(([dept, count]) => ({
        dept,
        count
      }));

      // Popular documents
      const { data: analyticsData } = await supabase
        .from('analytics')
        .select('document_id, documents(title)')
        .eq('action_type', 'view')
        .order('document_id');

      const viewCounts = {};
      (analyticsData || []).forEach(a => {
        if (a.document_id) {
          const title = a.documents?.title || 'Unknown';
          viewCounts[title] = (viewCounts[title] || 0) + 1;
        }
      });
      stats.popularDocs = Object.entries(viewCounts)
        .map(([title, views]) => ({ title, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      // Recent activity
      const { data: recentData } = await supabase
        .from('analytics')
        .select('action_type, timestamp')
        .order('timestamp', { ascending: false })
        .limit(10);
      stats.recentActivity = recentData || [];

      return stats;
    } catch (err) {
      console.error('Error getting analytics summary:', err);
      return stats;
    }
  }
};

// Use fallback database if Supabase tables don't exist
export const db = useLocalFallback ? fallbackDB : dbReal;
