import React, { useState, useEffect } from 'react';
import { Search, BookmarkPlus, BookmarkCheck, FileText, Filter, Send, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { showToast } from '../utils/toast.js';

export default function StudentDashboard({ user }) {
  const [documents, setDocuments] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // RAG Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [ragQuery, setRagQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: `Hello ${user.name}! 👋 I'm your Campus AI Assistant. I can help you understand the documents your teachers have uploaded. Just ask me anything about your courses, timetables, assignments, or class schedules!`
    }
  ]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState('');

  // Fetch documents and bookmarks
  useEffect(() => {
    fetchDocuments();
    fetchBookmarks();
    fetchDepartments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setError('');
      const response = await fetch('/api/documents');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDocuments(data || []);
    } catch (err) {
      const errorMsg = err.message || 'Error fetching documents. Please refresh the page.';
      console.error('Error fetching documents:', err);
      setError(errorMsg);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const response = await fetch(`/api/bookmarks?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bookmarks: ${response.statusText}`);
      }
      
      const data = await response.json();
      setBookmarks(data || []);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      // Don't show error for bookmarks as it's not critical
      setBookmarks([]);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch departments: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartments([]);
    }
  };

  // Toggle bookmark
  const toggleBookmark = async (docId) => {
    const isBookmarked = bookmarks.some(b => b.id === docId);
    try {
      if (isBookmarked) {
        const response = await fetch(`/api/bookmarks/${docId}?user_id=${user.id}`, { method: 'DELETE' });
        
        if (!response.ok) {
          throw new Error('Failed to remove bookmark');
        }
        
        setBookmarks(prev => prev.filter(b => b.id !== docId));
        setSuccessMessage('Bookmark removed');
        setTimeout(() => setSuccessMessage(''), 2000);
      } else {
        const response = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, document_id: docId })
        });
        
        if (!response.ok) {
          throw new Error('Failed to add bookmark');
        }
        
        fetchBookmarks();
        setSuccessMessage('Bookmark added!');
        setTimeout(() => setSuccessMessage(''), 2000);
      }
    } catch (err) {
      console.error('Bookmark error:', err);
      const errorMsg = err.message || 'Error updating bookmark. Please try again.';
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    }
  };

  // RAG Query
  const handleRAGQuery = async () => {
    if (!ragQuery.trim()) {
      setRagError('Please enter a question');
      return;
    }
    
    // Add user message to chat
    const userMessage = {
      sender: 'user',
      text: ragQuery
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    setRagLoading(true);
    setRagError('');
    try {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ragQuery,
          department_id: selectedDept === 'all' ? null : selectedDept,
          user_context: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department_id: user.department_id
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from AI assistant');
      }
      
      const data = await response.json();
      const aiResponse = {
        sender: 'ai',
        text: data.answer || 'No answer found for your query'
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setRagQuery('');
    } catch (err) {
      console.error('RAG error:', err);
      const errorMsg = err.message || 'Error fetching AI response. Please try again.';
      setRagError(errorMsg);
      const errorMessage = {
        sender: 'ai',
        text: `❌ ${errorMsg}. Please try again.`
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setRagLoading(false);
    }
  };

  // Filter documents
  let filteredDocs = documents.filter(doc => {
    const matchSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = selectedDept === 'all' || doc.department_id === selectedDept;
    const matchType = selectedType === 'all' || doc.file_type === selectedType;
    return matchSearch && matchDept && matchType;
  });

  const documentTypes = ['notes', 'timetable', 'notice', 'assignment', 'exam', 'research'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">📚 Learning Hub</h1>
          <p className="text-slate-700 mt-2">Welcome back, {user.name}! Explore course materials.</p>
        </div>

        {/* Global Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3 text-red-700">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-300 rounded-lg p-4 flex items-start gap-3 text-green-700">
            <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium">{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Search Bar */}
            <div className="mb-6 bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 border-2 border-blue-300 rounded-lg px-4 py-2">
                <Search size={20} className="text-blue-600" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={18} />
                <span className="font-semibold">Filters</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Department Filter */}
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="p-2 border rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>

                {/* Type Filter */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="p-2 border rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  {documentTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <Loader className="animate-spin mx-auto mb-2" />
                  <p>Loading documents...</p>
                </div>
              ) : filteredDocs.length > 0 ? (
                filteredDocs.map(doc => (
                  <div key={doc.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={20} className="text-blue-600" />
                          <h3 className="text-lg font-semibold text-slate-900">{doc.title}</h3>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {doc.file_type}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm mb-2">{doc.uploader_name} • {new Date(doc.created_at).toLocaleDateString()}</p>
                        <a
                          href={doc.storage_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          📥 Download
                        </a>
                      </div>
                      <button
                        onClick={() => toggleBookmark(doc.id)}
                        className={`p-2 rounded-lg transition ${
                          bookmarks.some(b => b.id === doc.id)
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-gray-100 text-slate-900 hover:bg-gray-200'
                        }`}
                        title={bookmarks.some(b => b.id === doc.id) ? 'Remove bookmark' : 'Add bookmark'}
                      >
                        {bookmarks.some(b => b.id === doc.id) ? (
                          <BookmarkCheck size={20} />
                        ) : (
                          <BookmarkPlus size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-700">No documents found</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - RAG Chat & Bookmarks */}
          <div className="space-y-6">
            {/* RAG Chat */}
            <div className="bg-white rounded-lg shadow p-4 flex flex-col h-96">
              <h2 className="font-bold text-lg mb-4">🤖 AI Assistant</h2>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-lg ${
                      msg.sender === 'user' 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-gray-100 text-slate-900 rounded-bl-none'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {ragLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-slate-900 px-3 py-2 rounded-lg rounded-bl-none">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {ragError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-4 flex items-start gap-2 text-red-700">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs">{ragError}</p>
                </div>
              )}
              
              {/* Input Area */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask about documents..."
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleRAGQuery()}
                  className="flex-1 p-2 border rounded-lg focus:outline-none focus:border-blue-500 text-slate-900 placeholder:text-slate-500 bg-white text-sm"
                  disabled={ragLoading}
                />
                <button
                  onClick={handleRAGQuery}
                  disabled={ragLoading}
                  className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center justify-center"
                >
                  {ragLoading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>

            {/* Bookmarks Summary */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-bold text-lg mb-4">⭐ Saved ({bookmarks.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {bookmarks.length > 0 ? (
                  bookmarks.map(bookmark => (
                    <div key={bookmark.id} className="p-2 bg-gray-50 rounded text-sm text-slate-900">
                      <p className="font-medium text-slate-900">{bookmark.title}</p>
                      <p className="text-xs text-slate-700">{bookmark.file_type}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-700 text-sm">No saved documents yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
