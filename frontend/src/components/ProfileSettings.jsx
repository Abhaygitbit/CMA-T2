import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building2, Calendar, Lock, Upload, 
  Save, X, Loader2, CheckCircle, AlertCircle 
} from 'lucide-react';

export default function ProfileSettings({ user, departments, onUpdate }) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    department_id: user.department_id || '',
    semester: user.semester || '',
    password: '',
    confirmPassword: ''
  });
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isStudent = user.role === 'student';
  const canEditDepartment = user.role === 'admin';

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Avatar image must be less than 2MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatar(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!form.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (form.password && form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (form.password && form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updates = {
        user_id: user.id,
        name: form.name.trim(),
        email: form.email.trim(),
        department_id: form.department_id,
      };

      // Add phone if provided
      if (form.phone.trim()) updates.phone = form.phone.trim();

      // Add password if provided and confirmed
      if (form.password && form.password === form.confirmPassword) {
        updates.password = form.password;
      }

      // Add semester for students
      if (isStudent && form.semester) {
        updates.semester = form.semester;
      }

      // Handle avatar upload if new file selected
      if (avatarFile) {
        // In a real implementation, upload to server/CDN first
        // For now, store as data URL
        updates.avatar = avatar;
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        if (onUpdate && data.user) {
          onUpdate(data.user);
        }
        // Clear password fields
        setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
        setAvatarFile(null);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      department_id: user.department_id || '',
      semester: user.semester || '',
      password: '',
      confirmPassword: ''
    });
    setAvatar(user.avatar || '');
    setAvatarFile(null);
    setError('');
    setSuccess('');
  };

  return (
    <div className="glass-card rounded-2xl border border-white/5 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-blue-400" />
          Profile Settings
        </h2>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-2xl border-2 border-white/10 bg-slate-800/60 overflow-hidden">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  <User className="w-10 h-10 text-white/50" />
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-2 bg-slate-900 rounded-full border border-white/10 cursor-pointer hover:bg-slate-800 transition-all">
              <Upload className="w-4 h-4 text-slate-400" />
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>
          <p className="text-xs text-slate-500">Click avatar to upload new image (Max 2MB)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Information */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
              <User className="w-3 h-3" />
              Full Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
              <Mail className="w-3 h-3" />
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
              <Phone className="w-3 h-3" />
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
              placeholder="+1234567890"
            />
          </div>

          {canEditDepartment && departments.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                <Building2 className="w-3 h-3" />
                Department
              </label>
              <select
                value={form.department_id}
                onChange={e => setForm(prev => ({ ...prev, department_id: e.target.value }))}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          )}

          {isStudent && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Semester
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={form.semester}
                onChange={e => setForm(prev => ({ ...prev, semester: e.target.value }))}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
                placeholder="Enter semester (1-12)"
              />
            </div>
          )}

          {/* Password Fields */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
              <Lock className="w-3 h-3" />
              New Password (Optional)
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
              placeholder="Leave blank to keep current"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Confirm New Password
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all"
              placeholder="Confirm new password"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all border border-white/10"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 text-white text-sm font-bold transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500 pt-2">
          <p>Note: All changes will be saved immediately. Password changes require re-login.</p>
        </div>
      </form>
    </div>
  );
}