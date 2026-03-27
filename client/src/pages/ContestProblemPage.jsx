import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import NeonLayout from '../components/NeonLayout';
import { api } from '../services/api';

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
  const [submissionType, setSubmissionType] = useState('code');
  const [code, setCode] = useState('');
  const [solutionUrl, setSolutionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState({ text: '', type: '' });
  
  const supportedLanguages = ['C++', 'Java', 'Python 3', 'JavaScript'];

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
        
        // Handle scraping directly
        if (targetProblem.scraped_content) {
          setContent({
            title: targetProblem.problem_title,
            statement: targetProblem.scraped_content,
            samples: targetProblem.scraped_samples || [],
          });
        } else if (targetProblem.problem_url) {
          fetchAndScrape(targetProblem.problem_url, targetProblem.id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load problem');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, problemId]);

  const fetchAndScrape = async (url, probId) => {
    setScraping(true);
    try {
      const data = await api.scrapeProblem(url, probId);
      setContent(data);
    } catch (err) {
      console.error('Failed to scrape:', err);
    } finally {
      setScraping(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submissionType === 'code' && !code.trim()) return setSubmitMsg({ text: 'Code cannot be empty', type: 'error' });
    if (submissionType === 'url' && !solutionUrl.trim()) return setSubmitMsg({ text: 'Solution URL cannot be empty', type: 'error' });

    setSubmitting(true);
    setSubmitMsg({ text: '', type: '' });

    try {
      await api.submitSolution(id, {
        problem_id: problemId,
        language,
        code_text: submissionType === 'code' ? code : '',
        solution_url: submissionType === 'url' ? solutionUrl : '',
      });
      
      setSubmitMsg({ text: 'Solution submitted successfully!', type: 'success' });
      setCode('');
      setSolutionUrl('');
    } catch (err) {
      setSubmitMsg({ text: err.message || 'Failed to submit', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <NeonLayout>
        <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
          <div className="h-6 bg-white/5 rounded w-1/3 mb-4" />
          <div className="h-96 bg-white/5 rounded w-full neon-card" />
        </div>
      </NeonLayout>
    );
  }

  if (error) {
    return (
      <NeonLayout>
        <div className="max-w-5xl mx-auto neon-card p-8 text-center">
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
        className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Left Side: Problem Statement */}
        <div className="lg:col-span-2 space-y-4">
          <Link to={`/contests/${id}`} className="text-muted text-sm hover:text-primary transition-colors inline-flex items-center gap-1 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Contest Setup
          </Link>
          
          <div className="neon-card neon-glow-border p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-3 text-foreground">
                <span className="w-10 h-10 rounded bg-primary/20 text-primary flex items-center justify-center font-bold shadow-lg">
                  {label}
                </span>
                {problem.problem_title}
              </h1>
              <a 
                href={problem.problem_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-white transition-colors"
              >
                Open Source ↗
              </a>
            </div>

            {scraping ? (
              <div className="py-10 text-center animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-3"></div>
                <div className="h-4 bg-white/10 rounded w-1/2 mx-auto"></div>
                <p className="text-sm text-primary mt-4">Scraping problem description...</p>
              </div>
            ) : content ? (
              <div className="prose prose-invert prose-blue max-w-none">
                <div dangerouslySetInnerHTML={{ __html: content.statement }} />

                {content.samples && content.samples.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-bold border-b border-white/10 pb-2">Examples</h3>
                    {content.samples.map((sample, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden">
                          <div className="bg-white/5 px-3 py-1.5 text-xs font-mono text-muted border-b border-white/10">Input</div>
                          <pre className="p-3 m-0 text-sm font-mono whitespace-pre-wrap">{sample.input}</pre>
                        </div>
                        <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden">
                          <div className="bg-white/5 px-3 py-1.5 text-xs font-mono text-muted border-b border-white/10">Output</div>
                          <pre className="p-3 m-0 text-sm font-mono whitespace-pre-wrap text-primary/90">{sample.output}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-muted">No content could be loaded for this problem.</div>
            )}
          </div>
        </div>

        {/* Right Side: Submission Panel */}
        <div className="lg:col-span-1 space-y-6 lg:mt-12">
          {canSubmit ? (
            <div className="neon-card p-6 sticky top-24">
              <h2 className="text-lg font-bold text-foreground mb-4 pr-2">Submit Solution</h2>
              
              {submitMsg.text && (
                <div className={`p-3 mb-4 rounded border text-sm ${submitMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                  {submitMsg.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="neon-label text-xs">Language</label>
                  <select 
                    className="neon-select text-sm py-2"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {supportedLanguages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="neon-label text-xs mb-2 block">Upload Method</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setSubmissionType('code')}
                      className={`flex-1 py-1.5 text-xs rounded border transition-colors ${submissionType === 'code' ? 'bg-primary/20 border-primary text-primary' : 'bg-black/30 border-white/10 text-muted'}`}
                    >
                      Paste Code
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSubmissionType('url')}
                      className={`flex-1 py-1.5 text-xs rounded border transition-colors ${submissionType === 'url' ? 'bg-primary/20 border-primary text-primary' : 'bg-black/30 border-white/10 text-muted'}`}
                    >
                      Code URL
                    </button>
                  </div>
                </div>

                {submissionType === 'code' ? (
                  <div>
                    <textarea
                      className="neon-textarea font-mono text-xs leading-relaxed h-64 bg-black/80 p-3"
                      placeholder={`// Paste your ${language} code...`}
                      spellCheck="false"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      className="neon-input text-sm py-2"
                      placeholder="https://..."
                      value={solutionUrl}
                      onChange={(e) => setSolutionUrl(e.target.value)}
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="neon-btn neon-btn-primary w-full py-2.5 mt-2"
                >
                  {submitting ? 'Sending...' : 'Submit'}
                </button>
              </form>
            </div>
          ) : (
             <div className="neon-card p-6 bg-white/[0.02] border-dashed">
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
    </NeonLayout>
  );
}
