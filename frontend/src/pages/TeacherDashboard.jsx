import React, { useState, useEffect } from 'react';
import {
  Upload, FileText, Trash2, Download, Loader2, AlertCircle, CheckCircle,
  Users, Search, Filter, Check, X, Eye, RefreshCw, BookOpen,
  BarChart3, Clock, Plus, GraduationCap, ChevronRight, Building2
} from 'lucide-react';

const STATUS_BADGE = {
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/20',
  suspended: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

export default function TeacherDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('documents'); // documents | students | pending
  const [documents, setDocuments] = useState([]);
  const [students, setStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Upload form
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState('notes');

  // Search
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const deptId = user.department_id;

  useEffect(() => {
    loadAll();
  }, [deptId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [docs, studs, depts] = await Promise.all([
        fetch(`/api/documents?uploader_id=${user.id}`).then(r => r.json()).catch(() => []),
        fetch(`/api/teacher/students?department_id=${deptId}`).then(r => r.json()).catch(() => []),
        fetch('/api/departments').then(r => r.json()).catch(() => []),
      ]);
      setDocuments(docs || []);
      const allStudents = studs || [];
      setStudents(allStudents.filter(s => s.status !== 'pending'));
      setPendingStudents(allStudents.filter(s => s.status === 'pending'));
      setDepartments(depts || []);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) { showToast('Please select a file and enter a title', 'error'); return; }
    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', title);
    formData.append('file_type', fileType);
    formData.append('uploader_id', user.id);
    formData.append('department_id', deptId);
    setUploading(true);
    try {
      const r = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const data = await r.json();
      if (r.ok) {
        const msg = data.message || 'Document uploaded and indexed successfully!';
        showToast(msg);
        setFile(null); setTitle(''); setFileType('notes');
        loadAll();
      } else {
        showToast(data.error || 'Upload failed. Please check the file format.', 'error');
      }
    } catch {
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    setDeleteLoading(docId);
    try {
      const r = await fetch(`/api/documents/${docId}?uploader_id=${user.id}`, { method: 'DELETE' });
      if (r.ok) { showToast('Document deleted.'); loadAll(); }
      else {
        const data = await r.json().catch(() => ({}));
        showToast(data.error || 'Failed to delete document.', 'error');
      }
    } catch { showToast('Error deleting document.', 'error'); }
    finally { setDeleteLoading(null); }
  };

  const handleStudentAction = async (studentId, status) => {
    setActionLoading(studentId);
    try {
      const r = await fetch(`/api/teacher/students/${studentId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, teacher_department_id: deptId })
      });
      if (r.ok) {
        showToast(`Student ${status} successfully!`);
        loadAll();
      } else {
        const d = await r.json();
        showToast(d.error || 'Action failed', 'error');
      }
    } catch { showToast('Action failed', 'error'); }
    finally { setActionLoading(null); }
  };

  const deptName = departments.find(d => d.id === deptId)?.name || 'Your Department';
  const fileTypes = ['notes', 'timetable', 'notice', 'assignment', 'exam', 'research'];

  const filteredStudents = students.filter(s => {
    const matchSearch = !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'Total Documents', value: documents.length, icon: FileText, color: 'text-blue-400' },
    { label: 'Total Students', value: students.length, icon: Users, color: 'text-emerald-400' },
    { label: 'Pending Approvals', value: pendingStudents.length, icon: Clock, color: 'text-amber-400', badge: pendingStudents.length > 0 },
    { label: 'Department', value: deptName.split(' ')[0], icon: Building2, color: 'text-purple-400' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-fade-in-up ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-white">Teacher Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Welcome, <span className="text-blue-400 font-semibold">{user.name}</span> · {deptName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, badge }) => (
          <div key={label} className="glass-card rounded-2xl p-4 border border-white/5 relative">
            {badge && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full text-[10px] text-white font-black flex items-center justify-center shadow-lg">{value}</span>
            )}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-2xl font-black text-white mt-1">{typeof value === 'number' ? value : value}</p>
              </div>
              <Icon className={`w-6 h-6 ${color} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 p-1 bg-slate-900/60 rounded-2xl border border-white/[0.06] w-fit">
        {[
          { id: 'documents', label: 'Documents', icon: FileText },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'pending', label: `Pending (${pendingStudents.length})`, icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all relative ${activeTab === id ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <div className="glass-card rounded-2xl p-6 border border-white/5 h-fit space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" />Upload Document
            </h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Select File</label>
                <label className="border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-xl p-6 text-center cursor-pointer transition-all block bg-slate-900/30 hover:bg-slate-900/50">
                  <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">{file ? <span className="text-blue-400 font-medium">{file.name}</span> : 'Click to upload PDF, DOCX, TXT'}</p>
                  <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.docx,.txt" className="hidden" />
                </label>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Document Title</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Data Structures Lecture 1"
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Document Type</label>
                <select
                  value={fileType} onChange={e => setFileType(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                >
                  {fileTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <button
                type="submit" disabled={uploading || !file}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading & Indexing...</> : <><Upload className="w-4 h-4" />Upload Document</>}
              </button>
            </form>
          </div>

          {/* Documents List */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />My Documents ({documents.length})
                </h2>
                <button onClick={loadAll} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="p-12 text-center"><Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" /></div>
              ) : documents.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">No documents yet</p>
                  <p className="text-slate-500 text-sm">Upload your first course document</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {documents.map(doc => (
                    <div key={doc.id} className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{doc.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[doc.status] || STATUS_BADGE.approved}`}>{doc.status || 'active'}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">{doc.file_type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <a href={`/api/documents/${doc.id}/download?department_id=${encodeURIComponent(deptId)}`} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-xl text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Download">
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => deleteDocument(doc.id)} disabled={deleteLoading === doc.id}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete">
                          {deleteLoading === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === 'students' && (
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />{deptName} Students ({filteredStudents.length})
            </h2>
            <div className="flex gap-2 flex-1 justify-end flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text" placeholder="Search students..."
                  value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                  className="bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 w-48 transition-all"
                />
              </div>
              <select
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none appearance-none"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" /></div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-slate-900/30">
                    {['Student', 'Email', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredStudents.map(s => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm border border-emerald-500/20">
                            {s.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{s.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{s.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${STATUS_BADGE[s.status] || STATUS_BADGE.approved}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        {s.status === 'approved' && (
                          <button
                            onClick={() => handleStudentAction(s.id, 'rejected')}
                            disabled={actionLoading === s.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                          >
                            {actionLoading === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            Revoke
                          </button>
                        )}
                        {s.status === 'rejected' && (
                          <button
                            onClick={() => handleStudentAction(s.id, 'approved')}
                            disabled={actionLoading === s.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                          >
                            {actionLoading === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Re-Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PENDING APPROVALS TAB */}
      {activeTab === 'pending' && (
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />Pending Student Approvals ({pendingStudents.length})
            </h2>
            <button onClick={loadAll} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {pendingStudents.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
              <p className="text-slate-400 font-medium">All students approved!</p>
              <p className="text-slate-500 text-sm">No pending approval requests</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {pendingStudents.map(s => (
                <div key={s.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-sm flex-shrink-0">
                      {s.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.email}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Registered: {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStudentAction(s.id, 'rejected')}
                      disabled={actionLoading === s.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold transition-all"
                    >
                      {actionLoading === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleStudentAction(s.id, 'approved')}
                      disabled={actionLoading === s.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold transition-all"
                    >
                      {actionLoading === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
