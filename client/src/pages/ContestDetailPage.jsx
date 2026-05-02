import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import NeonLayout from '../components/NeonLayout';
import LeaderboardSection from '../components/LeaderboardSection';
import { api } from '../services/api';

function getContestStatus(contest, currentTime = new Date()) {
  const start = new Date(contest.start_time);
  const end = contest.end_time ? new Date(contest.end_time) : null;

  if (currentTime < start) return 'upcoming';
  if (end && currentTime > end) return 'ended';
  return 'live';
}

function formatTimeLeft(targetDate, now) {
  const diff = Math.max(0, new Date(targetDate) - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(seconds) {
  if (!seconds) return 'Unlimited';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function ContestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: profile } = useAuth();
  
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [participants, setParticipants] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('problems');
  const [now, setNow] = useState(new Date());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date(Date.now() + serverTimeOffset)), 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  useEffect(() => {
    fetchContest();
  }, [id]);

  // Auto-refresh effect for state transitions
  useEffect(() => {
    if (!contest) return;
    const currentStatus = getContestStatus(contest, now);
    const prevStatus = getContestStatus(contest, new Date(now.getTime() - 1000));
    
    // Trigger refresh when passing a time boundary
    if (currentStatus !== prevStatus) {
      fetchContest();
    }
  }, [now, contest]);

  const fetchContest = async () => {
    try {
      const data = await api.getContestById(id);
      setContest(data.contest);
      setProblems(data.problems || []);
      setParticipants(data.participants || []);
      if (data.server_time) {
        setServerTimeOffset(new Date(data.server_time).getTime() - Date.now());
      }
    } catch (err) {
      setError(err.message || 'Failed to load contest');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    setJoinMsg('');

    try {
      await api.joinContest(id);
      setJoinMsg('Joined successfully!');
      fetchContest();
    } catch (err) {
      setJoinMsg(err.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contest?')) return;
    try {
      await api.deleteContest(id);
      navigate('/contests');
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <NeonLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="neon-card p-8 animate-pulse">
            <div className="h-6 bg-white/5 rounded w-1/2 mb-4" />
            <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
          </div>
        </div>
      </NeonLayout>
    );
  }

  if (error) {
    return (
      <NeonLayout>
        <div className="max-w-4xl mx-auto">
          <div className="neon-card p-8 text-center">
            <p className="text-red-400 text-lg">{error}</p>
            <Link to="/contests" className="neon-btn mt-4 inline-block">
              ← Back to Contests
            </Link>
          </div>
        </div>
      </NeonLayout>
    );
  }

  const status = getContestStatus(contest, now);
  const isParticipant = participants.some(p => p.user_id === profile?.id);
  const isCreatorOrAdmin = profile?.isAdmin || contest.creator_id === profile?.id;

  const statusStyles = {
    upcoming: { badge: 'neon-badge-blue', label: 'Upcoming' },
    live: { badge: 'neon-badge-green', label: '● Live' },
    ended: { badge: 'neon-badge-red', label: 'Ended' },
  };

  return (
    <NeonLayout>
      <motion.div
        className="max-w-5xl mx-auto space-y-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Top Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/contests" className="text-muted text-sm hover:text-primary transition-colors inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          
          {isCreatorOrAdmin && (
            <div className="flex gap-2">
              <Link to={`/contests/${id}/edit`} className="neon-btn text-xs px-3 py-1.5 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                Edit
              </Link>
              <button onClick={handleDelete} className="neon-btn neon-btn-danger text-xs px-3 py-1.5 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Contest Header */}
        <div className="neon-card neon-glow-border p-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-foreground">{contest.name}</h1>
                <span className={`neon-badge ${statusStyles[status].badge}`}>
                  {statusStyles[status].label}
                </span>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-4">
                <span className={`neon-badge ${contest.type === 'global' ? 'neon-badge-purple' : 'neon-badge-blue'}`}>
                  {contest.type === 'global' ? '🌐 Global' : '🏠 Local'}
                </span>
                <span className={`neon-badge ${contest.visibility === 'private' ? 'neon-badge-yellow' : 'neon-badge-green'}`}>
                  {contest.visibility === 'private' ? '🔒 Private' : '🌍 Public'}
                </span>
              </div>
              {contest.description && (
                <p className="text-muted text-sm max-w-2xl mx-auto sm:mx-0">{contest.description}</p>
              )}
            </div>

            {/* Join button & Status Timer */}
            <div className="flex flex-col items-center sm:items-end gap-4 shrink-0 bg-white/[0.02] p-4 rounded-xl border border-white/5 w-full sm:w-auto">
              {status === 'upcoming' && (
                <div className="text-center sm:text-right w-full">
                  <p className="text-xs text-muted font-bold uppercase tracking-widest mb-1 text-primary">Starts In</p>
                  <p className="text-3xl font-mono text-white font-bold tracking-tight bg-gradient-to-r from-blue-400 to-primary bg-clip-text text-transparent">{formatTimeLeft(contest.start_time, now)}</p>
                </div>
              )}
              {status === 'live' && contest.end_time && (
                <div className="text-center sm:text-right w-full">
                  <p className="text-xs text-muted font-bold uppercase tracking-widest mb-1 text-green-400">Ends In</p>
                  <p className="text-3xl font-mono text-white font-bold tracking-tight bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{formatTimeLeft(contest.end_time, now)}</p>
                </div>
              )}

              <div className="w-full flex justify-center sm:justify-end">
                {!isParticipant && !isCreatorOrAdmin && status !== 'ended' && (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="neon-btn neon-btn-primary shrink-0 w-full sm:w-auto"
                  >
                    {joining ? 'Joining...' : 'Join Contest'}
                  </button>
                )}
                {isParticipant && (
                  <span className="neon-badge neon-badge-green font-bold text-sm px-4 py-1.5">✓ Joined</span>
                )}
              </div>
              
              {joinMsg && (
                <p className={`text-xs w-full text-center sm:text-right ${joinMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                  {joinMsg}
                </p>
              )}
            </div>
          </div>

          <div className="neon-divider my-6" />

          {/* Contest Info Elements */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center sm:text-left">
            <div>
              <p className="text-[10px] text-muted uppercase tracking-widest mb-1 font-semibold">Start</p>
              <p className="text-sm font-medium text-white">{formatDate(contest.start_time)}</p>
            </div>
            {contest.end_time && (
              <div>
                <p className="text-[10px] text-muted uppercase tracking-widest mb-1 font-semibold">End</p>
                <p className="text-sm font-medium text-white">{formatDate(contest.end_time)}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted uppercase tracking-widest mb-1 font-semibold">Duration</p>
              <p className="text-sm font-medium text-white">{formatDuration(contest.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-widest mb-1 font-semibold">Participants</p>
              <p className="text-sm font-medium text-white">{participants.length}</p>
            </div>
          </div>

          {/* Invite Code */}
          {isCreatorOrAdmin && contest.invite_code && (
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs text-yellow-500/80 uppercase tracking-widest mb-1 font-bold">Invite Code</p>
                <p className="text-2xl font-mono text-yellow-400 tracking-widest">{contest.invite_code}</p>
              </div>
              <p className="text-xs text-muted max-w-xs text-center sm:text-right">Share this code with participants to allow them to bypass the privacy lock.</p>
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-white/10 gap-8 overflow-x-auto scrollbar-hide px-2">
          {['problems', 'leaderboard', 'participants'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap relative ${activeTab === tab ? 'text-primary' : 'text-muted hover:text-white'}`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_0_10px_rgba(88,166,255,1)]"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="pt-2 min-h-[400px]">
          {activeTab === 'problems' && (
            <motion.div
              key="problems"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span>📝</span> Problem Set
                </h2>
                <span className="text-xs text-muted bg-white/5 px-2 py-1 rounded">{problems.length} total</span>
              </div>

              {problems.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
                  <p className="text-muted text-sm">No problems added to this contest yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {problems.map((problem, i) => (
                    <Link 
                      key={problem.id}
                      to={`/contests/${id}/problem/${problem.id}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.08] hover:border-primary/50 hover:bg-white/[0.05] transition-all group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shadow-lg text-lg border border-primary/20 group-hover:bg-primary/20 transition-colors">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">{problem.problem_title}</p>
                          <p className="text-xs text-primary/60 mt-1 flex items-center gap-1">
                            Solve Problem →
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'participants' && (
            <motion.div
              key="participants"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4 mt-2">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span>👥</span> Participants List
                </h2>
                <span className="text-xs text-muted bg-white/5 px-2 py-1 rounded">{participants.length} registered</span>
              </div>

              {participants.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
                  <p className="text-muted text-sm">No participants yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {participants.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors">
                      {p.user?.avatar_url ? (
                        <img src={p.user.avatar_url} alt="" className="w-10 h-10 rounded-full ring-2 ring-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center text-white text-sm font-medium border border-accent/50">
                          {p.user?.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{p.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-primary truncate">@{p.user?.username || 'unknown'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <LeaderboardSection 
                contestId={id} 
                isCreator={isCreatorOrAdmin} 
                isParticipant={isParticipant}
                problemsCount={problems.length}
              />
            </motion.div>
          )}
        </div>
      </motion.div>
    </NeonLayout>
  );
}
