// Fallback in-memory database for when Supabase tables don't exist
// This allows testing of the full API flow

const mockDB = {
  departments: [
    { id: '1', name: 'Computer Science', description: 'AI, Machine Learning, Systems, and Software Engineering.' },
    { id: '2', name: 'Electrical Engineering', description: 'Microelectronics, Embedded Devices, Robotics, and IoT.' }
  ],
  users: [
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
  ],
  documents: [],
  document_chunks: [],
  bookmarks: [],
  analytics: []
};

export const fallbackDB = {
  isUsingFallback: true,
  
  getDepartments: async () => mockDB.departments.filter(d => d.id !== '3' && !/bioengineering/i.test(d.name || '')),
  
  getUserByEmail: async (email) => {
    return mockDB.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  getUserById: async (id) => {
    return mockDB.users.find(u => u.id === id) || null;
  },

  insertUser: async (user) => {
    const newUser = {
      id: user.id || `u_${Date.now()}`,
      name: user.name,
      email: user.email.toLowerCase(),
      password: user.password,
      role: user.role || 'student',
      status: 'pending',
      department_id: user.department_id || '1',
      avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`,
      created_at: new Date().toISOString()
    };
    
    const existing = mockDB.users.find(u => u.email === newUser.email);
    if (existing) throw new Error('User with this email already exists.');
    
    mockDB.users.push(newUser);
    return newUser;
  },

  insertDocument: async (docConfig) => {
    const doc = {
      ...docConfig,
      created_at: new Date().toISOString()
    };
    mockDB.documents.push(doc);
    return doc;
  },

  insertDocumentChunks: async (chunks) => {
    mockDB.document_chunks.push(...chunks);
    return { rowCount: chunks.length };
  },

  getDocuments: async (filters = {}) => {
    let docs = [...mockDB.documents];
    
    if (filters.department_id) {
      docs = docs.filter(d => d.department_id === filters.department_id);
    }
    if (filters.file_type) {
      docs = docs.filter(d => d.file_type === filters.file_type);
    }
    if (filters.uploader_id) {
      docs = docs.filter(d => d.uploader_id === filters.uploader_id);
    }
    if (filters.status) {
      docs = docs.filter(d => d.status === filters.status);
    }
    
    return docs.map(doc => ({
      ...doc,
      uploader: mockDB.users.find(u => u.id === doc.uploader_id)
    }));
  },

  getDocumentById: async (id) => {
    const doc = mockDB.documents.find(d => d.id === id);
    if (!doc) return null;
    return {
      ...doc,
      uploader: mockDB.users.find(u => u.id === doc.uploader_id)
    };
  },

  deleteDocument: async (id) => {
    const docIndex = mockDB.documents.findIndex(d => d.id === id);
    if (docIndex === -1) return false;
    mockDB.analytics = mockDB.analytics.filter(a => a.document_id !== id);
    mockDB.bookmarks = mockDB.bookmarks.filter(b => b.document_id !== id);
    mockDB.document_chunks = mockDB.document_chunks.filter(c => c.document_id !== id);
    mockDB.documents.splice(docIndex, 1);
    return true;
  },

  getDocumentChunks: async (documentId) => {
    return mockDB.document_chunks.filter(c => c.document_id === documentId);
  },

  logAnalytics: async (documentId, actionType, query = null) => {
    mockDB.analytics.push({
      id: `ana_${Date.now()}`,
      document_id: documentId,
      action_type: actionType,
      query,
      timestamp: new Date().toISOString()
    });
    return true;
  },

  // Add other methods as needed
  getPendingUsers: async () => mockDB.users.filter(u => u.status === 'pending'),
  updateUserStatus: async (id, status) => {
    const user = mockDB.users.find(u => u.id === id);
    if (user) user.status = status;
    return true;
  },
  updateUserProfile: async (id, updates) => {
    const user = mockDB.users.find(u => u.id === id);
    if (user) Object.assign(user, updates);
    return user;
  },
  getDepartmentById: async (id) => mockDB.departments.find(d => d.id === id),
  getBookmarks: async (userId = 'default_user') => {
    return mockDB.bookmarks
      .filter(bookmark => bookmark.user_id === userId)
      .map(bookmark => {
        const document = mockDB.documents.find(doc => doc.id === bookmark.document_id);
        return document ? {
          ...document,
          bookmark_id: bookmark.id,
          bookmarked_at: bookmark.created_at
        } : null;
      })
      .filter(Boolean);
  },
  addBookmark: async (userId, docId) => {
    const existing = mockDB.bookmarks.find(bookmark => bookmark.user_id === userId && bookmark.document_id === docId);
    if (existing) {
      const document = mockDB.documents.find(doc => doc.id === docId);
      return document ? {
        ...document,
        bookmark_id: existing.id,
        bookmarked_at: existing.created_at
      } : null;
    }

    const bookmark = {
      id: `b_${Date.now()}`,
      user_id: userId,
      document_id: docId,
      created_at: new Date().toISOString()
    };

    mockDB.bookmarks.push(bookmark);

    const document = mockDB.documents.find(doc => doc.id === docId);
    return document ? {
      ...document,
      bookmark_id: bookmark.id,
      bookmarked_at: bookmark.created_at
    } : null;
  },
  removeBookmark: async (userId, docId) => {
    const index = mockDB.bookmarks.findIndex(bookmark => bookmark.user_id === userId && bookmark.document_id === docId);
    if (index !== -1) {
      mockDB.bookmarks.splice(index, 1);
    }
    return true;
  },
  insertBookmark: async (bookmark) => {
    mockDB.bookmarks.push({...bookmark, created_at: new Date().toISOString()});
    return true;
  },
  
  getAllDocumentChunks: async () => {
    return mockDB.document_chunks.map(chunk => ({
      ...chunk,
      doc_title: mockDB.documents.find(d => d.id === chunk.document_id)?.title || 'Document',
      doc_type: mockDB.documents.find(d => d.id === chunk.document_id)?.file_type || 'notes',
      department_id: mockDB.documents.find(d => d.id === chunk.document_id)?.department_id || '1',
      embedding: Array.isArray(chunk.embedding) ? chunk.embedding : JSON.parse(chunk.embedding || '[]')
    }));
  },
  
  logAnalytics: async (docId, actionType, query = '') => {
    mockDB.analytics.push({
      id: `a_${Date.now()}`,
      document_id: docId || null,
      action_type: actionType,
      query: query,
      timestamp: new Date().toISOString()
    });
  },
  
  getAnalyticsSummary: async () => ({
    totalUsers: mockDB.users.length,
    totalDocuments: mockDB.documents.length,
    totalBookmarks: mockDB.bookmarks.length,
    totalSearches: mockDB.analytics.filter(a => a.action_type === 'search').length,
    deptDistribution: [],
    popularDocs: mockDB.documents.slice(0, 5),
    recentActivity: mockDB.analytics.slice(-10)
  })
};
