import React from 'react';
import { BookOpen, Bookmark, BookmarkCheck, Calendar, Users, FileText, Quote } from 'lucide-react';

export default function PaperCard({ 
  paper, 
  onView, 
  onBookmark, 
  isBookmarked, 
  onCite 
}) {
  // Department color mappings
  const getDeptBadge = (deptId) => {
    switch (deptId) {
      case '1':
        return <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider glow-badge-emerald">CS Department</span>;
      case '2':
        return <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider glow-badge-blue">EE Department</span>;
      case '3':
        return <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400">Bioengineering</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-slate-500/10 border border-slate-500/20 text-slate-400">Research</span>;
    }
  };

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between h-full border border-brand-border">
      <div>
        {/* HEADER BADGES */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-white/5">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            {getDeptBadge(paper.department_id)}
          </div>
          
          <button
            onClick={() => onBookmark(paper.id)}
            className={`p-2 rounded-xl transition-all duration-300 ${
              isBookmarked 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Save to Library'}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>

        {/* METADATA CONTENT */}
        <div className="space-y-2">
          <h3 
            onClick={onView}
            className="text-lg font-bold text-slate-100 hover:text-emerald-400 transition-colors duration-200 cursor-pointer line-clamp-2 leading-snug"
          >
            {paper.title}
          </h3>
          
          <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate max-w-[180px]">{paper.authors}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{paper.year}</span>
            </span>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 pt-2 border-t border-brand-border/40">
            {paper.abstract}
          </p>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-brand-border/40">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-900 font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/10 transition-all duration-300"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Read & Analyze
        </button>
        
        <button
          onClick={onCite}
          className="p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-brand-border hover:border-slate-700 transition-all duration-300"
          title="Export Citations"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
