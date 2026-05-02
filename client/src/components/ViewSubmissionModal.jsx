import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

const VERDICT_STYLES = {
  pending:       { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', label: 'Judging...' },
  accepted:      { bg: 'bg-green-500/10 border-green-500/30',  text: 'text-green-400',  label: 'Accepted' },
  wrong_answer:  { bg: 'bg-red-500/10 border-red-500/30',      text: 'text-red-400',    label: 'Wrong Answer' },
  compile_error: { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', label: 'Compilation Error' },
  runtime_error: { bg: 'bg-red-500/10 border-red-500/30',      text: 'text-red-400',    label: 'Runtime Error' },
  time_limit:    { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', label: 'Time Limit Exceeded' },
  frozen:        { bg: 'bg-blue-500/10 border-blue-500/30',    text: 'text-blue-400',   label: 'Frozen' },
};

export default function ViewSubmissionModal({ isOpen, onClose, contestId, submissionId }) {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && submissionId) {
      setLoading(true);
      setError('');
      setSubmission(null);

      api.getSubmissionCode(contestId, submissionId)
        .then(sub => {
          setSubmission(sub);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Failed to load submission');
          setLoading(false);
        });
    }
  }, [isOpen, contestId, submissionId]);

  if (!isOpen) return null;

  const verdictStyle = submission ? (VERDICT_STYLES[submission.status] || VERDICT_STYLES.pending) : null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="relative w-full max-w-4xl flex flex-col glass-strong neon-glow-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh]"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <div className="p-5 border-b border-white/10 bg-black/40 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-3 text-foreground">
              Submission Details
            </h2>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : error ? (
              <div className="p-4 flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-lg font-bold text-red-400 mb-2">Access Denied</h3>
                <p className="text-muted text-sm max-w-md">{error}</p>
                <div className="mt-6">
                  <button onClick={onClose} className="neon-btn">Close</button>
                </div>
              </div>
            ) : submission ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-black/30 border border-white/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Problem</span>
                    <strong className="text-foreground">{submission.contest_problems?.problem_title || 'Unknown Problem'}</strong>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Participant</span>
                    <div className="flex items-center gap-2">
                      {submission.users?.avatar_url && (
                        <img src={submission.users.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                      )}
                      <strong className="text-foreground">{submission.users?.name || submission.users?.username || 'Unknown User'}</strong>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Language</span>
                    <strong className="text-foreground">{submission.language}</strong>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted">Time</span>
                    <strong className="text-foreground">{new Date(submission.submitted_at).toLocaleString()}</strong>
                  </div>
                </div>

                {verdictStyle && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border ${verdictStyle.bg} ${verdictStyle.text}`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      {verdictStyle.label}
                    </div>
                  </motion.div>
                )}

                {submission.error_message && (
                  <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap font-mono bg-black/50 p-3 rounded-md max-h-40 overflow-y-auto border border-red-500/20 text-red-300">
                    {submission.error_message}
                  </pre>
                )}

                <div>
                  <label className="neon-label flex justify-between mb-2">
                    <span>Source Code</span>
                  </label>
                  <pre className="neon-textarea font-mono text-[13px] leading-relaxed h-[400px] overflow-auto bg-black/80 rounded mt-0 p-4 border-white/10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent select-text">
                    {submission.code_text || (submission.solution_url ? `External Solution URL: ${submission.solution_url}` : 'No code submitted')}
                  </pre>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
