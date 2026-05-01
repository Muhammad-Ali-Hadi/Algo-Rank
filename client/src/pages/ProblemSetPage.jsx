import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import NeonLayout from '../components/NeonLayout';
import { api } from '../services/api';

export default function ProblemSetPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchProblems(page);
  }, [page]);

  const fetchProblems = async (currentPage) => {
    setLoading(true);
    try {
      const data = await api.getProblems(currentPage, limit);
      setProblems(data.problems || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const difficultyColors = {
    easy: 'neon-badge-green',
    medium: 'neon-badge-yellow',
    hard: 'neon-badge-red'
  };

  return (
    <NeonLayout>
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            <span className="neon-glow-text">Problem Set</span>
          </h1>
          <p className="text-muted text-sm mt-1">Browse and practice algorithmic challenges</p>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="neon-card p-4 animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 bg-white/5 rounded w-1/3" />
                <div className="h-5 bg-white/5 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : problems.length === 0 ? (
        <motion.div
          className="neon-empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="neon-empty-icon">📝</div>
          <p className="text-lg font-medium text-foreground mb-2">No Problems Found</p>
          <p className="text-muted text-sm">Check back later for new challenges.</p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {problems.map((problem, i) => (
            <motion.div
              key={problem.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link to={`/problems/${problem.id}`} className="block">
                <div className="neon-card p-4 hover:bg-white/[0.03] transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  <div className="flex items-center gap-4">
                    <span className="text-muted/50 font-mono text-sm w-6 text-right">
                      {(page - 1) * limit + i + 1}.
                    </span>
                    <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                      {problem.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 pl-10 sm:pl-0">
                    <span className={`neon-badge ${difficultyColors[problem.difficulty] || 'neon-badge-blue'} capitalize text-xs px-2 py-0.5`}>
                      {problem.difficulty}
                    </span>
                    <svg className="w-5 h-5 text-muted opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 pt-4">
              <button
                className="neon-btn px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Previous
              </button>
              <span className="text-muted text-sm font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                className="neon-btn px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </motion.div>
      )}
    </NeonLayout>
  );
}
