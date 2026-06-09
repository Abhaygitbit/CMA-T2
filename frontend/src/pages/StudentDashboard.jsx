import React, { useState, useEffect, useRef } from 'react';
import {
  Search, BookmarkPlus, BookmarkCheck, FileText, Filter, Send, Loader2,
  AlertCircle, Download, GraduationCap, BookOpen, Clock, Star, Cpu,
  User, TrendingUp, Calendar, ChevronRight, X, MessageSquare, Sparkles,
  RefreshCw
} from 'lucide-react';

const FILE_TYPE_COLORS = {
  notes: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  timetable: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  notice: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  assignment: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  exam: 'text-red-400 bg-red-500/10 border-red-500/20',
  research: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

const FILE_TYPE_ICONS = {
  notes: '📝', timetable: '📅', notice: '📢',
  assignment: '📋', exam: '📊', research: '🔬'
};

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-3 animate-pulse">
      <div className="h-3 w-20 bg-white/5 rounded shimmer" />
      <div className="h-4 w-3/4 bg-white/5 rounded shimmer" />
      <div className="h-3 w-1/2 bg-white/5 rounded shimmer" />
    </div>
  );
}

export default function StudentDashboard({ user }) {
  const [documents, setDocuments] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [activeTab, setActiveTab] = useState('documents'); // documents | bookmarks | chat

  // Chat
  const [messages, setMessages] = useState([
    { sender: 'ai', text: `Hello ${user.name}! 👋 I'm your Campus AI Assistant. Ask me anything about your uploaded course documents — timetables, assignments, exam schedules, and more!`, ts: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    Promise.all([
      fetch(`/api/documents?dept=${encodeURIComponent(user.department_id)}`).then(r => r.json()).catch(() => []),
      fetch(`/api/bookmarks?user_id=${user.id}&department_id=${encodeURIComponent(user.department_id)}`).then(r => r.json()).catch(() => []),
      fetch('/api/departments').then(r => r.json()).catch(() => [])
    ]).then(([docs, bmarks, depts]) => {
      setDocuments(docs || []);
      setBookmarks(bmarks || []);
      setDepartments(depts || []);
    }).finally(() => setLoading(false));
  }, [user.id, user.department_id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, chatLoading]);

  const filteredDocs = documents.filter(doc => {
    const matchSearch = !searchQuery || doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = selectedType === 'all' || doc.file_type === selectedType;
    return matchSearch && matchType;
  });

  const toggleBookmark = async (docId) => {
    const isBookmarked = bookmarks.some(b => b.id === docId);
    try {
      if (isBookmarked) {
        await fetch(`/api/bookmarks/${docId}?user_id=${user.id}`, { method: 'DELETE' });
        setBookmarks(prev => prev.filter(b => b.id !== docId));
        showToast('Bookmark removed');
      } else {
        const r = await fetch('/api/bookmarks', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, document_id: docId })
        });
        if (r.ok) {
          const bmark = documents.find(d => d.id === docId);
          if (bmark) setBookmarks(prev => [...prev, bmark]);
          showToast('Bookmarked!');
        }
      }
    } catch { showToast('Error updating bookmark', 'error'); }
  };

  const sendChatMessage = async () => {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatInput('');
    setMessages(prev => [...prev, { sender: 'user', text: q, ts: new Date() }]);
    setChatLoading(true);
    try {
      const r = await fetch('/api/rag/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          department_id: user.department_id,
          user_context: { id: user.id, name: user.name, email: user.email, role: user.role, department_id: user.department_id }
        })
      });
      const data = await r.json();
      // data.answer is present on both success AND friendly error responses
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: data.answer || data.error || 'Sorry, I could not generate a response. Please check the backend logs.',
        source: data.sourceDocument,
        ts: new Date()
      }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'ai', text: '❌ Connection error. Please ensure the backend server is running on port 5000.', ts: new Date() }]);
    } finally {
      setChatLoading(false);
    }
  };

  const deptName = departments.find(d => d.id === user.department_id)?.name || 'N/A';
  const docTypes = ['all', 'notes', 'timetable', 'notice', 'assignment', 'exam', 'research'];

  const statCards = [
    { label: 'Documents', value: documents.length, icon: FileText, color: 'from-blue-500/20 to-blue-600/10', iconColor: 'text-blue-400' },
    { label: 'Bookmarked', value: bookmarks.length, icon: Star, color: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-400' },
    { label: 'Department', value: deptName.split(' ')[0], icon: GraduationCap, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-400' },
    { label: 'AI Chats', value: messages.filter(m => m.sender === 'user').length, icon: MessageSquare, color: 'from-purple-500/20 to-purple-600/10', iconColor: 'text-purple-400' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-fade-in-up ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Star className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Learning Hub</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back, <span className="text-emerald-400 font-semibold">{user.name}</span> · {deptName}</p>
        </div>
        <div className="flex items-center gap-2">
          {user.avatar && <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, iconColor }) => (
          <div key={label} className={`glass-card rounded-2xl p-4 border border-white/5 bg-gradient-to-br ${color} relative overflow-hidden`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
                <p className="text-2xl font-black text-white mt-1 leading-none">{value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl bg-slate-900/50 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-900/60 rounded-2xl border border-white/[0.06] w-fit">
        {[
          { id: 'documents', label: 'Documents', icon: FileText },
          { id: 'bookmarks', label: 'Saved', icon: Star },
          { id: 'chat', label: 'AI Chat', icon: Cpu },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === id ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="space-y-5">
          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text" placeholder="Search documents..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {docTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedType === type ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'}`}
                >
                  {type === 'all' ? 'All' : `${FILE_TYPE_ICONS[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Document Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="glass-card rounded-2xl p-16 text-center border border-white/5">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No documents found</p>
              <p className="text-slate-500 text-sm mt-1">
                {searchQuery ? 'Try a different search term' : 'Your teachers have not uploaded any documents yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map(doc => {
                const isBookmarked = bookmarks.some(b => b.id === doc.id);
                const typeClass = FILE_TYPE_COLORS[doc.file_type] || FILE_TYPE_COLORS.notes;
                return (
                  <div key={doc.id} className="glass-card glass-card-hover rounded-2xl p-5 border border-white/5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${typeClass}`}>
                        {FILE_TYPE_ICONS[doc.file_type]} {doc.file_type}
                      </span>
                      <button
                        onClick={() => toggleBookmark(doc.id)}
                        className={`p-2 rounded-xl transition-all ${isBookmarked ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                      >
                        {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                      </button>
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">{doc.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.uploader_name || 'Faculty'}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
                      <a
                        href={`/api/documents/${doc.id}/download?department_id=${encodeURIComponent(user.department_id)}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />View / Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BOOKMARKS TAB */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-4">
          {bookmarks.length === 0 ? (
            <div className="glass-card rounded-2xl p-16 text-center border border-white/5">
              <Star className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No bookmarks yet</p>
              <p className="text-slate-500 text-sm mt-1">Bookmark documents from the Documents tab for quick access</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map(doc => {
                const typeClass = FILE_TYPE_COLORS[doc.file_type] || FILE_TYPE_COLORS.notes;
                return (
                  <div key={doc.id} className="glass-card glass-card-hover rounded-2xl p-5 border border-white/5 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${typeClass}`}>
                        {FILE_TYPE_ICONS[doc.file_type]} {doc.file_type}
                      </span>
                      <button
                        onClick={() => toggleBookmark(doc.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                        title="Remove bookmark"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="font-bold text-white text-sm leading-snug">{doc.title}</h3>
                    <a href={`/api/documents/${doc.id}/download?department_id=${encodeURIComponent(user.department_id)}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-all">
                      <Download className="w-3.5 h-3.5" />Open Document
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AI CHAT TAB */}
      {activeTab === 'chat' && (
        <div className="glass-card rounded-2xl border border-white/5 flex flex-col h-[600px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Cpu className="w-5 h-5 text-white animate-glow-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Campus AI Assistant</h3>
                <p className="text-[11px] text-emerald-400 font-medium">RAG-powered · Grounded in uploaded documents</p>
              </div>
            </div>
            <button
              onClick={() => setMessages([{ sender: 'ai', text: `Hello ${user.name}! 👋 How can I help you today?`, ts: new Date() }])}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
              title="Clear chat"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Quick prompts */}
          <div className="px-4 pt-3 flex gap-2 flex-wrap">
            {['What is in the timetable?', 'Show upcoming exams', 'What assignments are pending?', 'Explain CNN'].map(prompt => (
              <button
                key={prompt}
                disabled={chatLoading}
                onClick={async () => {
                  setChatInput('');
                  setMessages(prev => [...prev, { sender: 'user', text: prompt, ts: new Date() }]);
                  setChatLoading(true);
                  try {
                    const r = await fetch('/api/rag/search', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        query: prompt,
                        department_id: user.department_id,
                        user_context: { id: user.id, name: user.name, role: user.role, department_id: user.department_id }
                      })
                    });
                    const data = await r.json();
                    setMessages(prev => [...prev, {
                      sender: 'ai',
                      text: data.answer || data.error || 'Sorry, I could not generate a response.',
                      source: data.sourceDocument,
                      ts: new Date()
                    }]);
                  } catch {
                    setMessages(prev => [...prev, { sender: 'ai', text: 'Connection error. Please try again.', ts: new Date() }]);
                  } finally {
                    setChatLoading(false);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] text-slate-400 hover:text-slate-200 border border-white/10 transition-all disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center border ${msg.sender === 'ai' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                  {msg.sender === 'ai' ? <Cpu className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`max-w-[80%] space-y-1`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.sender === 'ai' ? 'bg-slate-800/60 border border-white/5 text-slate-200' : 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-100'}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  {msg.source && msg.source !== 'Unknown' && (
                    <p className="text-[10px] text-slate-500 px-1">📎 From: {msg.source}</p>
                  )}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-800/60 border border-white/5 rounded-2xl px-4 py-3 flex gap-1 items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex gap-2">
              <input
                type="text" value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                placeholder="Ask about your timetable, exams, assignments..."
                className="flex-1 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                disabled={chatLoading}
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
