import React, { useState, useEffect } from 'react';
import { ShieldCheck, Upload, FileText, Check, X, Edit, BarChart3, ListFilter, AlertCircle, RefreshCw, Cpu, Layers, User } from 'lucide-react';

export default function AdminConsole() {
  const [activeSubTab, setActiveSubTab] = useState('upload'); // 'upload', 'review', 'analytics'
  const [departments, setDepartments] = useState([]);
  
  // PDF Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState('1');
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(''); // 'parsing', 'gemini', 'done'
  const [extractionResult, setExtractionResult] = useState(null); // Metadata form for editing

  // Review Queue State
  const [pendingPapers, setPendingPapers] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [editingPaper, setEditingPaper] = useState(null);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Load basic configurations
  useEffect(() => {
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(err => console.error(err));
      
    fetchPendingQueue();
    fetchAnalytics();
  }, []);

  const fetchPendingQueue = async () => {
    setLoadingQueue(true);
    try {
      const response = await fetch('/api/admin/research/pending');
      const data = await response.json();
      setPendingPapers(data);
    } catch (err) {
      console.error('Queue load failed:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const response = await fetch('/api/admin/analytics');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Analytics load failed:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Upload handler
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadStep('parsing');
    setExtractionResult(null);

    const formData = new FormData();
    formData.append('pdf', selectedFile);
    formData.append('department_id', selectedDeptId);

    // Simulate AI pipeline step transitions visually
    const geminiTimer = setTimeout(() => {
      setUploadStep('gemini');
    }, 2500);

    try {
      const response = await fetch('/api/admin/research/upload', {
        method: 'POST',
        body: formData
      });

      clearTimeout(geminiTimer);

      if (!response.ok) {
        throw new Error('PDF upload and extraction pipeline failed.');
      }

      const data = await response.json();
      setUploadStep('done');
      setExtractionResult(data.paper); // Load into verification form
      fetchPendingQueue();
      fetchAnalytics();
    } catch (err) {
      console.error(err);
      alert(err.message || 'File processing error.');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  // Verification Form approval
  const handleVerifyApprove = async (e) => {
    e.preventDefault();
    if (!extractionResult) return;

    try {
      const response = await fetch(`/api/admin/research/${extractionResult.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: extractionResult.title,
          authors: extractionResult.authors,
          year: extractionResult.year,
          abstract: extractionResult.abstract,
          approved: true // Set to public index
        })
      });

      if (!response.ok) throw new Error('Approval failed');
      
      alert('Paper successfully verified, approved, and indexed!');
      setExtractionResult(null);
      fetchPendingQueue();
      fetchAnalytics();
    } catch (err) {
      console.error(err);
      alert('Verification save failed.');
    }
  };

  // Review Queue approval
  const handleApprovePaper = async (id) => {
    try {
      const response = await fetch(`/api/admin/research/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true })
      });
      if (response.ok) {
        setPendingPapers(prev => prev.filter(p => p.id !== id));
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectPaper = async (id) => {
    if (!confirm('Are you sure you want to discard this pending research upload?')) return;
    try {
      const response = await fetch(`/api/admin/research/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject: true })
      });
      if (response.ok) {
        setPendingPapers(prev => prev.filter(p => p.id !== id));
        fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER HERO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-5 h-5 text-white animate-glow-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">Curator Workspace</h2>
            <p className="text-xs text-slate-400">Ingest research, approve pending metadata, and audit portal analytics.</p>
          </div>
        </div>

        {/* SUB TAB CONTROLS */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-brand-border">
          <button
            onClick={() => setActiveSubTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'upload' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Ingest Station
          </button>
          
          <button
            onClick={() => setActiveSubTab('review')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'review' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Review Queue ({pendingPapers.length})
          </button>

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'analytics' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Portal Analytics
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. PDF INGESTION PANEL */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Upload Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-brand-border space-y-4">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Select Academic PDF
              </h3>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* Department drop down */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold uppercase">Target Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full bg-slate-950 border border-brand-border rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Drag drop slot */}
                <div className="relative border-2 border-dashed border-brand-border hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col items-center justify-center space-y-2 bg-slate-900/10 cursor-pointer group transition-all">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-300">
                      {selectedFile ? selectedFile.name : 'Click or Drag File here'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Maximum size 10MB • PDF, DOCX, and TXT supported</p>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-900 font-extrabold text-xs py-3 rounded-xl shadow-lg transition-all"
                >
                  {uploading ? 'Processing PDF Ingestion...' : 'Incorporate Document'}
                </button>
              </form>

              {/* Ingestion pipeline stepper */}
              {uploading && (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-brand-border/40 space-y-3 animate-pulse">
                  <div className="flex items-center gap-2 text-xs">
                    <Cpu className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span className="font-bold text-slate-300">
                      {uploadStep === 'parsing' ? 'Phase 1: Parsing Raw PDF Characters...' : 'Phase 2: Consulting Google Gemini for Context Metadata...'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-1000"
                      style={{ width: uploadStep === 'parsing' ? '40%' : '80%' }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata verification panel */}
          <div className="lg:col-span-3">
            {extractionResult ? (
              <div className="glass-panel rounded-2xl p-6 border border-brand-border space-y-4 animate-fade-in-up">
                <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400 animate-glow-pulse" />
                    <h3 className="font-bold text-slate-200 text-sm">Review Extracted Metadata</h3>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                    AI Parsed Success
                  </span>
                </div>

                <form onSubmit={handleVerifyApprove} className="space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Document Title</label>
                    <input
                      type="text"
                      value={extractionResult.title}
                      onChange={(e) => setExtractionResult(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Authors & Year */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Principal Investigators</label>
                      <input
                        type="text"
                        value={extractionResult.authors}
                        onChange={(e) => setExtractionResult(prev => ({ ...prev, authors: e.target.value }))}
                        className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Publish Year</label>
                      <input
                        type="number"
                        value={extractionResult.year}
                        onChange={(e) => setExtractionResult(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                        className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Abstract */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Abstract Synthesis</label>
                    <textarea
                      value={extractionResult.abstract}
                      rows={5}
                      onChange={(e) => setExtractionResult(prev => ({ ...prev, abstract: e.target.value }))}
                      className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 focus:outline-none leading-relaxed resize-none"
                    />
                  </div>

                  {/* Save buttons */}
                  <div className="flex gap-2 justify-end pt-2 border-t border-brand-border/40">
                    <button
                      type="button"
                      onClick={() => setExtractionResult(null)}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-brand-border"
                    >
                      Discard
                    </button>
                    
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-900 font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Verify, Index & Publish
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-12 border border-brand-border text-center flex flex-col items-center justify-center space-y-3 h-[400px] bg-slate-900/10">
                <FileText className="w-10 h-10 text-slate-600" />
                <h4 className="font-bold text-slate-350">Metadata Curating Terminal</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Upload a PDF in the left tray. Our Node text extractor and Google Gemini AI engine will parse details and load them here for your final audit.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. CURATION REVIEW QUEUE */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'review' && (
        <div className="glass-panel rounded-2xl p-6 border border-brand-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/40">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-emerald-400" />
              Pending Review Board ({pendingPapers.length})
            </h3>
            
            <button 
              onClick={fetchPendingQueue}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingQueue ? (
            <div className="text-center py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-500 font-bold uppercase">Refreshing reviews...</p>
            </div>
          ) : pendingPapers.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center space-y-2">
              <Check className="w-8 h-8 text-emerald-400 bg-emerald-500/10 rounded-full p-1.5 border border-emerald-500/20" />
              <h4 className="font-bold text-slate-300">Clean Review Queue</h4>
              <p className="text-xs text-slate-500">All uploaded departmental publications are reviewed and actively indexed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPapers.map((paper) => (
                <div 
                  key={paper.id}
                  className="bg-slate-900/40 border border-brand-border/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded bg-slate-950 border border-brand-border text-slate-400 font-bold">
                        {paper.year}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                        {departments.find(d => d.id === paper.department_id)?.name || 'Dept'}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-slate-200 text-xs md:text-sm">{paper.title}</h4>
                    <p className="text-[10px] text-slate-400">{paper.authors}</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2 pt-1 border-t border-brand-border/20 mt-1.5 italic">
                      "{paper.abstract}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleRejectPaper(paper.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                      Discard
                    </button>
                    
                    <button
                      onClick={() => handleApprovePaper(paper.id)}
                      className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Index
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. PORTAL ANALYTICS PANEL */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {loadingAnalytics ? (
            <div className="text-center py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-500 font-bold uppercase">Synthesizing Analytics...</p>
            </div>
          ) : analyticsData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat Briefs */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-brand-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Total Indexed Publications</p>
                    <h3 className="text-2xl font-black text-slate-100 mt-1">{analyticsData.totalPapers}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <FileText className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
                
                <div className="glass-panel p-5 rounded-2xl border border-brand-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Saved Bookmarks Count</p>
                    <h3 className="text-2xl font-black text-slate-100 mt-1">{analyticsData.totalBookmarks}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-brand-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Total Searches Indexed</p>
                    <h3 className="text-2xl font-black text-slate-100 mt-1">{analyticsData.totalSearches}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Department Distribution (PURE SVG BAR CHART) */}
              <div className="glass-panel rounded-2xl p-5 border border-brand-border space-y-4">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-widest border-b border-brand-border/40 pb-2">
                  Papers per Department
                </h4>
                
                <div className="flex justify-center pt-4">
                  {/* Inline SVG Chart */}
                  <svg width="220" height="150" viewBox="0 0 220 150" className="overflow-visible">
                    {/* Y Axis line */}
                    <line x1="30" y1="10" x2="30" y2="120" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    {/* X Axis line */}
                    <line x1="30" y1="120" x2="200" y2="120" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    
                    {/* Bar 1 (CS) */}
                    <rect x="50" y="40" width="24" height="80" rx="3" fill="#10b981" className="opacity-80 hover:opacity-100 transition-opacity" />
                    <text x="62" y="135" fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight="bold" textAnchor="middle">CS</text>
                    <text x="62" y="32" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">2</text>

                    {/* Bar 2 (EE) */}
                    <rect x="100" y="80" width="24" height="40" rx="3" fill="#3b82f6" className="opacity-80 hover:opacity-100 transition-opacity" />
                    <text x="112" y="135" fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight="bold" textAnchor="middle">EE</text>
                    <text x="112" y="72" fill="#3b82f6" fontSize="10" fontWeight="bold" textAnchor="middle">1</text>

                    {/* Bar 3 (BIO) */}
                    <rect x="150" y="80" width="24" height="40" rx="3" fill="#a855f7" className="opacity-80 hover:opacity-100 transition-opacity" />
                    <text x="162" y="135" fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight="bold" textAnchor="middle">BIO</text>
                    <text x="162" y="72" fill="#a855f7" fontSize="10" fontWeight="bold" textAnchor="middle">1</text>
                  </svg>
                </div>
              </div>

              {/* Popular Publications views */}
              <div className="glass-panel rounded-2xl p-5 border border-brand-border space-y-4 md:col-span-2">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-widest border-b border-brand-border/40 pb-2">
                  Popular Publications & Views
                </h4>
                
                <div className="space-y-3 pt-2">
                  {analyticsData.popularPapers.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10">No usage logs recorded yet.</p>
                  ) : (
                    analyticsData.popularPapers.map((paper, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium truncate max-w-[320px]">{paper.title}</span>
                          <span className="text-emerald-400 font-bold">{paper.views} Views</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full"
                            style={{ width: `${Math.min(100, (paper.views / 10) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 text-center border border-brand-border">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="font-bold text-slate-350">Failed to render Portal Stats</h4>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
