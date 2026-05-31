import React, { useState } from 'react';
import { LogIn, UserPlus, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { showToast } from '../utils/toast.js';

export default function AuthPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState('student');
  const [signupDept, setSignupDept] = useState('1');

  React.useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      
      const data = await response.json();
      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setDepartments([]);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validation
    const errors = {};
    if (!loginEmail.trim()) errors.email = 'Email is required';
    if (!loginPassword) errors.password = 'Password is required';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setError('');
    setValidationErrors({});
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => onAuthSuccess(data.user), 1000);
      } else {
        const errorMsg = data.error || 'Invalid email or password';
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.message || 'Connection error. Please check your internet connection.';
      setError(errorMsg);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Validation
    const errors = {};
    if (!signupName.trim()) errors.name = 'Name is required';
    if (!signupEmail.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) errors.email = 'Invalid email address';
    if (signupPassword.length < 6) errors.password = 'Password must be at least 6 characters';
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setError('');
    setSuccess('');
    setValidationErrors({});
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          password: signupPassword,
          role: signupRole,
          department_id: signupDept
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('✅ Signup successful! Please wait for admin approval to access the platform.');
        setTimeout(() => {
          setIsLogin(true);
          setSignupName('');
          setSignupEmail('');
          setSignupPassword('');
          setSuccess('');
        }, 3000);
      } else {
        const errorMsg = data.error || 'Signup failed. Please try again.';
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.message || 'Connection error. Please check your internet connection.';
      setError(errorMsg);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 flex items-center justify-center p-4 text-slate-900">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📚</div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Campus Memory</h1>
          <p className="text-slate-700">Assistant</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Tab Toggle */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                isLogin
                  ? 'bg-blue-100 text-slate-900'
                  : 'bg-gray-100 text-slate-900 hover:bg-gray-200'
              }`}
            >
              <LogIn size={18} className="inline mr-2" />
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                !isLogin
                  ? 'bg-blue-100 text-slate-900'
                  : 'bg-gray-100 text-slate-900 hover:bg-gray-200'
              }`}
            >
              <UserPlus size={18} className="inline mr-2" />
              Signup
            </button>
          </div>

          {/* Login Form */}
          {isLogin && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setValidationErrors({...validationErrors, email: ''});
                  }}
                  placeholder="your@email.com"
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:border-blue-500 ${validationErrors.email ? 'border-red-500' : ''}`}
                  disabled={loading}
                />
                {validationErrors.email && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setValidationErrors({...validationErrors, password: ''});
                  }}
                  placeholder="••••••••"
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:border-blue-500 ${validationErrors.password ? 'border-red-500' : ''}`}
                  disabled={loading}
                />
                {validationErrors.password && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.password}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700">
                  <CheckCircle size={18} />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-100 text-slate-900 p-3 rounded-lg hover:bg-blue-200 disabled:bg-gray-300 font-medium transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Login
                  </>
                )}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {!isLogin && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Full Name</label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => {
                    setSignupName(e.target.value);
                    setValidationErrors({...validationErrors, name: ''});
                  }}
                  placeholder="John Doe"
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:border-blue-500 ${validationErrors.name ? 'border-red-500' : ''}`}
                  disabled={loading}
                />
                {validationErrors.name && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Email</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    setValidationErrors({...validationErrors, email: ''});
                  }}
                  placeholder="your@email.com"
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:border-blue-500 ${validationErrors.email ? 'border-red-500' : ''}`}
                  disabled={loading}
                />
                {validationErrors.email && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Password</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => {
                    setSignupPassword(e.target.value);
                    setValidationErrors({...validationErrors, password: ''});
                  }}
                  placeholder="••••••••"
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:border-blue-500 ${validationErrors.password ? 'border-red-500' : ''}`}
                  disabled={loading}
                />
                {validationErrors.password && (
                  <p className="text-red-600 text-xs mt-1">{validationErrors.password}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Role</label>
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Department</label>
                  <select
                    value={signupDept}
                    onChange={(e) => setSignupDept(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700">
                  <CheckCircle size={18} />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-100 text-slate-900 p-3 rounded-lg hover:bg-blue-200 disabled:bg-gray-300 font-medium transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Create Account
                  </>
                )}
              </button>

              <p className="text-xs text-slate-600 text-center mt-4">
                ⚠️ Your account will be pending approval from an administrator
              </p>
            </form>
          )}

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-slate-700 text-center mb-2">📝 Demo Credentials:</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p><strong>Student:</strong> student@cma.edu / password123</p>
              <p><strong>Teacher:</strong> teacher@cma.edu / password123</p>
              <p><strong>Admin:</strong> admin@cma.edu / admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
