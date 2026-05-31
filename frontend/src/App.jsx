import React, { useState, useEffect } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-gray-600">Loading Campus Memory Assistant...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show auth page
  if (!user) {
    return <AuthPage onAuthSuccess={setUser} />;
  }

  // Authenticated - show appropriate dashboard
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top Bar */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📚</div>
            <div>
              <h1 className="font-bold text-gray-900">Campus Memory Assistant</h1>
              <p className="text-xs text-gray-500">Connected to Supabase + Firebase</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {user.status !== 'approved' && (
        <div className="max-w-7xl mx-auto px-6 py-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-6 text-yellow-800">
          ⏳ Your account is pending admin approval. You'll have full access once approved.
        </div>
      )}

      {/* Dashboard Routing */}
      {user.role === 'student' && <StudentDashboard user={user} />}
      {user.role === 'teacher' && <TeacherDashboard user={user} />}
      {user.role === 'admin' && <AdminDashboard user={user} />}
    </div>
  );
}
