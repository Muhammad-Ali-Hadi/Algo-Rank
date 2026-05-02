import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ContestsPage() {
  const { user: profile } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
      const data = await api.getContests();
      setContests(data.contests || []);
    } catch (err) {
      console.error('Failed to fetch contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');

    try {
      await api.joinByInviteCode(inviteCode);
      setInviteSuccess('Joined successfully!');
      setInviteCode('');
      fetchContests();
    } catch (err) {
      setInviteError(err.message || 'Failed to join');
    }
  };

  const handleDeleteContest = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this contest?')) {
      return;
    }

    try {
      await api.deleteContest(id);
      setContests(contests.filter(c => c.id !== id && c.invite_code !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete contest');
    }
  };

  const handleEditClick = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/contests/${id}/edit`);
  };

  const statusConfig = {
    upcoming: { badge: 'neon-badge-blue', label: 'Upcoming' },
    live: { badge: 'neon-badge-green', label: '● Live' },
    ended: { badge: 'neon-badge-red', label: 'Ended' },
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
            <span className="neon-glow-text">Contests</span>
          </h1>
          <p className="text-muted text-sm mt-1">Compete, practice, and rank up</p>
        </div>
        <Link
          to="/contests/create"
          className="neon-btn neon-btn-primary inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Contest
        </Link>
      </motion.div>

      <motion.div
        className="neon-card p-4 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <form onSubmit={handleJoinByInvite} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="neon-label">Join Private Contest</label>
            <input
              type="text"
              className="neon-input"
              placeholder="Enter invite code..."
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>
          <button type="submit" className="neon-btn whitespace-nowrap">
            Join
          </button>
        </form>
        {inviteError && <p className="text-red-400 text-sm mt-2">{inviteError}</p>}
        {inviteSuccess && <p className="text-green-400 text-sm mt-2">{inviteSuccess}</p>}
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="neon-card p-6 animate-pulse">
              <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : contests.length === 0 ? (
        <motion.div
          className="neon-empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="neon-empty-icon">🏆</div>
          <p className="text-lg font-medium text-foreground mb-2">No Contests Yet</p>
          <p className="text-muted text-sm">Create the first contest to get started!</p>
        </motion.div>
      ) : (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {contests.map((contest, i) => {
            const status = getContestStatus(contest);
            const config = statusConfig[status];
            const participantCount = contest.contest_participants?.[0]?.count || 0;
            const isCreatorOrAdmin = profile?.isAdmin || profile?.id === contest.creator_id;

            return (
              <motion.div
                key={contest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <Link to={`/contests/${contest.invite_code || contest.id}`} className="block">
                  <div className="neon-card p-6 cursor-pointer relative group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-20">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {contest.name}
                          </h3>
                          <span className={`neon-badge ${config.badge}`}>
                            {config.label}
                          </span>
                          <span className={`neon-badge ${contest.type === 'global' ? 'neon-badge-purple' : 'neon-badge-blue'}`}>
                            {contest.type}
                          </span>
                          {contest.visibility === 'private' && (
                            <span className="neon-badge neon-badge-yellow">Private</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted">
                          <span>📅 {formatDate(contest.start_time)}</span>
                          {contest.end_time && (
                            <span>→ {formatDate(contest.end_time)}</span>
                          )}
                          <span>👥 {participantCount} participants</span>
                        </div>
                      </div>
                      
                    </div>
                    
                    {/* Actions and Chevron */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                      {isCreatorOrAdmin && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-1.5 rounded-md hover:bg-white/10 text-muted hover:text-primary transition-colors"
                            onClick={(e) => handleEditClick(e, contest.invite_code || contest.id)}
                            title="Edit Contest"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                          </button>
                          <button 
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                            onClick={(e) => handleDeleteContest(e, contest.invite_code || contest.id)}
                            title="Delete Contest"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      )}
                      
                      <svg className="w-5 h-5 text-muted shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </NeonLayout>
  );
}
