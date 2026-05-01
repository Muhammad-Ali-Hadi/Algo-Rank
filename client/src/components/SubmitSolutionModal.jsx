import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

const VERDICT_STYLES = {
  pending:       { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', label: '⏳ Judging...',         spinning: true },
  accepted:      { bg: 'bg-green-500/10 border-green-500/30',  text: 'text-green-400',  label: '✅ Accepted',           spinning: false },
  wrong_answer:  { bg: 'bg-red-500/10 border-red-500/30',      text: 'text-red-400',    label: '❌ Wrong Answer',       spinning: false },
  compile_error: { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', label: '⚠️ Compilation Error', spinning: false },
  runtime_error: { bg: 'bg-red-500/10 border-red-500/30',      text: 'text-red-400',    label: '💥 Runtime Error',      spinning: false },
  time_limit:    { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', label: '⏱️ Time Limit Exceeded', spinning: false },
};

export default function SubmitSolutionModal({ isOpen, onClose, contestId, problem, problemIndex, supportedLanguages = ['C++', 'Java', 'Python 3', 'C'], onSubmitted }) {
  const [language, setLanguage] = useState(supportedLanguages[0] || 'C++');
  const [submissionType, setSubmissionType] = useState('code'); // 'code' or 'url'
  const [code, setCode] = useState('');
  const [solutionUrl, setSolutionUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [compileResult, setCompileResult] = useState(null);
  const [error, setError] = useState('');
  const [verdict, setVerdict] = useState(null); // { status, submissionId }
  const pollRef = useRef(null);

  const label = String.fromCharCode(65 + problemIndex);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleCompile = async (e) => {
    e.preventDefault();
    if (submissionType !== 'code') return;
    if (!code.trim()) {
      setError('Code cannot be empty');
      return;
    }

    setCompiling(true);
    setError('');
    setCompileResult(null);
    setVerdict(null);

    try {
      const res = await api.compileSolution({
        language,
        code_text: code
      });
      setCompileResult(res);
    } catch (err) {
      setError(err.message || 'Failed to compile');
    } finally {
      setCompiling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submissionType === 'code' && !code.trim()) {
      setError('Code cannot be empty');
      return;
    }
    if (submissionType === 'url' && !solutionUrl.trim()) {
      setError('Solution URL cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    setCompileResult(null);
    setVerdict(null);

    try {
      const res = await api.submitSolution(contestId, {
        problem_id: problem.id,
        language,
        code_text: submissionType === 'code' ? code : '',
        solution_url: submissionType === 'url' ? solutionUrl : '',
      });

      const sub = res.submission;
      if (sub && submissionType === 'code') {
        setVerdict({ status: 'pending', submissionId: sub.id });
        
        // Poll for verdict changes (every 3 seconds, max 90 seconds)
        let pollCount = 0;
        pollRef.current = setInterval(async () => {
          pollCount++;
          if (pollCount > 30) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            return;
          }
          try {
            // Re-fetch via leaderboard/contest to check latest status
            // Since we don't have a dedicated submission status endpoint,
            // we'll rely on the status being updated in the background
            const contestData = await api.getContestById(contestId);
            // We can't directly get submission status from this,
            // but the background evaluator updates the DB
            // Let's just wait and show verdict after a reasonable time
          } catch (_) { /* ignore poll errors */ }
        }, 3000);
        
        // For code submissions, show pending then let the user know to check leaderboard
        setTimeout(() => {
          if (verdict?.status === 'pending') {
            setVerdict(prev => prev?.status === 'pending' ? { ...prev, status: 'pending' } : prev);
          }
        }, 2000);
      }

      onSubmitted();
    } catch (err) {
      setError(err.message || 'Failed to submit solution');
      setVerdict(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const verdictStyle = verdict ? VERDICT_STYLES[verdict.status] || VERDICT_STYLES.pending : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="relative w-full max-w-3xl flex flex-col glass-strong neon-glow-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh]"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
        >
          <div className="p-5 border-b border-white/10 bg-black/40 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-3 text-foreground">
              <span className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center text-sm">
                {label}
              </span>
              Submit Solution
            </h2>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
            <div>
              <p className="text-sm text-muted mb-4">
                Submitting for: <strong className="text-foreground">{problem?.problem_title}</strong>
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Compile Result Alert */}
            {compileResult && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border text-sm ${compileResult.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {compileResult.success ? '✅' : '⚠️'}
                  {compileResult.success ? 'Compilation Successful' : 'Compilation Error'}
                </div>
                {compileResult.error && (
                  <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap font-mono bg-black/50 p-3 rounded-md max-h-40 overflow-y-auto">
                    {compileResult.error}
                  </pre>
                )}
                {compileResult.message && (
                  <p className="text-xs opacity-80 mt-1">{compileResult.message}</p>
                )}
              </motion.div>
            )}

            {/* Verdict Alert */}
            {verdictStyle && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${verdictStyle.bg} ${verdictStyle.text}`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {verdictStyle.spinning && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {verdictStyle.label}
                </div>
                {verdict.status === 'pending' && (
                  <p className="text-xs opacity-70 mt-1">Your code is being evaluated against all test cases. Check the leaderboard for the final verdict.</p>
                )}
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="neon-label">Language</label>
                <select
                  className="neon-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  required
                >
                  {supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="neon-label">Submission Method</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmissionType('code')}
                    className={`flex-1 py-2 px-3 text-sm rounded border ${submissionType === 'code' ? 'bg-primary/20 border-primary text-primary' : 'bg-black/30 border-white/10 text-muted hover:bg-white/5'}`}
                  >
                    Paste Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionType('url')}
                    className={`flex-1 py-2 px-3 text-sm rounded border ${submissionType === 'url' ? 'bg-primary/20 border-primary text-primary' : 'bg-black/30 border-white/10 text-muted hover:bg-white/5'}`}
                  >
                    Submission URL
                  </button>
                </div>
              </div>
            </div>

            {submissionType === 'code' ? (
              <div>
                <label className="neon-label flex justify-between">
                  <span>Source Code</span>
                  <span className="text-xs text-muted font-normal lowercase">({language})</span>
                </label>
                <textarea
                  className="neon-textarea font-mono text-sm leading-relaxed h-64 bg-black/80"
                  spellCheck="false"
                  placeholder={`// Paste your ${language} code here...`}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="neon-label">External Submission URL</label>
                <p className="text-xs text-muted mb-2">
                  Already submitted on the judge site? Paste the link to your submission here.
                </p>
                <input
                  type="url"
                  className="neon-input"
                  placeholder="https://codeforces.com/contest/..."
                  value={solutionUrl}
                  onChange={(e) => setSolutionUrl(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="neon-btn">
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="neon-btn neon-btn-primary min-w-[120px] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </>
                ) : 'Submit'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
