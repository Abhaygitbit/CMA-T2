import React from 'react';
import { Filter, Calendar, FolderOpen, Tag } from 'lucide-react';

export default function FiltersPanel({ 
  departments, 
  selectedDept, 
  setSelectedDept, 
  selectedYear, 
  setSelectedYear,
  activeTags,
  toggleTag
}) {
  const years = [2023, 2022, 2021];
  const tags = ['Machine Learning', 'Attention', 'Energy', 'Gene Editing', 'ResNet', 'Wireless Charge', 'Algorithms', 'Hardware'];

  return (
    <div className="glass-panel rounded-2xl p-6 border border-brand-border space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b border-brand-border/60">
        <Filter className="w-4 h-4 text-emerald-400" />
        <h2 className="font-bold text-slate-200">Refine Literature</h2>
      </div>

      {/* DEPARTMENT SELECTOR */}
      <div className="space-y-3">
        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
          Academic Domain
        </label>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedDept('')}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
              selectedDept === ''
                ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            All Departments
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(dept.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                selectedDept === dept.id
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>
      </div>

      {/* YEAR SELECTOR */}
      <div className="space-y-3">
        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          Publication Year
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedYear('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              selectedYear === ''
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-900/40 text-slate-400 border-brand-border hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            All
          </button>
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year.toString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedYear === year.toString()
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-900/40 text-slate-400 border-brand-border hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* TOPIC BADGES */}
      <div className="space-y-3">
        <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-slate-500" />
          Quick Topic Filters
        </label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const isSelected = activeTags.includes(tag.toLowerCase());
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag.toLowerCase())}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                  isSelected
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : 'bg-slate-900/40 text-slate-400 border-brand-border hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
