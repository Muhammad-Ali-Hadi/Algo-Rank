import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import NeonLayout from '../components/NeonLayout';

export default function ContestHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await api.getContestHistory();
        setHistory(data);
      } catch (err) {
        console.error('Failed to load contest history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <NeonLayout>
      <motion.div
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Contest <span className="neon-glow-text">History</span>
          </h1>
          <p className="text-muted text-sm mt-1">
            Track your performance across past competitions.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white/5 rounded-xl border border-border" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="neon-card p-12 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-medium text-foreground">No contest history yet</h3>
            <p className="text-muted text-sm mt-2 mb-6">
              Participate in some contests to see your rankings here!
            </p>
            <Link to="/contests" className="neon-btn-primary px-6 py-2">
              Browse Contests
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/contests/${item.id}`} className="block">
                  <div className="neon-card p-5 hover:border-primary/50 transition-colors group border border-white/[0.05]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                          {item.rank === '-' ? 'N/A' : `#${item.rank}`}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-xs text-muted flex items-center gap-1 mt-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            {new Date(item.endTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-widest text-muted mb-1">Status</div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${new Date(item.endTime) < new Date() ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                          {new Date(item.endTime) < new Date() ? 'Completed' : 'Ongoing'}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </NeonLayout>
  );
}
