import React, { useState, useEffect } from 'react';
import { X, FileText, Cpu, Download, Quote, Loader2, RefreshCw } from 'lucide-react';
import ResearchChat from './ResearchChat.jsx';

export default function PaperViewer({ paper, onClose, onCite }) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' or 'summary'
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  // Fetch Gemini summary on request or tab switch
  const fetchSummary = async () => {
    if (summary) return; // cache locally
    setLoadingSummary(true);
    setSummaryError(null);

    try {
      const response = await fetch(`/api/research/${paper.id}/summary`);
      if (!response.ok) {
        throw new Error('Failed to retrieve AI summary from Gemini.');
      }
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Summary Fetch Error:', err);
      setSummaryError(err.message || 'Failed to generate AI synthesis.');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'summary') {
      fetchSummary();
    }
  }, [activeTab]);

  return (
    <div className="fixed inset-0 bg-brand-darker/95 backdrop-blur-lg flex flex-col z-40 animate-fade-in-up">
      {/* TOP HEADER */}
      <header className="p-4 border-b border-brand-border bg-slate-900/40 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="truncate max-w-[300px] md:max-w-xl">
            <h2 className="text-sm font-bold text-slate-100 truncate">{paper.title}</h2>
            <p className="text-[10px] text-slate-400 truncate">{paper.authors} • {paper.year}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cite button */}
          <button
            onClick={() => onCite(paper)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-xs font-bold text-slate-400 hover:text-slate-200 border border-brand-border transition-all"
          >
            <Quote className="w-3.5 h-3.5" />
            Cite
          </button>

          {/* Download mock button */}
          <a
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(paper.full_text || '')}`}
            download={`${paper.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-emerald-500 hover:text-slate-900 text-xs font-bold text-slate-400 transition-all border border-brand-border"
          >
            <Download className="w-3.5 h-3.5" />
            Download TXT
          </a>
        </div>
      </header>

      {/* DUAL WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT WORKSPACE: READER & SUMMARY */}
        <div className="flex-1 flex flex-col border-r border-brand-border h-full overflow-hidden">
          {/* TAB BAR */}
          <div className="flex items-center gap-2 p-4 border-b border-brand-border/40 bg-slate-900/20">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'text'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              Parsed Document Text
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'summary'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Cpu className="w-4 h-4 text-blue-400 animate-glow-pulse" />
              Gemini AI Synthesis
            </button>
          </div>

          {/* DOCUMENT READER DISPLAY */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {activeTab === 'text' ? (
              <article className="prose prose-invert max-w-none space-y-6">
                <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight leading-tight">{paper.title}</h1>
                
                {/* Meta details */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-brand-border/40 text-xs text-slate-400 space-y-1.5">
                  <p><strong className="text-slate-200">Principal Investigators:</strong> {paper.authors}</p>
                  <p><strong className="text-slate-200">Publication Year:</strong> {paper.year}</p>
                  <p><strong className="text-slate-200">Index ID:</strong> {paper.id}</p>
                  <p><strong className="text-slate-200">Path:</strong> {paper.storage_path}</p>
                </div>

                <div className="space-y-4">
                  <h2 className="text-base font-extrabold uppercase text-slate-300 tracking-wide border-b border-brand-border/40 pb-2">Abstract</h2>
                  <p className="text-slate-300 text-sm leading-relaxed italic bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">{paper.abstract}</p>
                </div>

                <div className="space-y-4 pt-4">
                  <h2 className="text-base font-extrabold uppercase text-slate-300 tracking-wide border-b border-brand-border/40 pb-2">Full Document Text</h2>
                  <p className="text-slate-400 text-xs leading-loose whitespace-pre-wrap font-sans">{paper.full_text}</p>
                </div>
              </article>
            ) : (
              /* AI DEEP SUMMARY DISPLAY */
              <div className="space-y-6 animate-fade-in-up">
                <div className="flex items-center justify-between pb-4 border-b border-brand-border/40">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-emerald-400 animate-glow-pulse" />
                    <h1 className="text-xl font-bold text-slate-200">Gemini Academic Deep Synthesis</h1>
                  </div>
                  
                  {summary && (
                    <button
                      onClick={() => { setSummary(''); fetchSummary(); }}
                      disabled={loadingSummary}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border"
                      title="Re-Generate Summary"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>

                {loadingSummary && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <p className="text-xs text-slate-400 font-medium">Gemini is synthesizing document nodes... Please wait</p>
                  </div>
                )}

                {summaryError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-2">
                    <p className="text-xs text-red-400 font-bold">Generation failed</p>
                    <p className="text-xs text-slate-400">{summaryError}</p>
                    <button
                      onClick={fetchSummary}
                      className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {summary && (
                  <article className="prose prose-invert max-w-none text-slate-350 text-sm whitespace-pre-wrap leading-relaxed">
                    {summary}
                  </article>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT WORKSPACE: RAG COMPANION */}
        <div className="w-full md:w-[380px] lg:w-[450px] p-4 flex flex-col h-full overflow-hidden bg-slate-950/20 border-t md:border-t-0 md:border-l border-brand-border">
          <ResearchChat paper={paper} />
        </div>
      </div>
    </div>
  );
}
