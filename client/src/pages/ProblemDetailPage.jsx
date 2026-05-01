import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import NeonLayout from '../components/NeonLayout';
import { api } from '../services/api';
import DOMPurify from 'dompurify';
import { formatProblemDescription, retypeset } from '../utils/formatProblem';

export default function ProblemDetailPage() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchProblemData();
  }, [id]);

  useEffect(() => {
    if (problem && window.MathJax) {
      retypeset();
    }
  }, [problem, testCases]);

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

  const fetchProblemData = async () => {
    setLoading(true);
    try {
      const data = await api.getProblemById(id);
      setProblem(data.problem);
      setTestCases(data.testCases || []);
    } catch (err) {
      console.error('Failed to fetch problem:', err);
      setError('Failed to load problem details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <NeonLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-white/5 rounded w-1/2" />
          <div className="flex gap-4">
            <div className="h-6 bg-white/5 rounded w-24" />
            <div className="h-6 bg-white/5 rounded w-32" />
          </div>
          <div className="neon-card p-6 h-64 bg-white/5" />
        </div>
      </NeonLayout>
    );
  }

  if (error || !problem) {
    return (
      <NeonLayout>
        <div className="neon-empty">
          <div className="neon-empty-icon text-red-500">⚠️</div>
          <p className="text-lg font-medium text-foreground mb-2">{error || 'Problem not found'}</p>
          <Link to="/problems" className="text-primary hover:underline">
            ← Back to Problem Set
          </Link>
        </div>
      </NeonLayout>
    );
  }

  return (
    <NeonLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/problems" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Problem Set
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {problem.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`neon-badge capitalize ${
              problem.difficulty === 'easy' ? 'neon-badge-green' : 
              problem.difficulty === 'medium' ? 'neon-badge-yellow' : 'neon-badge-red'
            }`}>
              {problem.difficulty}
            </span>
            <span className="neon-badge neon-badge-blue flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Time Limit: {problem.time_limit} ms
            </span>
            <span className="neon-badge neon-badge-purple flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              Memory: {problem.memory_limit} MB
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Statement Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="neon-card p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2 border-b border-border pb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                Problem Statement
              </h2>
              
              <div 
                className="problem-body prose prose-invert prose-sm sm:prose-base max-w-none text-justify
                           prose-p:text-muted/90 prose-p:leading-relaxed
                           prose-headings:text-foreground prose-headings:font-semibold
                           prose-a:text-primary
                           prose-code:text-accent prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                           prose-pre:bg-[#0a0a0f] prose-pre:border prose-pre:border-white/10 prose-pre:text-muted"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(formatProblemDescription(problem.description), {
                    ADD_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'div', 'span', 'math', 'mi', 'mn', 'mo', 'sup', 'sub', 'center', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img', 'b', 'i', 'br', 'a', 'blockquote'],
                    ADD_ATTR: ['class', 'style', 'href', 'src', 'alt', 'width', 'height', 'align']
                  }) 
                }}
              />
            </div>
          </div>

          {/* Sidebar: Test Cases */}
          <div className="space-y-6">
            <div className="neon-card p-6">
              <h2 className="text-xl font-semibold text-primary mb-6 flex items-center gap-2 border-b border-border pb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                Sample Test Cases
              </h2>

              {testCases.length === 0 ? (
                <p className="text-muted text-sm italic">No sample test cases available.</p>
              ) : (
                <div className="space-y-6">
                  {testCases.map((tc, idx) => (
                    <div key={tc.id || idx} className="space-y-3">
                      <h3 className="text-sm font-medium text-foreground tracking-wide flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        Test Case {idx + 1}
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="relative group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-muted font-medium uppercase tracking-wider">Input</div>
                            <button
                              onClick={() => handleCopy(formatTestCase(tc.input), 'input', idx)}
                              className="text-xs text-primary hover:text-primary-focus transition-colors flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
                            >
                              {copied === `input-${idx}` ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <pre className="bg-[#0a0a0f]/80 border border-white/5 rounded-lg p-3 text-sm text-foreground/90 font-mono overflow-x-auto select-all">
                            {formatTestCase(tc.input)}
                          </pre>
                        </div>
                        <div className="relative group">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-muted font-medium uppercase tracking-wider">Output</div>
                            <button
                              onClick={() => handleCopy(formatTestCase(tc.expected_output), 'output', idx)}
                              className="text-xs text-primary hover:text-primary-focus transition-colors flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
                            >
                              {copied === `output-${idx}` ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <pre className="bg-[#0a0a0f]/80 border border-white/5 rounded-lg p-3 text-sm text-foreground/90 font-mono overflow-x-auto select-all">
                            {formatTestCase(tc.expected_output)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </NeonLayout>
  );
}
