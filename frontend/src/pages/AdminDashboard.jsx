import React, { useState, useEffect } from 'react';
import { Check, X, BarChart3, Users, FileText, AlertCircle, Loader, RefreshCw, CheckCircle } from 'lucide-react';
import { showToast } from '../utils/toast.js';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals', 'analytics'
  const [pendingUsers, setPendingUsers] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPendingUsers();
    fetchAnalytics();
    fetchDepartments();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setError('');
      const response = await fetch('/api/admin/pending-users');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pending users: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPendingUsers(data || []);
    } catch (err) {
      const errorMsg = err.message || 'Error fetching pending users. Please try again.';
      console.error('Error fetching pending users:', err);
      setError(errorMsg);
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAnalyticsData(data || {});
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setAnalyticsData({});
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

  const handleApprove = async (userId, userName) => {
    if (!window.confirm(`Approve user ${userName}?`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });

      if (!response.ok) {
        throw new Error('Failed to approve user');
      }

      setSuccessMessage(`${userName} has been approved!`);
      setTimeout(() => setSuccessMessage(''), 2000);
      fetchPendingUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      const errorMsg = err.message || 'Error approving user. Please try again.';
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId, userName) => {
    if (!window.confirm(`Reject user ${userName}? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });

      if (!response.ok) {
        throw new Error('Failed to reject user');
      }

      setSuccessMessage(`${userName} has been rejected.`);
      setTimeout(() => setSuccessMessage(''), 2000);
      fetchPendingUsers();
    } catch (err) {
      console.error('Error rejecting user:', err);
      const errorMsg = err.message || 'Error rejecting user. Please try again.';
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPendingUsers();
      setSuccessMessage('Data refreshed');
      setTimeout(() => setSuccessMessage(''), 1500);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const getDepartmentName = (deptId) => {
    return departments.find(d => d.id === deptId)?.name || 'Unknown';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">⚙️ Admin Control Panel</h1>
          <p className="text-gray-600 mt-2">Manage users, approvals, and system analytics</p>
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

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'approvals'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            <Users size={18} className="inline mr-2" />
            User Approvals ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={18} className="inline mr-2" />
            Analytics
          </button>
        </div>

        {/* APPROVALS TAB */}
        {activeTab === 'approvals' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users size={24} />
                Pending User Approvals
              </h2>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="hover:bg-blue-700 p-2 rounded-lg transition disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <Loader className="animate-spin mx-auto mb-2" />
                <p>Loading pending users...</p>
              </div>
            ) : pendingUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pendingUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 text-gray-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {getDepartmentName(user.department_id)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-3">
                          <button
                            onClick={() => handleApprove(user.id, user.name)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center gap-1 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === user.id ? (
                              <Loader size={16} className="animate-spin" />
                            ) : (
                              <Check size={16} />
                            )}
                            {actionLoading === user.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(user.id, user.name)}
                            disabled={actionLoading === user.id}
                            className="inline-flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === user.id ? (
                              <Loader size={16} className="animate-spin" />
                            ) : (
                              <X size={16} />
                            )}
                            {actionLoading === user.id ? 'Processing...' : 'Reject'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No pending approvals</p>
                <p className="text-sm text-gray-400 mt-2">All users have been processed!</p>
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Stats Cards */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analyticsData?.totalUsers || 0}
                  </p>
                </div>
                <Users size={40} className="text-blue-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Documents</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analyticsData?.totalDocuments || 0}
                  </p>
                </div>
                <FileText size={40} className="text-green-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Bookmarks</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analyticsData?.totalBookmarks || 0}
                  </p>
                </div>
                <AlertCircle size={40} className="text-yellow-600 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Searches</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analyticsData?.totalSearches || 0}
                  </p>
                </div>
                <BarChart3 size={40} className="text-purple-600 opacity-20" />
              </div>
            </div>

            {/* Department Distribution */}
            {analyticsData?.deptDistribution && analyticsData.deptDistribution.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                <h3 className="font-bold text-lg mb-4">📊 Department Usage</h3>
                <div className="space-y-3">
                  {analyticsData.deptDistribution.map((dept, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{dept.dept}</span>
                        <span className="text-gray-600">{dept.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min((dept.count / (analyticsData.totalDocuments || 1)) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Documents */}
            {analyticsData?.popularDocs && analyticsData.popularDocs.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                <h3 className="font-bold text-lg mb-4">🔥 Popular Documents</h3>
                <div className="space-y-2">
                  {analyticsData.popularDocs.map((doc, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="text-gray-700 truncate">{doc.title}</span>
                      <span className="font-semibold text-gray-900 ml-2">{doc.views}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
