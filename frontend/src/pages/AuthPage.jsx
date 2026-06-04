import React, { useState, useEffect } from 'react';
import { GraduationCap, Mail, Lock, User, Building2, Shield, LogIn, UserPlus, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, BookOpen, Cpu, Sparkles } from 'lucide-react';

// TOP LEVEL — outside AuthPage to prevent remount on every render
function InputField({ label, type = 'text', value, onChange, placeholder, icon: Icon, error: fieldError, id, rightElement }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Icon className="w-4 h-4" /></div>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-slate-900/60 border ${fieldError ? 'border-red-500/60' : 'border-white/10'} rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-900/80 transition-all ${Icon ? 'pl-10' : ''} ${rightElement ? 'pr-10' : ''}`}
        />
        {rightElement && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>}
      </div>
      {fieldError && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{fieldError}
        </p>
      )}
    </div>
  );
}

export default function AuthPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('student');
  const [signupDept, setSignupDept] = useState('');

  useEffect(() => {
    fetch('/api/departments')
      .then(r => r.json())
      .then(data => {
        setDepartments(data || []);
        if (data && data.length > 0) setSignupDept(data[0].id);
      })
      .catch(() => setDepartments([]));
  }, []);

  const validateLogin = () => {
    const errs = {};
    if (!loginEmail.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) errs.email = 'Invalid email address';
    if (!loginPassword) errs.password = 'Password is required';
    return errs;
  };

  const validateSignup = () => {
    const errs = {};
    if (!signupName.trim()) errs.name = 'Full name is required';
    if (!signupEmail.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) errs.email = 'Invalid email address';
    if (signupPassword.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!signupDept) errs.dept = 'Please select a department';
    return errs;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = validateLogin();
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }
    setError(''); setValidationErrors({}); setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await r.json();
      if (r.ok) {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => onAuthSuccess(data.user), 800);
      } else {
        setError(data.error || 'Invalid email or password.');
      }
    } catch {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const errs = validateSignup();
    if (Object.keys(errs).length > 0) { setValidationErrors(errs); return; }
    setError(''); setSuccess(''); setValidationErrors({}); setLoading(true);
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signupName, email: signupEmail, password: signupPassword, role: signupRole, department_id: signupDept })
      });
      const data = await r.json();
      if (r.ok) {
        const approvalMsg = signupRole === 'student'
          ? 'Your account is pending approval from your department teacher.'
          : 'Your account is pending approval from the administrator.';
        setSuccess(`✅ Registration successful! ${approvalMsg}`);
        setTimeout(() => { setIsLogin(true); setSignupName(''); setSignupEmail(''); setSignupPassword(''); setSuccess(''); }, 4000);
      } else {
        setError(data.error || 'Signup failed. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl shadow-slate-950/80 border border-white/[0.06]">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-10 relative overflow-hidden border-r border-white/[0.06]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5" />
          <div className="relative z-10 flex-1 flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-white">Campus Memory</h1>
                <p className="text-[11px] text-emerald-400 font-semibold tracking-widest uppercase">AI Assistant</p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-6 flex-1">
              <div>
                <h2 className="text-3xl font-black text-white leading-tight mb-3">
                  Your Academic<br />
                  <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Intelligence Hub</span>
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Powered by Gemini AI with RAG technology for accurate, document-grounded answers about your courses.
                </p>
              </div>

              {[
                { icon: Cpu, title: 'Gemini AI + RAG', desc: 'Accurate answers from faculty-uploaded documents', color: 'text-emerald-400' },
                { icon: BookOpen, title: 'Smart Document Search', desc: 'Semantic search across all uploaded materials', color: 'text-blue-400' },
                { icon: Shield, title: 'Role-Based Access', desc: 'Students, Teachers & Admins each have tailored dashboards', color: 'text-purple-400' },
                { icon: Sparkles, title: 'Department Approval', desc: 'Department teachers approve students automatically', color: 'text-amber-400' },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/5`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Demo creds */}
            <div className="mt-auto pt-6 border-t border-white/[0.06]">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Demo Credentials</p>
              <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                <p className="flex items-center gap-2"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">STUDENT</span>student@cma.edu / password456</p>
                <p className="flex items-center gap-2"><span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">TEACHER</span>teacher@cma.edu / password123</p>
                <p className="flex items-center gap-2"><span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold">ADMIN</span>admin@cma.edu / admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Forms */}
        <div className="bg-slate-950/90 p-8 md:p-10">
          {/* Tab Toggle */}
          <div className="flex gap-1 p-1 bg-slate-900/60 rounded-2xl border border-white/[0.06] mb-8">
            {[{ id: true, label: 'Sign In', icon: LogIn }, { id: false, label: 'Sign Up', icon: UserPlus }].map(({ id, label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => { setIsLogin(id); setError(''); setSuccess(''); setValidationErrors({}); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${isLogin === id ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Global alerts */}
          {error && (
            <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-emerald-400">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed">{success}</p>
            </div>
          )}

          {/* LOGIN FORM */}
          {isLogin && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-white">Welcome Back</h2>
                <p className="text-slate-400 text-sm mt-1">Sign in to your campus account</p>
              </div>

              <InputField
                id="login-email" label="Email Address" type="email"
                value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setValidationErrors(p => ({ ...p, email: '' })); }}
                placeholder="your@university.edu" icon={Mail} error={validationErrors.email}
              />
              <InputField
                id="login-password" label="Password" type={showPassword ? 'text' : 'password'}
                value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setValidationErrors(p => ({ ...p, password: '' })); }}
                placeholder="••••••••" icon={Lock} error={validationErrors.password}
                rightElement={
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all mt-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</> : <><LogIn className="w-4 h-4" />Sign In</>}
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {!isLogin && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-2xl font-black text-white">Create Account</h2>
                <p className="text-slate-400 text-sm mt-1">Join the Campus Memory platform</p>
              </div>

              <InputField
                id="signup-name" label="Full Name"
                value={signupName} onChange={e => { setSignupName(e.target.value); setValidationErrors(p => ({ ...p, name: '' })); }}
                placeholder="John Doe" icon={User} error={validationErrors.name}
              />
              <InputField
                id="signup-email" label="Email Address" type="email"
                value={signupEmail} onChange={e => { setSignupEmail(e.target.value); setValidationErrors(p => ({ ...p, email: '' })); }}
                placeholder="your@university.edu" icon={Mail} error={validationErrors.email}
              />
              <InputField
                id="signup-password" label="Password" type={showPassword ? 'text' : 'password'}
                value={signupPassword} onChange={e => { setSignupPassword(e.target.value); setValidationErrors(p => ({ ...p, password: '' })); }}
                placeholder="Min 6 characters" icon={Lock} error={validationErrors.password}
                rightElement={
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={signupRole} onChange={e => setSignupRole(e.target.value)}
                      className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Department</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={signupDept} onChange={e => { setSignupDept(e.target.value); setValidationErrors(p => ({ ...p, dept: '' })); }}
                      className={`w-full bg-slate-900/60 border ${validationErrors.dept ? 'border-red-500/60' : 'border-white/10'} rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 transition-all appearance-none`}
                    >
                      {departments.length === 0 && <option value="">Loading...</option>}
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  {validationErrors.dept && <p className="text-red-400 text-xs">{validationErrors.dept}</p>}
                </div>
              </div>

              {/* Approval notice */}
              <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15 text-amber-400 text-xs flex items-start gap-2">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">⏳</span>
                <span>
                  {signupRole === 'student'
                    ? 'Student accounts require approval from your department teacher before you can log in.'
                    : 'Teacher accounts require approval from the administrator before you can log in.'}
                </span>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</> : <><UserPlus className="w-4 h-4" />Create Account</>}
              </button>
            </form>
          )}

          {/* Mobile demo creds */}
          <div className="mt-6 pt-6 border-t border-white/[0.06] lg:hidden">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Demo Credentials</p>
            <div className="space-y-1 text-xs text-slate-500 font-mono">
              <p>student@cma.edu / password456</p>
              <p>teacher@cma.edu / password123</p>
              <p>admin@cma.edu / admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
