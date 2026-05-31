import React, { useState } from 'react';
import { X, Copy, Check, Quote } from 'lucide-react';

export default function CitationModal({ paper, onClose }) {
  const [copiedFormat, setCopiedFormat] = useState(null);

  if (!paper) return null;

  const firstAuthorLast = paper.authors.split(',')[0].trim().split(' ').pop();
  const titleClean = paper.title.trim().replace(/\.$/, '');

  // APA Citation: Lastname, F. M. (Year). Title. Journal.
  const apa = `${paper.authors} (${paper.year}). ${titleClean}. Journal of Campus Research, 12(4), 45-67.`;

  // MLA Citation: Authors. "Title." Journal Year.
  const mla = `${paper.authors}. "${titleClean}." Journal of Campus Research, vol. 12, no. 4, ${paper.year}, pp. 45-67.`;

  // IEEE Citation: Authors, "Title," Journal, vol. 12, no. 4, pp. 45-67, Year.
  const ieee = `${paper.authors}, "${titleClean}," Journal of Campus Research, vol. 12, no. 4, pp. 45-67, ${paper.year}.`;

  // BibTeX Citation
  const bibtex = `@article{${firstAuthorLast.toLowerCase()}${paper.year}attention,
  author = {${paper.authors}},
  title = {${paper.title}},
  journal = {Journal of Campus Research},
  volume = {12},
  number = {4},
  pages = {45--67},
  year = {${paper.year}}
}`;

  const citationFormats = [
    { id: 'apa', name: 'APA Format (7th Ed.)', text: apa },
    { id: 'mla', name: 'MLA Format (9th Ed.)', text: mla },
    { id: 'ieee', name: 'IEEE Style', text: ieee },
    { id: 'bibtex', name: 'BibTeX format', text: bibtex, isCode: true }
  ];

  const handleCopy = (formatId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(formatId);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-brand-darker/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in-up">
      <div className="glass-panel-heavy rounded-3xl max-w-2xl w-full border border-brand-border p-6 shadow-2xl space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-brand-border/60">
          <div className="flex items-center gap-2">
            <Quote className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-100">Export Academic Citation</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PAPER BRIEF */}
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-brand-border/40">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">Target Document</p>
          <h3 className="text-sm font-bold text-slate-200">{paper.title}</h3>
          <p className="text-xs text-slate-400 mt-1">{paper.authors} • {paper.year}</p>
        </div>

        {/* CITATION LIST */}
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
          {citationFormats.map((format) => (
            <div key={format.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{format.name}</span>
                <button
                  onClick={() => handleCopy(format.id, format.text)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    copiedFormat === format.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-brand-border'
                  }`}
                >
                  {copiedFormat === format.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
              </div>
              
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-brand-border/40 text-slate-300 text-xs leading-relaxed font-sans select-all break-words">
                {format.isCode ? (
                  <pre className="font-mono text-[10px] text-blue-400 whitespace-pre-wrap">{format.text}</pre>
                ) : (
                  format.text
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end pt-4 border-t border-brand-border/60">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-bold transition-all border border-brand-border"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
