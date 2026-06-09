import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Cpu, User, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ResearchChat({ paper = null, user = null }) {
  const storedUser = useMemo(() => {
    if (user) return user;
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }, [user]);

  const initialMode = paper ? 'paper' : 'research';
  const [mode, setMode] = useState(initialMode);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: mode === 'paper'
        ? `Hello${storedUser?.name ? `, ${storedUser.name}` : ''}. I can analyze **"${paper?.title || 'this paper'}"** and also switch to broader research mode whenever you want.`
        : `Hello${storedUser?.name ? `, ${storedUser.name}` : ''}. I can help with broad research questions and also search your teacher-uploaded academic documents.`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const chatEndRef = useRef(null);

  const buildWelcomeMessage = (activeMode) => ({
    sender: 'ai',
    text: activeMode === 'paper'
      ? `Hello${storedUser?.name ? `, ${storedUser.name}` : ''}. I can analyze **"${paper?.title || 'this paper'}"** and also switch to broader research mode whenever you want.`
      : `Hello${storedUser?.name ? `, ${storedUser.name}` : ''}. I can help with broad research questions and also search your teacher-uploaded academic documents.`,
    timestamp: new Date()
  });

  const presetPrompts = [
    mode === 'paper'
      ? { label: 'Methodology?', text: 'Explain the core methodology and design proposed in this study.' }
      : { label: 'Research?', text: 'Explain this topic using both uploaded documents and general academic knowledge.' },
    mode === 'paper'
      ? { label: 'Key Results?', text: 'What are the primary findings, benchmarks, and performance metrics?' }
      : { label: 'Sources?', text: 'What sources or themes are most relevant for this topic?' },
    mode === 'paper'
      ? { label: 'Limitations?', text: 'What are the main limitations, flaws, or future directions outlined?' }
      : { label: 'Summarize', text: 'Give me a concise explanation and cite any relevant document evidence.' }
  ];

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (paper) {
      setMode('paper');
    }
  }, [paper]);

  useEffect(() => {
    setMessages([buildWelcomeMessage(mode)]);
  }, [mode]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    // Clear inputs and errors
    if (!textToSend) setInput('');
    setError(null);

    // Append user message
    const userMsg = {
      sender: 'user',
      text: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const usePaperMode = mode === 'paper' && paper?.id;
      const endpoint = usePaperMode ? `/api/research/${paper.id}/chat` : '/api/research/general/chat';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          department_id: storedUser?.department_id || paper?.department_id || null,
          user_context: storedUser
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get answer from Gemini.');
      }

      const data = await response.json();
      
      const aiMsg = {
        sender: 'ai',
        text: data.answer,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Q&A Error:', err);
      setError('AI request failed. Please verify server connections and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/20 border border-brand-border rounded-2xl overflow-hidden">
      {/* HEADER */}
      <div className="p-4 border-b border-brand-border bg-slate-900/30 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-emerald-400 animate-glow-pulse" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-200">Gemini Research Companion</h3>
          <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
            {mode === 'paper' ? 'Paper Analysis + RAG' : 'Broad Research + Academic Docs'}
          </span>
        </div>
      </div>

      <div className="px-4 pt-3 flex gap-2">
        <button
          onClick={() => setMode('paper')}
          disabled={!paper}
          className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${mode === 'paper' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-900/30 text-slate-400 border-brand-border hover:text-slate-200'}`}
        >
          This Paper
        </button>
        <button
          onClick={() => setMode('research')}
          className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${mode === 'research' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-slate-900/30 text-slate-400 border-brand-border hover:text-slate-200'}`}
        >
          General Research
        </button>
      </div>

      {/* MESSAGES ROOM */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {messages.map((msg, idx) => {
          const isAI = msg.sender === 'ai';
          return (
            <div key={idx} className={`flex items-start gap-2.5 ${!isAI ? 'flex-row-reverse' : ''}`}>
              {/* Profile Icon */}
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                isAI 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                {isAI ? <Cpu className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Speech bubble */}
              <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                isAI 
                  ? 'bg-white/95 border border-slate-200 text-slate-900 shadow-sm' 
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-slate-900 font-medium'
              }`}>
                {/* Parse Markdown summaries gracefully */}
                <div className="prose prose-slate max-w-none text-xs space-y-2 whitespace-pre-wrap">
                  {isAI ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, href, children, ...props}) => {
                          if (href?.startsWith('#citation-')) {
                            return <span className="inline-flex items-center justify-center bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-bold h-4 px-1.5 rounded-sm cursor-help mx-0.5 hover:bg-blue-200 transition-colors" title="Source Document Citation">[{children}]</span>
                          }
                          return <a href={href} {...props} className="text-blue-500 underline">{children}</a>
                        }
                      }}
                    >
                      {msg.text.replace(/\[(\d+)\]/g, '[$1](#citation-$1)')}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* LOADING SKELETON */}
        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-900/60 border border-brand-border rounded-2xl p-4 w-[75%] space-y-2">
              <div className="h-3 bg-white/5 rounded w-1/3 shimmer"></div>
              <div className="h-3 bg-white/5 rounded w-full shimmer"></div>
              <div className="h-3 bg-white/5 rounded w-[85%] shimmer"></div>
            </div>
          </div>
        )}

        {/* ERROR BADGE */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-4 border-t border-brand-border bg-slate-900/20 space-y-3">
        {/* Preset Prompt Pills */}
        <div className="flex gap-2">
          {presetPrompts.map((p, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSend(p.text)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/40 hover:bg-slate-900 text-[10px] font-bold text-slate-400 hover:text-slate-200 border border-brand-border transition-all flex items-center gap-1"
            >
              <MessageSquare className="w-2.5 h-2.5" />
              {p.label}
            </button>
          ))}
        </div>

        {/* Type field */}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={mode === 'paper' ? 'Type your question about this paper...' : 'Type your research question or ask about uploaded academic docs...'}
            rows={1}
            className="w-full glass-input rounded-xl pl-4 pr-12 py-3 text-xs resize-none placeholder-slate-500 text-slate-900 focus:ring-0 focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="absolute right-2.5 top-2.5 p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-900 disabled:text-slate-600 transition-all shadow-md shadow-emerald-500/10"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
