import React, { useState, useEffect } from 'react';
import {
  Users, FileText, BarChart3, Check, X, Loader2, AlertCircle, CheckCircle,
  RefreshCw, Search, Filter, Plus, Edit2, Trash2, Shield, Building2,
  UserCheck, UserX, Lock, Unlock, GraduationCap, ChevronDown, Eye,
  TrendingUp, Activity, Clock, Mail, Phone, Download, Settings, Folder
} from 'lucide-react';
import ProfileSettings from '../components/ProfileSettings.jsx';

const STATUS_BADGE = {
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/20',
  suspended: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

const ROLE_BADGE = {
  admin: 'bg-red-500/15 text-red-400 border-red-500/20',
  teacher: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  student: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

// Add/Edit User Modal
function UserModal({ mode, user: editUser, departments, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: editUser?.name || '',
    email: editUser?.email || '',
    password: '',
    role: editUser?.role || 'student',
    department_id: editUser?.department_id || (departments[0]?.id || ''),
    phone: editUser?.phone || '',
    status: editUser?.status || 'approved',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || (!editUser && !form.password) || !form.role || !form.department_id) {
      setError('Name, email, role, and department are required.'); return;
    }
    setLoading(true); setError('');
    try {
      const url = mode === 'add' ? '/api/admin/users' : `/api/admin/users/${editUser.id}`;
      const method = mode === 'add' ? 'POST' : 'PUT';
      const body = { ...form };
      if (mode === 'edit' && !form.password) delete body.password;
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json();
      if (r.ok) { onSuccess(data.user); onClose(); }
      else setError(data.error || 'Operation failed.');
    } catch { setError('Connection error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{mode === 'add' ? 'Add New User' : 'Edit User'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'email@example.com' },
            { label: mode === 'add' ? 'Password' : 'New Password (leave blank to keep)', key: 'password', type: 'password', placeholder: '••••••••' },
            { label: 'Phone (optional)', key: 'phone', type: 'tel', placeholder: '+1234567890' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none appearance-none">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Department</label>
              <select value={form.department_id} onChange={e => setForm(p => ({ ...p, department_id: e.target.value }))}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none appearance-none">
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          {mode === 'edit' && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none appearance-none">
                {['approved', 'pending', 'rejected', 'suspended'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all border border-white/10">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />{mode === 'add' ? 'Create User' : 'Save Changes'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirm Modal
function DeleteConfirm({ user: targetUser, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-fade-in-up">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">Delete User Account</h2>
          <p className="text-slate-400 text-sm mt-1">Are you sure you want to permanently delete <span className="text-white font-semibold">{targetUser.name}</span>? This action cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold border border-white/10">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold border border-red-500/20 flex items-center justify-center gap-2 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [allUsers, setAllUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [users, pending, docs, anl, stats, depts] = await Promise.all([
        fetch('/api/admin/users').then(r => r.json()).catch(() => []),
        fetch('/api/admin/pending-users').then(r => r.json()).catch(() => []),
        fetch('/api/admin/documents').then(r => r.json()).catch(() => []),
        fetch('/api/admin/analytics').then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/user-stats').then(r => r.json()).catch(() => ({})),
        fetch('/api/departments').then(r => r.json()).catch(() => []),
      ]);
      setAllUsers(users || []);
      setPendingUsers(pending || []);
      setDocuments(Array.isArray(docs) ? docs : []);
      setAnalytics(anl || {});
      setUserStats(stats || {});
      setDepartments(depts || []);
    } finally { setLoading(false); }
  };

  const getDeptName = (id) => departments.find(d => d.id === id)?.name || 'N/A';

  const handleApprove = async (userId, status) => {
    setActionLoading(userId);
    try {
      const r = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (r.ok) { showToast(`User ${status} successfully!`); loadAll(); }
      else showToast('Action failed', 'error');
    } catch { showToast('Error', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleSuspend = async (userId, action) => {
    setActionLoading(userId);
    try {
      const r = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (r.ok) { showToast(`User ${action === 'suspend' ? 'suspended' : 'reactivated'}!`); loadAll(); }
      else showToast('Action failed', 'error');
    } catch { showToast('Error', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      const r = await fetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' });
      if (r.ok) { showToast('User deleted permanently.'); setDeleteUser(null); loadAll(); }
      else showToast('Delete failed', 'error');
    } catch { showToast('Error deleting user', 'error'); }
    finally { setDeleteLoading(false); }
  };

  const filteredUsers = allUsers.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchDept = deptFilter === 'all' || u.department_id === deptFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchDept && matchStatus;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: `All Users (${allUsers.length})`, icon: Users },
    { id: 'documents', label: `Documents (${documents.length})`, icon: FileText },
    { id: 'pending', label: `Approvals (${pendingUsers.length})`, icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  const overviewStats = [
    { label: 'Total Students', value: userStats?.totalStudents || 0, icon: GraduationCap, color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/15', ic: 'text-emerald-400' },
    { label: 'Total Teachers', value: userStats?.totalTeachers || 0, icon: Shield, color: 'from-blue-500/20 to-blue-600/10 border-blue-500/15', ic: 'text-blue-400' },
    { label: 'Pending Approvals', value: userStats?.pendingApprovals || 0, icon: Clock, color: 'from-amber-500/20 to-amber-600/10 border-amber-500/15', ic: 'text-amber-400' },
    { label: 'Active Users', value: userStats?.activeUsers || 0, icon: Activity, color: 'from-purple-500/20 to-purple-600/10 border-purple-500/15', ic: 'text-purple-400' },
    { label: 'Total Documents', value: analytics?.totalDocuments || 0, icon: FileText, color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/15', ic: 'text-cyan-400' },
    { label: 'Total Searches', value: analytics?.totalSearches || 0, icon: BarChart3, color: 'from-pink-500/20 to-pink-600/10 border-pink-500/15', ic: 'text-pink-400' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Modals */}
      {showAddModal && <UserModal mode="add" departments={departments} onClose={() => setShowAddModal(false)} onSuccess={() => { showToast('User created!'); loadAll(); }} />}
      {editUser && <UserModal mode="edit" user={editUser} departments={departments} onClose={() => setEditUser(null)} onSuccess={() => { showToast('User updated!'); loadAll(); }} />}
      {deleteUser && <DeleteConfirm user={deleteUser} onClose={() => setDeleteUser(null)} onConfirm={handleDelete} loading={deleteLoading} />}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-[60] px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 animate-fade-in-up ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome, <span className="text-red-400 font-semibold">{user.name}</span> · Full System Access</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all">
          <Plus className="w-4 h-4" />Add User
        </button>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 p-1 bg-slate-900/60 rounded-2xl border border-white/[0.06] w-fit overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === id ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {overviewStats.map(({ label, value, icon: Icon, color, ic }) => (
              <div key={label} className={`glass-card rounded-2xl p-5 border bg-gradient-to-br ${color}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">{label}</p>
                    <p className="text-3xl font-black text-white mt-1">{value}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-900/50 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${ic}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Department breakdown */}
          {userStats?.byDepartment && userStats.byDepartment.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-400" />Department Breakdown</h3>
              <div className="space-y-3">
                {userStats.byDepartment.map(d => (
                  <div key={d.dept}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">{d.dept}</span>
                      <span className="text-slate-400">{d.students} students · {d.teachers} teachers</span>
                    </div>
                    <div className="w-full bg-slate-900/60 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, ((d.students + d.teachers) / Math.max(1, userStats.totalStudents + userStats.totalTeachers)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Add New User', desc: 'Create student or teacher account', onClick: () => setShowAddModal(true), icon: Plus, color: 'text-emerald-400' },
              { label: 'Manage Users', desc: 'View, edit and manage all accounts', onClick: () => setActiveTab('users'), icon: Users, color: 'text-blue-400' },
              { label: 'Pending Approvals', desc: `${pendingUsers.length} awaiting review`, onClick: () => setActiveTab('pending'), icon: Clock, color: 'text-amber-400' },
            ].map(a => (
              <button key={a.label} onClick={a.onClick}
                className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 text-left transition-all group">
                <a.icon className={`w-6 h-6 ${a.color} mb-3`} />
                <p className="font-bold text-white text-sm">{a.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{a.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ALL USERS TAB */}
      {activeTab === 'users' && (
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-white/[0.06] flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Role', key: 'role', value: roleFilter, onChange: setRoleFilter, options: [['all','All Roles'],['student','Students'],['teacher','Teachers'],['admin','Admins']] },
                { label: 'Status', key: 'status', value: statusFilter, onChange: setStatusFilter, options: [['all','All Status'],['approved','Approved'],['pending','Pending'],['rejected','Rejected'],['suspended','Suspended']] },
              ].map(f => (
                <select key={f.key} value={f.value} onChange={e => f.onChange(e.target.value)}
                  className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none appearance-none">
                  {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ))}
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none appearance-none">
                <option value="all">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button onClick={loadAll} className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center"><Loader2 className="w-8 h-8 text-red-400 animate-spin mx-auto" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-slate-900/30">
                    {['User', 'Role', 'Department', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${ROLE_BADGE[u.role] || 'bg-slate-700 text-slate-300'}`}>
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${ROLE_BADGE[u.role] || ''}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">{getDeptName(u.department_id)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${STATUS_BADGE[u.status] || ''}`}>{u.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                          {u.status === 'pending' && (
                            <button onClick={() => handleApprove(u.id, 'approved')} disabled={actionLoading === u.id}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Approve">
                              {actionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {u.status === 'approved' && u.role !== 'admin' && (
                            <button onClick={() => handleSuspend(u.id, 'suspend')} disabled={actionLoading === u.id}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all" title="Suspend">
                              {actionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {u.status === 'suspended' && (
                            <button onClick={() => handleSuspend(u.id, 'reactivate')} disabled={actionLoading === u.id}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Reactivate">
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <button onClick={() => setDeleteUser(u)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-400" />All Documents ({documents.length})</h2>
            <button onClick={loadAll} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          </div>
          {loading ? (
            <div className="p-16 text-center"><Loader2 className="w-8 h-8 text-red-400 animate-spin mx-auto" /></div>
          ) : documents.length === 0 ? (
            <div className="p-16 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No documents uploaded</p>
              <p className="text-slate-500 text-sm">Teacher uploads will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {documents.map(doc => (
                <div key={doc.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{doc.title || 'Untitled document'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {doc.uploader_name || 'Faculty'} Â· {getDeptName(doc.department_id)} Â· {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 capitalize">{doc.file_type || 'document'}</span>
                    {doc.storage_path && (
                      <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-all">
                        <Download className="w-3.5 h-3.5" />View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* APPROVALS TAB */}
      {activeTab === 'pending' && (
        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-amber-400" />Pending Approvals ({pendingUsers.length})</h2>
            <button onClick={loadAll} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          </div>
          {pendingUsers.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-50" />
              <p className="text-slate-400 font-medium">No pending approvals</p>
              <p className="text-slate-500 text-sm">All registration requests have been processed</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {pendingUsers.map(u => (
                <div key={u.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${ROLE_BADGE[u.role] || 'bg-slate-800 text-slate-300'} border`}>
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm">{u.name}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${ROLE_BADGE[u.role] || ''}`}>{u.role}</span>
                      </div>
                      <p className="text-xs text-slate-400">{u.email}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {getDeptName(u.department_id)} · {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleApprove(u.id, 'rejected')} disabled={actionLoading === u.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold transition-all">
                      {actionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}Reject
                    </button>
                    <button onClick={() => handleApprove(u.id, 'approved')} disabled={actionLoading === u.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold transition-all">
                      {actionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-5 border border-white/5">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-400" />System Statistics</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Users', value: (userStats?.totalStudents || 0) + (userStats?.totalTeachers || 0), color: 'bg-blue-500' },
                { label: 'Total Documents', value: analytics?.totalDocuments || 0, color: 'bg-emerald-500' },
                { label: 'Total Bookmarks', value: analytics?.totalBookmarks || 0, color: 'bg-amber-500' },
                { label: 'AI Searches', value: analytics?.totalSearches || 0, color: 'bg-purple-500' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{s.label}</span><span className="text-slate-400 font-bold">{s.value}</span></div>
                  <div className="w-full bg-slate-900/60 rounded-full h-2"><div className={`${s.color} h-full rounded-full transition-all`} style={{ width: `${Math.min(100, (s.value / Math.max(1, analytics?.totalDocuments || 10)) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          {analytics?.deptDistribution?.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-400" />Documents by Department</h3>
              <div className="space-y-3">
                {analytics.deptDistribution.map(d => (
                  <div key={d.dept}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{d.dept}</span><span className="text-slate-400 font-bold">{d.count} docs</span></div>
                    <div className="w-full bg-slate-900/60 rounded-full h-2"><div className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (d.count / Math.max(1, analytics.totalDocuments || 1)) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics?.popularDocs?.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-white/5 md:col-span-2">
              <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-pink-400" />Most Viewed Documents</h3>
              <div className="space-y-2">
                {analytics.popularDocs.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5">
                    <span className="text-sm text-slate-300 truncate">{doc.title}</span>
                    <span className="text-xs text-pink-400 font-bold ml-2 flex-shrink-0">{doc.views} views</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
