import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EditForkDescriptionModal({ isOpen, onClose, problem, onSave, saving }) {
  const [description, setDescription] = useState(problem?.scraped_content || '');

  if (!isOpen || !problem) return null;

  const handleSave = () => {
    onSave(description);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-3xl bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 bg-black/40 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-sm">
                🔀
              </span>
              <div>
                <h3 className="font-bold text-foreground text-lg">Edit Forked Problem</h3>
                <p className="text-xs text-muted mt-0.5">{problem.problem_title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Description Editor */}
            <div>
              <label className="neon-label flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Problem Description (HTML)
              </label>
              <textarea
                className="neon-textarea font-mono text-sm leading-relaxed bg-[#0a0a0f]/90 p-4 border-white/10 resize-y w-full"
                style={{ minHeight: '300px' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter the problem description in HTML format..."
                spellCheck="false"
              />
              <p className="text-xs text-muted mt-2">
                You can use HTML tags to format the description. MathJax formulas are supported.
              </p>
            </div>

            {/* Test Cases Lock Notice */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/5 to-transparent border border-yellow-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-400">Test Cases Locked</p>
                  <p className="text-xs text-muted mt-0.5">
                    Sample test cases and hidden test cases are inherited from the original problem and cannot be modified.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview of locked samples */}
            {problem.scraped_samples && problem.scraped_samples.length > 0 && (
              <div>
                <label className="neon-label flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Sample Test Cases (Read-Only)
                </label>
                <div className="space-y-3 opacity-60 pointer-events-none select-none">
                  {problem.scraped_samples.map((sample, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted mb-1">Input #{idx + 1}</div>
                        <pre className="bg-[#0a0a0f]/80 border border-white/5 rounded-lg p-2.5 text-xs text-foreground/70 font-mono overflow-x-auto">
                          {sample.input}
                        </pre>
                      </div>
                      <div>
                        <div className="text-xs text-muted mb-1">Output #{idx + 1}</div>
                        <pre className="bg-[#0a0a0f]/80 border border-white/5 rounded-lg p-2.5 text-xs text-foreground/70 font-mono overflow-x-auto">
                          {sample.output}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-white/10 bg-black/40 flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="neon-btn bg-white/5 hover:bg-white/10 text-white px-5"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="neon-btn neon-btn-primary px-5 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Description
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
