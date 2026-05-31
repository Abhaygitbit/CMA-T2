import React, { useState } from 'react';
import { Library, AlertCircle, Trash2, BookOpen, Quote, Search } from 'lucide-react';
import PaperViewer from '../components/PaperViewer.jsx';
import CitationModal from '../components/CitationModal.jsx';

export default function BookmarkLibrary({ bookmarks, onToggleBookmark }) {
  const [query, setQuery] = useState('');
  const [activePaper, setActivePaper] = useState(null);
  const [selectedCitePaper, setSelectedCitePaper] = useState(null);

  // Client-side search within bookmarks
  const filteredBookmarks = bookmarks.filter(paper => {
    const term = query.toLowerCase();
    return (
      (paper.title || '').toLowerCase().includes(term) ||
      (paper.authors || '').toLowerCase().includes(term) ||
      (paper.abstract || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">Your Research Library</h2>
            <p className="text-xs text-slate-400">Manage your saved departmental publications and citations.</p>
          </div>
        </div>

        {/* Quick search input */}
        <div className="w-full md:w-72 glass-panel border border-brand-border rounded-xl p-1.5 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500 ml-2" />
          <input
            type="text"
            placeholder="Search saved library..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-0 text-slate-200 text-xs placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* BOOKMARK CARDS GRID */}
      {filteredBookmarks.length === 0 ? (
        <div className="glass-card rounded-3xl p-16 text-center border border-brand-border flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto">
          <Library className="w-12 h-12 text-slate-600" />
          <div className="space-y-1">
            <h4 className="font-bold text-slate-300">No Publications Bookmarked</h4>
            <p className="text-xs text-slate-500">
              {query 
                ? 'No saved papers match your current search terms.' 
                : 'Browse the Research Hub and click the bookmark badge to save literature here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookmarks.map((paper) => (
            <div 
              key={paper.id} 
              className="glass-card rounded-2xl p-5 border border-brand-border flex flex-col justify-between h-full hover:border-slate-700 transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900 border border-brand-border text-slate-400 uppercase font-bold tracking-wider">
                    {paper.year} Publication
                  </span>
                  
                  <button
                    onClick={() => onToggleBookmark(paper.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 
                  onClick={() => setActivePaper(paper)}
                  className="text-sm font-bold text-slate-100 hover:text-emerald-400 transition-colors line-clamp-2 cursor-pointer"
                >
                  {paper.title}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 truncate">{paper.authors}</p>
                <p className="text-slate-400 text-xs mt-3 line-clamp-3 leading-relaxed border-t border-brand-border/30 pt-2 italic">
                  "{paper.abstract}"
                </p>
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center gap-2 mt-5 pt-3 border-t border-brand-border/30">
                <button
                  onClick={() => setActivePaper(paper)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold py-2 rounded-xl transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Analyze
                </button>
                <button
                  onClick={() => setSelectedCitePaper(paper)}
                  className="p-2 rounded-xl bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-brand-border transition-all"
                  title="Export Citation"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILS VIEWER OVERLAY */}
      {activePaper && (
        <PaperViewer
          paper={activePaper}
          onClose={() => setActivePaper(null)}
          onCite={(p) => setSelectedCitePaper(p)}
        />
      )}

      {/* CITATION MODAL OVERLAY */}
      {selectedCitePaper && (
        <CitationModal
          paper={selectedCitePaper}
          onClose={() => setSelectedCitePaper(null)}
        />
      )}
    </div>
  );
}
