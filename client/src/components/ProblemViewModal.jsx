import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

export default function ProblemViewModal({ isOpen, onClose, problem, problemIndex, onSubmitClick }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const label = String.fromCharCode(65 + problemIndex);

  useEffect(() => {
    if (isOpen && problem) {
      if (problem.scraped_content) {
        setContent({
          title: problem.problem_title,
          statement: problem.scraped_content,
          samples: problem.scraped_samples || [],
          languages: ['C++', 'Java', 'Python 3', 'JavaScript'],
        });
      } else if (problem.problem_url) {
        fetchProblem(problem.problem_url, problem.id);
      } else {
        setError('No problem URL provided.');
      }
    } else {
      setContent(null);
      setError('');
    }
  }, [isOpen, problem]);

  const fetchProblem = async (url, id) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.scrapeProblem(url, id);
      setContent(data);
    } catch (err) {
      setError('Failed to fetch problem details. It may not be supported or the URL is invalid.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        <motion.div
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col glass-strong neon-glow-border rounded-xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center">
                {label}
              </span>
              {problem?.problem_title}
            </h2>
            <div className="flex items-center gap-3">
              <a 
                href={problem?.problem_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-white transition-colors flex items-center gap-1"
              >
                Open Original ↗
              </a>
              <button onClick={onClose} className="p-2 text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="h-4 bg-white/10 rounded w-full"></div>
                <div className="h-4 bg-white/10 rounded w-5/6"></div>
                <div className="h-32 bg-white/5 rounded w-full mt-8"></div>
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-red-400 mb-4">{error}</p>
                <a href={problem?.problem_url} target="_blank" rel="noopener noreferrer" className="neon-btn neon-btn-primary inline-block">
                  View on Original Site ↗
                </a>
              </div>
            ) : content ? (
              <div className="prose prose-invert prose-blue max-w-none">
                <div dangerouslySetInnerHTML={{ __html: content.statement }} />

                {content.samples && content.samples.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-bold border-b border-white/10 pb-2">Examples</h3>
                    {content.samples.map((sample, i) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden">
                          <div className="bg-white/5 px-3 py-1.5 text-xs font-mono text-muted border-b border-white/10 flex justify-between">
                            <span>Input</span>
                            <button className="hover:text-white transition-colors" onClick={() => navigator.clipboard.writeText(sample.input)}>Copy</button>
                          </div>
                          <pre className="p-3 m-0 text-sm font-mono whitespace-pre-wrap">{sample.input}</pre>
                        </div>
                        <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden">
                          <div className="bg-white/5 px-3 py-1.5 text-xs font-mono text-muted border-b border-white/10 flex justify-between">
                            <span>Output</span>
                            <button className="hover:text-white transition-colors" onClick={() => navigator.clipboard.writeText(sample.output)}>Copy</button>
                          </div>
                          <pre className="p-3 m-0 text-sm font-mono whitespace-pre-wrap text-primary/90">{sample.output}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-muted">No content available.</div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-3 rounded-b-xl">
            <button onClick={onClose} className="neon-btn">
              Close
            </button>
            <button 
              onClick={() => {
                onClose();
                onSubmitClick(problem, content?.languages || ['C++', 'Java', 'Python 3', 'JavaScript']);
              }} 
              className="neon-btn neon-btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              Submit Solution
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
