import React, { useState, useEffect } from 'react';
import { Search, Sparkles, AlertCircle, FileText, CheckCircle, RefreshCw, Cpu, Layers, Loader2, BookOpen } from 'lucide-react';
import FiltersPanel from '../components/FiltersPanel.jsx';
import PaperCard from '../components/PaperCard.jsx';
import PaperViewer from '../components/PaperViewer.jsx';
import CitationModal from '../components/CitationModal.jsx';

export default function ResearchHub({ userRole, bookmarks, onToggleBookmark, onOpenCitation }) {
  const [papers, setPapers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [activeTags, setActiveTags] = useState([]);

  // Paper Viewer & Citations
  const [activePaper, setActivePaper] = useState(null);
  const [selectedCitePaper, setSelectedCitePaper] = useState(null);

  // Multi-paper Literature Review Synthesis
  const [selectedPaperIds, setSelectedPaperIds] = useState([]);
  const [litReviewTopic, setLitReviewTopic] = useState('');
  const [generatingReview, setGeneratingReview] = useState(false);
  const [reviewResult, setReviewResult] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Load departments
  useEffect(() => {
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => setDepartments(data))
      .catch(err => console.error('Failed to load departments:', err));
  }, []);

  // Fetch papers based on search queries and filters
  const fetchPapers = async () => {
    setLoading(true);
    try {
      let url = `/api/research/search?`;
      if (searchQuery.trim()) url += `q=${encodeURIComponent(searchQuery)}&`;
      if (selectedDept) url += `dept=${selectedDept}&`;
      if (selectedYear) url += `year=${selectedYear}&`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Search failed');
      let data = await response.json();

      // Client-side tag filtering
      if (activeTags.length > 0) {
        data = data.filter(paper => {
          const content = `${paper.title} ${paper.abstract} ${paper.full_text}`.toLowerCase();
          return activeTags.every(tag => content.includes(tag));
        });
      }

      setPapers(data);
    } catch (err) {
      console.error('Fetch papers error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, [searchQuery, selectedDept, selectedYear, activeTags]);

  const handleTagToggle = (tag) => {
    setActiveTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectPaper = (id) => {
    setSelectedPaperIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSynthesizeReview = async () => {
    if (selectedPaperIds.length < 2) return;
    if (!litReviewTopic.trim()) {
      alert('Please specify a literature review focus topic.');
      return;
    }

    setGeneratingReview(true);
    setShowReviewModal(true);
    setReviewResult('');

    try {
      const response = await fetch('/api/research/lit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperIds: selectedPaperIds,
          topic: litReviewTopic
        })
      });

      if (!response.ok) throw new Error('Failed to generate synthesis');
      const data = await response.json();
      setReviewResult(data.review);
    } catch (err) {
      console.error('Lit review error:', err);
      setReviewResult('Synthesis failed. Please verify that the server is active and Gemini credentials are set.');
    } finally {
      setGeneratingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* GLOWING HERO SEARCH BAR */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-brand-border bg-gradient-to-br from-slate-900/80 via-brand-dark/50 to-brand-darker relative overflow-hidden">
        {/* Glow backdrop mesh */}
        <div className="absolute right-0 top-0 w-80 h-80 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute left-0 bottom-0 w-80 h-80 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider flex items-center gap-1.5 animate-glow-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              Advanced Research Search Engine
            </span>
          </div>
          
          <h2 className="text-xl md:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Consult the Departmental <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">Literature Knowledge Base</span>
          </h2>
          
          <p className="text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed">
            Query paper abstracts or full texts. Use Google Gemini to summarize documents on-the-fly and chat with the publications.
          </p>

          {/* Search Inputs */}
          <div className="flex items-center gap-3 bg-slate-950/50 rounded-2xl p-1.5 border border-brand-border focus-within:border-emerald-500/40 focus-within:shadow-md focus-within:shadow-emerald-500/5 transition-all">
            <Search className="w-5 h-5 text-slate-500 ml-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by keywords, methodologies, or titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 text-slate-200 placeholder-slate-500 text-xs md:text-sm focus:ring-0 focus:outline-none py-2"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold px-2.5 py-1.5 transition-colors mr-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* COMPARATIVE LIT REVIEW SELECTION DRAWER */}
      {selectedPaperIds.length >= 2 && (
        <div className="p-4 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/25 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in-up shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Layers className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Comparative Literature Review ({selectedPaperIds.length} Selected)</p>
              <p className="text-[10px] text-slate-400">Generate a comparative synthesis review on the selected publications.</p>
            </div>
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <input
              type="text"
              placeholder="Focus topic (e.g. Wireless transfer safety)..."
              value={litReviewTopic}
              onChange={(e) => setLitReviewTopic(e.target.value)}
              className="flex-1 md:w-64 glass-input rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none placeholder-slate-500"
            />
            <button
              onClick={handleSynthesizeReview}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold text-xs py-2 px-4 rounded-xl shadow-lg transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Synthesize
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column Filters */}
        <div className="lg:col-span-1">
          <FiltersPanel
            departments={departments}
            selectedDept={selectedDept}
            setSelectedDept={setSelectedDept}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            activeTags={activeTags}
            toggleTag={handleTagToggle}
          />
        </div>

        {/* Right Column Grid List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-brand-border/40">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Catalog Publications ({papers.length} Results)
            </h3>
            {loading && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
          </div>

          {papers.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-brand-border flex flex-col items-center justify-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-500" />
              <h4 className="font-bold text-slate-300">No Publications Located</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Try modifying your filter parameters or search tags to find matching items.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {papers.map((paper) => (
                <div key={paper.id} className="relative group">
                  {/* Select Checkbox for Lit Review */}
                  <div className="absolute top-4 left-4 z-10">
                    <input
                      type="checkbox"
                      checked={selectedPaperIds.includes(paper.id)}
                      onChange={() => handleSelectPaper(paper.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0 focus:outline-none cursor-pointer"
                      title="Select for comparative review"
                    />
                  </div>
                  
                  <div className="pl-6 h-full">
                    <PaperCard
                      paper={paper}
                      onView={() => setActivePaper(paper)}
                      onBookmark={() => onToggleBookmark(paper.id)}
                      isBookmarked={bookmarks.some(b => b.id === paper.id)}
                      onCite={() => setSelectedCitePaper(paper)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OVERLAY: PAPER DETAILS VIEWER */}
      {activePaper && (
        <PaperViewer
          paper={activePaper}
          onClose={() => setActivePaper(null)}
          onCite={(p) => setSelectedCitePaper(p)}
        />
      )}

      {/* OVERLAY: CITATION COPY LIST */}
      {selectedCitePaper && (
        <CitationModal
          paper={selectedCitePaper}
          onClose={() => setSelectedCitePaper(null)}
        />
      )}

      {/* OVERLAY: LITERATURE REVIEW SYNTHESIS MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-brand-darker/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in-up">
          <div className="glass-panel-heavy rounded-3xl max-w-3xl w-full border border-brand-border p-6 shadow-2xl space-y-6 max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-brand-border/60">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-400 animate-glow-pulse" />
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Gemini Comparative Literature Review</h2>
                  <p className="text-[10px] text-slate-400">Synthesized comparison regarding "{litReviewTopic}"</p>
                </div>
              </div>
              {!generatingReview && (
                <button 
                  onClick={() => setShowReviewModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {generatingReview ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Gemini is structuring comparison matrices... This takes a moment.</p>
                </div>
              ) : (
                <article className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {reviewResult}
                </article>
              )}
            </div>

            {/* Footer */}
            {!generatingReview && (
              <div className="flex justify-between items-center pt-4 border-t border-brand-border/60">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Generated from {selectedPaperIds.length} publications
                </span>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-brand-border"
                >
                  Close Synthesis
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
