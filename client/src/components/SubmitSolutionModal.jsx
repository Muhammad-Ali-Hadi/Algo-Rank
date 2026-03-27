import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

export default function SubmitSolutionModal({ isOpen, onClose, contestId, problem, problemIndex, supportedLanguages = ['C++', 'Java', 'Python 3', 'JavaScript'], onSubmitted }) {
  const [language, setLanguage] = useState(supportedLanguages[0] || 'C++');
  const [submissionType, setSubmissionType] = useState('code'); // 'code' or 'url'
  const [code, setCode] = useState('');
  const [solutionUrl, setSolutionUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const label = String.fromCharCode(65 + problemIndex);

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

    try {
      await api.submitSolution(contestId, {
        problem_id: problem.id,
        language,
        code_text: submissionType === 'code' ? code : '',
        solution_url: submissionType === 'url' ? solutionUrl : '',
      });

      onSubmitted();
      onClose();
      setCode('');
      setSolutionUrl('');
    } catch (err) {
      setError(err.message || 'Failed to submit solution');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
          className="relative w-full max-w-3xl flex flex-col glass-strong neon-glow-border rounded-xl shadow-2xl overflow-hidden"
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

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <p className="text-sm text-muted mb-4">
                Submitting for: <strong className="text-foreground">{problem?.problem_title}</strong>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
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
                className="neon-btn neon-btn-primary min-w-[120px]"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
