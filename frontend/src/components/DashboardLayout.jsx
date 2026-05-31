import React from 'react';
import { BookOpen, Library, ShieldCheck, HelpCircle, SwitchCamera, User, Cpu } from 'lucide-react';

export default function DashboardLayout({ children, activeTab, setActiveTab, userRole, setUserRole }) {
  const navItems = [
    { id: 'hub', label: 'Research Hub', icon: BookOpen, role: 'both' },
    { id: 'bookmarks', label: 'Saved Library', icon: Library, role: 'student' },
    { id: 'admin', label: 'Curator Workspace', icon: ShieldCheck, role: 'admin' },
  ];

  const handleRoleToggle = () => {
    const newRole = userRole === 'student' ? 'admin' : 'student';
    setUserRole(newRole);
    // If transitioning out of admin and admin was active, switch to hub
    if (newRole === 'student' && activeTab === 'admin') {
      setActiveTab('hub');
    }
  };

  return (
    <div className="flex min-h-screen bg-brand-darker">
      {/* SIDEBAR */}
      <aside className="w-64 glass-panel border-r border-brand-border hidden md:flex flex-col z-20 sticky top-0 h-screen">
        {/* LOGO */}
        <div className="p-6 border-b border-brand-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Cpu className="w-5 h-5 text-white animate-glow-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">Campus Memory</h1>
            <span className="text-[10px] text-emerald-400 tracking-widest font-semibold uppercase">Advanced Hub</span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems
            .filter(item => item.role === 'both' || item.role === userRole)
            .map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 text-emerald-400 border-l-4 border-emerald-500 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* ROLE TOGGLE & USER CARD */}
        <div className="p-4 border-t border-brand-border space-y-4">
          {/* Quick switch badge */}
          <button
            onClick={handleRoleToggle}
            className="w-full flex items-center justify-between p-3 rounded-xl glass-panel hover:bg-white/5 border border-brand-border group transition-all"
          >
            <div className="flex items-center gap-2">
              <SwitchCamera className="w-4 h-4 text-emerald-400 group-hover:rotate-180 transition-transform duration-500" />
              <div className="text-left">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Active Portal</p>
                <p className="text-xs text-slate-200 font-bold capitalize">{userRole} view</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">
              Toggle
            </span>
          </button>

          {/* User profile capsule */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-brand-border/40">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center border border-white/5">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-200">
                {userRole === 'admin' ? 'Dr. Elizabeth Finch' : 'Alex Mercer'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {userRole === 'admin' ? 'Chief Research Librarian' : 'CS Dept. • Senior Student'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden glass-panel border-b border-brand-border p-4 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm text-slate-100">Campus Memory</span>
          </div>

          <div className="flex items-center gap-2">
            {navItems
              .filter(item => item.role === 'both' || item.role === userRole)
              .map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            <button
              onClick={handleRoleToggle}
              className="p-2 rounded-lg bg-slate-800 border border-brand-border text-slate-300 text-xs font-semibold capitalize"
            >
              {userRole}
            </button>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}
