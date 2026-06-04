import React, { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import { GraduationCap, LogOut, ChevronDown, Bell, Settings } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleAuthSuccess = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-pulse">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading Campus Memory Assistant...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  const roleColor = {
    admin: 'from-red-500 to-orange-500',
    teacher: 'from-blue-500 to-indigo-500',
    student: 'from-emerald-500 to-teal-500',
  }[user.role] || 'from-slate-500 to-slate-600';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/[0.06] shadow-xl shadow-slate-950/50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${roleColor} flex items-center justify-center shadow-lg`}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-extrabold text-white tracking-tight leading-none">Campus Memory</h1>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Assistant • AI Powered</p>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Role Badge */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-gradient-to-r ${roleColor} text-white shadow-lg capitalize`}>
              {user.role}
            </span>

            {/* Notification bell (cosmetic) */}
            <button className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
              <Bell className="w-4 h-4" />
            </button>

            {/* User info + logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-tr ${roleColor} flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{user.name?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-bold text-white leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-bold border border-red-500/20 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Pending approval banner */}
      {user.status === 'pending' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
          <p className="text-center text-amber-400 text-xs font-medium">
            ⏳ Your account is pending approval. You will have full access once approved by your department teacher or admin.
          </p>
        </div>
      )}
      {user.status === 'suspended' && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5">
          <p className="text-center text-red-400 text-xs font-medium">
            🚫 Your account has been suspended. Please contact the administrator for assistance.
          </p>
        </div>
      )}

      {/* Main Dashboard */}
      <main className="max-w-[1600px] mx-auto">
        {user.role === 'student' && <StudentDashboard user={user} />}
        {user.role === 'teacher' && <TeacherDashboard user={user} />}
        {user.role === 'admin' && <AdminDashboard user={user} />}
      </main>
    </div>
  );
}
