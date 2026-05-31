import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Eye, Download, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { showToast } from '../utils/toast.js';

export default function TeacherDashboard({ user }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Upload form
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [fileType, setFileType] = useState('notes');
  const [departmentId, setDepartmentId] = useState('1');

  useEffect(() => {
    fetchDocuments();
    fetchDepartments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setError('');
      const response = await fetch(`/api/documents?uploader_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDocuments(data || []);
    } catch (err) {
      const errorMsg = err.message || 'Error fetching documents. Please refresh the page.';
      console.error('Error fetching documents:', err);
      setError(errorMsg);
      setDocuments([]);
    } finally {
      setLoading(false);
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

  const handleUpload = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!file) {
      setUploadError('Please select a file');
      return;
    }
    
    if (!title.trim()) {
      setUploadError('Please enter a title');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('title', title);
    formData.append('file_type', fileType);
    formData.append('uploader_id', user.id);
    formData.append('department_id', departmentId);

    setUploading(true);
    setUploadStatus('uploading');
    setUploadError('');

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Upload failed: ${response.statusText}`);
      }

      setUploadStatus('success');
      setSuccessMessage('Document uploaded successfully!');
      setFile(null);
      setTitle('');
      
      setTimeout(() => {
        setUploadStatus('');
        setSuccessMessage('');
        fetchDocuments();
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg = err.message || 'Upload failed. Please try again.';
      setUploadStatus('error');
      setUploadError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(docId);
    try {
      const response = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
      
      setSuccessMessage('Document deleted successfully');
      setTimeout(() => setSuccessMessage(''), 2000);
      fetchDocuments();
    } catch (err) {
      console.error('Delete error:', err);
      const errorMsg = err.message || 'Error deleting document. Please try again.';
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    } finally {
      setDeleteLoading(null);
    }
  };

  const fileTypes = ['notes', 'timetable', 'notice', 'assignment', 'exam', 'research'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-slate-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">📤 Content Management</h1>
          <p className="text-slate-700 mt-2">Upload and manage your course materials</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-1 h-fit">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Upload size={24} className="text-blue-600" />
              New Upload
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Select File</label>
                <label className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center cursor-pointer hover:bg-blue-50 transition block">
                  <FileText size={32} className="mx-auto text-blue-600 mb-2" />
                  <p className="text-sm text-slate-700">
                    {file ? file.name : 'Click to upload PDF, DOCX, TXT'}
                  </p>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                  />
                </label>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Data Structures Lecture 1"
                  className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Type</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {fileTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:border-blue-500"
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Messages */}
              {uploadStatus === 'success' && (
                <div className="bg-green-50 border border-green-300 rounded-lg p-3 flex items-center gap-2 text-green-700">
                  <CheckCircle size={20} />
                  <span className="text-sm">Document uploaded successfully!</span>
                </div>
              )}

              {uploadStatus === 'error' && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-red-700">
                    <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Upload failed</p>
                      <p className="text-xs mt-1">{uploadError}</p>
                    </div>
                  </div>
                </div>
              )}

              {uploadError && !uploadStatus && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-start gap-2 text-yellow-700">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{uploadError}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-100 text-slate-900 p-3 rounded-lg hover:bg-blue-200 disabled:bg-gray-300 font-medium flex items-center justify-center gap-2 transition"
              >
                {uploading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Upload Document
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Documents List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-blue-50 text-slate-900 border-b border-blue-100">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText size={24} />
                  My Documents ({documents.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <Loader className="animate-spin mx-auto mb-2" />
                  <p>Loading documents...</p>
                </div>
              ) : documents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Title</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Type</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {documents.map(doc => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-slate-900">{doc.title}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {doc.file_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              doc.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <a
                              href={doc.storage_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                              title="Download"
                            >
                              <Download size={16} />
                            </a>
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              disabled={deleteLoading === doc.id}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              {deleteLoading === doc.id ? (
                                <Loader size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-700">No documents uploaded yet</p>
                  <p className="text-sm text-slate-600 mt-2">Start by uploading your first document</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
