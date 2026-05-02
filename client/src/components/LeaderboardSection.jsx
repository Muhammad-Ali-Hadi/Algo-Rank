import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import ViewSubmissionModal from './ViewSubmissionModal';

export default function LeaderboardSection({ contestId, problemsCount, isParticipant, isCreator, contestEnded, currentUserId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [frozen, setFrozen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const handleDisqualify = async (userId) => {
    try {
      await api.disqualifyParticipant(contestId, userId);
      fetchLeaderboard();
    } catch (err) {
      alert(err.message || 'Failed to disqualify');
    }
  };

  // Determine whether a given row's submission is viewable by the current user
  const canViewSubmission = (rowUserId) => {
    if (isCreator) return true;        // Owner can always view
    if (contestEnded) return true;     // Post-contest: open-source to all
    if (String(rowUserId) === String(currentUserId)) return true; // Own submission
    return false;
  };

  const handleCellClick = (submissionId, rowUserId) => {
    if (!submissionId) return;
    if (!canViewSubmission(rowUserId)) return;
    setSelectedSubmission(submissionId);
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard(contestId);
      setLeaderboard(data.leaderboard || []);
      setFrozen(data.frozen);
      setError('');
    } catch (err) {
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Poll every 5s if participant
    let interval;
    if (isParticipant) {
      interval = setInterval(fetchLeaderboard, 5000);
    }
    return () => clearInterval(interval);
  }, [contestId, isParticipant]);

  if (loading) {
    return (
      <div className="neon-card p-6 animate-pulse">
        <div className="h-6 bg-white/5 rounded w-1/4 mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="neon-card p-6 text-center text-red-400">
        <p>{error}</p>
        <button onClick={fetchLeaderboard} className="neon-btn mt-4 text-xs">Try Again</button>
      </div>
    );
  }

  // Generate problem columns (A, B, C...)
  const problemLetters = Array.from({ length: problemsCount }, (_, i) => String.fromCharCode(65 + i));

  return (
    <motion.div
      className="neon-card p-6 overflow-hidden relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>🏆</span> Leaderboard
        </h2>

        <div className="flex items-center gap-3">
          {frozen && (
            <span className="neon-badge neon-badge-blue flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Frozen
            </span>
          )}
          <button
            onClick={fetchLeaderboard}
            className="text-muted hover:text-primary transition-colors p-1"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-muted uppercase bg-black/40 border-y border-white/10">
            <tr>
              <th className="px-4 py-3 w-16 text-center">Rank</th>
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3 text-center">Solved</th>
              <th className="px-4 py-3 text-center">Penalty</th>
              {problemLetters.map((p, i) => (
                <th key={i} className="px-4 py-3 text-center text-primary">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan={4 + problemsCount} className="px-4 py-8 text-center text-muted">
                  No submissions yet. Be the first!
                </td>
              </tr>
            ) : (
              leaderboard.map((row) => (
                <tr key={row.user_id} className={`hover:bg-white/[0.02] transition-colors ${row.is_disqualified ? 'opacity-50 grayscale' : ''}`}>
                  <td className="px-4 py-3 text-center font-mono">
                    {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    {row.user?.avatar_url ? (
                      <img src={row.user.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-[10px] text-white">
                        {row.user?.name?.charAt(0).toUpperCase() || row.user?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className={`font-medium text-sm ${row.is_disqualified ? 'text-red-400 line-through' : 'text-foreground'}`}>{row.user?.name || row.user?.username || 'Unknown User'}</span>
                      {row.user?.username && <span className="text-[10px] text-muted -mt-0.5">@{row.user.username}</span>}
                    </div>
                    {isCreator && (
                      <button 
                        onClick={() => handleDisqualify(row.user_id)}
                        className={`ml-auto px-2 py-0.5 text-[10px] rounded border ${row.is_disqualified ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'} hover:opacity-80 transition-opacity`}
                        title={row.is_disqualified ? "Restore Participant" : "Disqualify Participant"}
                      >
                        {row.is_disqualified ? 'Restore' : 'Disqualify'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-green-400">{row.solved}</td>
                  <td className="px-4 py-3 text-center font-mono text-muted">{row.penalty}</td>

                  {problemLetters.map((_, i) => {
                    const status = row.problems[`p${i}`];
                    if (!status) {
                      return <td key={i} className="px-4 py-3 text-center border-l border-white/5"><span className="text-muted/30">-</span></td>;
                    }

                    const viewable = canViewSubmission(row.user_id);
                    let bgClass = '';
                    let content = null;

                    if (status.status === 'accepted') {
                      bgClass = status.isFirstBlood ? 'bg-green-500/15 text-green-400' : 'bg-green-900 border border-green-700 font-bold text-green-100 shadow-[inset_0_0_15px_rgba(0,255,0,0.15)]';
                      content = (
                        <div className="leading-tight flex flex-col items-center justify-center">
                          {status.attempts > 1 && <span className="text-sm font-semibold">-{status.attempts - 1}</span>}
                          <span className="text-[10px] opacity-80">
                            {status.solveTimeSeconds !== undefined
                              ? `${Math.floor(status.solveTimeSeconds / 60)}:${(status.solveTimeSeconds % 60).toString().padStart(2, '0')}`
                              : `${status.solveTime}m`}
                          </span>
                        </div>
                      );
                    } else if (status.status === 'frozen') {
                      bgClass = 'bg-blue-500/30 text-blue-300 border border-blue-500/30';
                      content = (
                        <div className="leading-tight tooltip hover:cursor-help" title={`Frozen after ${status.attempts} attempts`}>
                          <span className="text-xl font-bold neon-glow-text" style={{ textShadow: '0 0 10px rgba(59,130,246,0.8)' }}>-</span>
                          {status.attempts > 0 && <span className="text-[10px] block opacity-80 mt-1">+{status.attempts}</span>}
                        </div>
                      );
                    } else if (status.status === 'pending') {
                      bgClass = 'bg-yellow-500/20 text-yellow-400';
                      content = <span className="text-xs">Pending</span>;
                    } else {
                      bgClass = 'bg-red-500/20 text-red-400';
                      content = <span className="text-sm">-{status.attempts}</span>;
                    }

                    return (
                      <td 
                        key={i} 
                        onClick={() => status.submission_id && handleCellClick(status.submission_id, row.user_id)}
                        className={`px-2 py-1 text-center border-l border-white/5 align-middle ${viewable && status.submission_id ? 'cursor-pointer hover:bg-white/10 transition-colors' : 'cursor-default'} ${bgClass}`}
                        title={viewable ? 'Click to view submission' : (contestEnded ? '' : 'Available after the contest ends')}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {frozen && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs rounded-lg flex items-center justify-center gap-2">
          <span>❄️</span> Scoreboard is frozen. Submissions made after the freeze time are hidden.
        </div>
      )}

      <ViewSubmissionModal 
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        contestId={contestId}
        submissionId={selectedSubmission}
      />
    </motion.div>
  );
}
