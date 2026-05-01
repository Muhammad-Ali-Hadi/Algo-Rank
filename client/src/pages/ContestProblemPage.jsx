import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import NeonLayout from '../components/NeonLayout';
import { api } from '../services/api';
import DOMPurify from 'dompurify';
import { formatProblemDescription, retypeset } from '../utils/formatProblem';

function getContestStatus(contest) {
  const now = new Date();
  const start = new Date(contest.start_time);
  const end = contest.end_time ? new Date(contest.end_time) : null;
  if (now < start) return 'upcoming';
  if (end && now > end) return 'ended';
  return 'live';
}

export default function ContestProblemPage() {
  const { id, problemId } = useParams();
  const navigate = useNavigate();
  const { user: profile } = useAuth();

  const [contest, setContest] = useState(null);
  const [problem, setProblem] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [orderIndex, setOrderIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Scraped content state
  const [content, setContent] = useState(null);
  const [scraping, setScraping] = useState(false);

  // Submission state
  const [language, setLanguage] = useState('C++');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Status Modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [submittedCode, setSubmittedCode] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState('pending');
  const [submitErrorMsg, setSubmitErrorMsg] = useState('');
  
  const [copied, setCopied] = useState(null);
  
  const supportedLanguages = ['C', 'C++', 'Java', 'Python 3', 'JavaScript'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getContestById(id);
        const targetProblem = data.problems.find(p => p.id === problemId);
        if (!targetProblem) {
          throw new Error('Problem not found in this contest');
        }

        setContest(data.contest);
        setParticipants(data.participants || []);
        setProblem(targetProblem);
        setOrderIndex(data.problems.findIndex(p => p.id === problemId));

        // Handle content
        if (targetProblem.scraped_content) {
          setContent({
            title: targetProblem.problem_title,
            statement: targetProblem.scraped_content,
            samples: targetProblem.scraped_samples || [],
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load problem');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, problemId]);

  useEffect(() => {
    if (content && window.MathJax) {
      retypeset();
    }
  }, [content]);

  const handleCopy = (text, type, idx) => {
    navigator.clipboard.writeText(text);
    setCopied(`${type}-${idx}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTestCase = (str) => {
    if (!str) return '';
    // Remove excessive newlines
    return str.replace(/\n\s*\n/g, '\n').trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return setSubmitErrorMsg('Code cannot be empty');

    setSubmitting(true);
    setSubmitErrorMsg('');

    try {
      const res = await api.submitSolution(id, {
        problem_id: problemId,
        language,
        code_text: code,
        solution_url: '',
      });

      const subId = res.submission?.id;
      if (!subId) {
        setSubmitErrorMsg('Submission ID missing');
        setSubmitting(false);
        return;
      }

      // Show popup
      setSubmittedCode(code);
      setSubmissionStatus('pending');
      setShowStatusModal(true);
      
      // Poll for final verdict
      let finalStatus = 'pending';
      let attempts = 0;
      
      while (finalStatus === 'pending' && attempts < 45) { // 45 * 2s = 90s max
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        try {
          const statusRes = await api.getSubmissionStatus(subId);
          finalStatus = statusRes.status;
          setSubmissionStatus(finalStatus);
        } catch (e) {
          // ignore network errors during polling
        }
      }

      if (finalStatus === 'accepted') {
        setCode(''); // Clear code input on success
      }
      
    } catch (err) {
      setSubmitErrorMsg(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <NeonLayout>
        <div className="max-w-7xl mx-auto space-y-4 animate-pulse">
          <div className="h-6 bg-white/5 rounded w-1/3 mb-4" />
          <div className="h-96 bg-white/5 rounded w-full neon-card" />
        </div>
      </NeonLayout>
    );
  }

  if (error) {
    return (
      <NeonLayout>
        <div className="max-w-7xl mx-auto neon-card p-8 text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <Link to={`/contests/${id}`} className="neon-btn">
            ← Back to Contest
          </Link>
        </div>
      </NeonLayout>
    );
  }

  const status = getContestStatus(contest);
  const isParticipant = participants.some(p => p.user_id === profile?.id);
  const isCreatorOrAdmin = profile?.isAdmin || contest.creator_id === profile?.id;
  const canSubmit = status === 'live' && (isParticipant || isCreatorOrAdmin);
  const label = String.fromCharCode(65 + orderIndex);

  return (
    <NeonLayout>
      <motion.div
        className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Left Side: Problem Statement */}
        <div className="xl:col-span-8 space-y-6">
          <Link to={`/contests/${id}`} className="text-muted text-sm hover:text-primary transition-colors inline-flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Contest Setup
          </Link>

          <div className="neon-card neon-glow-border p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-border pb-6 mb-6">
              <h1 className="text-3xl font-bold flex items-center gap-4 text-foreground">
                <span className="w-12 h-12 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold shadow-lg text-2xl border border-primary/20">
                  {label}
                </span>
                {problem.problem_title}
              </h1>
            </div>

            {scraping ? (
              <div className="py-10 text-center animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-3"></div>
                <div className="h-4 bg-white/10 rounded w-1/2 mx-auto"></div>
                <p className="text-sm text-primary mt-4">Loading problem description...</p>
              </div>
            ) : content ? (
              <div className="space-y-8">
                {/* Problem Statement text */}
                <div
                  className="problem-body prose prose-invert prose-sm sm:prose-base max-w-none text-justify
                            prose-p:text-muted/90 prose-p:leading-relaxed
                            prose-headings:text-foreground prose-headings:font-semibold
                            prose-a:text-primary
                            prose-code:text-accent prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                            prose-pre:bg-[#0a0a0f] prose-pre:border prose-pre:border-white/10 prose-pre:text-muted"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(formatProblemDescription(content.statement), {
                      ADD_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'div', 'span', 'math', 'mi', 'mn', 'mo', 'sup', 'sub', 'center', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img', 'b', 'i', 'br', 'a', 'blockquote'],
                      ADD_ATTR: ['class', 'style', 'href', 'src', 'alt', 'width', 'height', 'align']
                    })
                  }}
                />

                {/* Samples */}
                {content.samples && content.samples.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <h2 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                      Sample Test Cases
                    </h2>

                    <div className="space-y-6">
                      {content.samples.map((sample, idx) => (
                        <div key={idx} className="space-y-3">
                          <h3 className="text-sm font-medium text-foreground tracking-wide flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">
                              {idx + 1}
                            </span>
                            Test Case {idx + 1}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative group">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs text-muted font-medium uppercase tracking-wider">Input</div>
                                <button
                                  onClick={() => handleCopy(formatTestCase(sample.input), 'input', idx)}
                                  className="text-xs text-primary hover:text-primary-focus transition-colors flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
                                >
                                  {copied === `input-${idx}` ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              <pre className="bg-[#0a0a0f]/80 border border-white/5 rounded-lg p-3 text-sm text-foreground/90 font-mono overflow-x-auto select-all h-[calc(100%-24px)]">
                                {formatTestCase(sample.input)}
                              </pre>
                            </div>
                            <div className="relative group">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs text-muted font-medium uppercase tracking-wider">Expected Output</div>
                                <button
                                  onClick={() => handleCopy(formatTestCase(sample.output), 'output', idx)}
                                  className="text-xs text-primary hover:text-primary-focus transition-colors flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
                                >
                                  {copied === `output-${idx}` ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                              <pre className="bg-[#0a0a0f]/80 border border-white/5 rounded-lg p-3 text-sm text-foreground/90 font-mono overflow-x-auto select-all h-[calc(100%-24px)]">
                                {formatTestCase(sample.output)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-muted">No content available for this problem.</div>
            )}
          </div>
        </div>

        {/* Right Side: Submission Panel */}
        <div className="xl:col-span-4 space-y-6 xl:mt-12">
          {canSubmit ? (
            <div className="neon-card p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Submit Solution</h2>

                {/* Language Dropdown (Top Right Corner) */}
                <select
                  className="bg-black/50 border border-white/10 text-white text-sm rounded-md px-3 py-1.5 focus:border-primary focus:outline-none transition-colors"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              {submitErrorMsg && (
                <div className="p-3 mb-4 rounded border text-sm bg-red-500/10 border-red-500/30 text-red-400">
                  {submitErrorMsg}
                </div>
              )}

              <form className="space-y-4">
                <div>
                  <textarea
                    className="neon-textarea font-mono text-sm leading-relaxed h-80 bg-[#0a0a0f]/90 p-4 border-white/10 resize-y"
                    placeholder={`// Write your ${language} code here...`}
                    spellCheck="false"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="neon-btn neon-btn-primary w-full py-2.5"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="neon-card p-6 bg-white/[0.02] border-dashed mt-12">
              <h3 className="text-foreground font-semibold mb-2">Submissions Locked</h3>
              <p className="text-muted text-sm">
                You cannot submit solutions right now. The contest might not be active, or you haven't joined yet.
              </p>
              {!isParticipant && status !== 'ended' && (
                <Link to={`/contests/${id}`} className="neon-btn neon-btn-primary mt-4 w-full justify-center">
                  Join Contest
                </Link>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* VJudge-style Status Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (submissionStatus !== 'pending') setShowStatusModal(false);
              }}
            />
            
            <motion.div
              className="relative w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary/20 text-primary flex items-center justify-center text-xs">
                    {label}
                  </span>
                  Submission Status
                </h3>
                {submissionStatus !== 'pending' && (
                  <button onClick={() => setShowStatusModal(false)} className="text-muted hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                )}
              </div>

              {/* Status Display Area */}
              <div className="p-6 flex flex-col items-center justify-center border-b border-white/5 min-h-[160px]">
                {submissionStatus === 'pending' && (
                  <div className="text-center">
                    <div className="text-yellow-400 text-4xl mb-4 animate-pulse">
                      ⏳
                    </div>
                    <h2 className="text-2xl font-bold text-yellow-400 mb-1">Judging...</h2>
                    <p className="text-muted text-sm">Running test cases...</p>
                  </div>
                )}
                
                {submissionStatus === 'accepted' && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                    <div className="w-12 h-12 mx-auto bg-green-500 rounded-full mb-4 shadow-[0_0_30px_rgba(34,197,94,0.6)]"></div>
                    <h2 className="text-2xl font-bold text-green-400 mb-1 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">Accepted</h2>
                    <p className="text-muted text-sm">All test cases passed!</p>
                  </motion.div>
                )}

                {submissionStatus === 'wrong_answer' && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                    <div className="w-12 h-12 mx-auto bg-red-500 rounded-full mb-4 shadow-[0_0_30px_rgba(239,68,68,0.6)]"></div>
                    <h2 className="text-2xl font-bold text-red-400 mb-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">Wrong Answer</h2>
                    <p className="text-muted text-sm">Output didn't match expected on a test case.</p>
                  </motion.div>
                )}

                {submissionStatus === 'compile_error' && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                    <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 text-3xl mb-4 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                      ⚠️
                    </div>
                    <h2 className="text-2xl font-bold text-orange-400 mb-1">Compilation Error</h2>
                    <p className="text-muted text-sm">Syntax error in your code.</p>
                  </motion.div>
                )}
                
                {submissionStatus === 'time_limit' && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                    <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-3xl mb-4 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                      ⏱️
                    </div>
                    <h2 className="text-2xl font-bold text-purple-400 mb-1">Time Limit Exceeded</h2>
                    <p className="text-muted text-sm">Code took too long to execute.</p>
                  </motion.div>
                )}
                
                {submissionStatus === 'runtime_error' && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                    <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center text-red-400 text-3xl mb-4 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                      💥
                    </div>
                    <h2 className="text-2xl font-bold text-red-400 mb-1">Runtime Error</h2>
                    <p className="text-muted text-sm">Program crashed during execution.</p>
                  </motion.div>
                )}
              </div>

              {/* Code Display Area */}
              <div className="p-6 bg-black/60 border-t border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted font-medium uppercase tracking-wider">Submitted Code ({language})</span>
                </div>
                <div className="bg-[#050508] border border-white/10 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <pre className="text-sm font-mono text-gray-300">
                    <code>{submittedCode}</code>
                  </pre>
                </div>
              </div>
              
              {/* Footer */}
              {submissionStatus !== 'pending' && (
                <div className="p-4 border-t border-white/10 flex justify-end">
                  <button onClick={() => setShowStatusModal(false)} className="neon-btn bg-white/5 hover:bg-white/10 text-white">
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </NeonLayout>
  );
}
