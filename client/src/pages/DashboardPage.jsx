import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import { DashboardSkeleton } from '../components/SkeletonLoader';

function StatCard({ label, value, color, delay }) {
  return (
    <motion.div
      className="glass rounded-xl p-5 hover:border-primary/30 transition-colors"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -2 }}
    >
      <p className="text-muted text-sm mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <>
        <Navbar />
        <DashboardSkeleton />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Welcome back, {profile.name?.split(' ')[0] || 'Coder'} 👋
                </h1>
                <p className="text-muted mt-1">
                  Ready to solve some problems today?
                </p>
              </div>
              <motion.button
                className="px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm
                           hover:bg-accent/80 transition-colors flex items-center gap-2 w-fit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start Practice
              </motion.button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Problems Solved" value="0" color="text-green-400" delay={0.1} />
            <StatCard label="Current Streak" value="0" color="text-primary" delay={0.2} />
            <StatCard label="Contests Joined" value="0" color="text-purple-400" delay={0.3} />
            <StatCard label="Global Rank" value="—" color="text-yellow-400" delay={0.4} />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <motion.div
              className="lg:col-span-2 glass rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Recent Activity
              </h2>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-muted text-sm">No activity yet</p>
                <p className="text-muted/60 text-xs mt-1">Solve your first problem to get started!</p>
              </div>
            </motion.div>

            {/* Profile Card */}
            <motion.div
              className="glass rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">Profile</h2>
              <div className="flex flex-col items-center text-center space-y-4">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full ring-2 ring-primary/30"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {profile.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{profile.name || 'User'}</p>
                  {profile.username && (
                    <p className="text-sm text-primary">@{profile.username}</p>
                  )}
                  <p className="text-sm text-muted">{profile.email}</p>
                </div>
                <div className="w-full pt-4 border-t border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Username</span>
                    <span className="text-foreground">@{profile.username || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Member since</span>
                    <span className="text-foreground">
                      {new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {[
              {
                title: 'Problem Archive',
                desc: 'Browse problems from multiple judges',
                icon: '📚',
                color: 'from-blue-500/10 to-blue-600/5',
              },
              {
                title: 'Contests',
                desc: 'Join live and virtual contests',
                icon: '🏆',
                color: 'from-purple-500/10 to-purple-600/5',
              },
              {
                title: 'Leaderboard',
                desc: 'View global rankings',
                icon: '📊',
                color: 'from-green-500/10 to-green-600/5',
              },
            ].map((item, i) => (
              <motion.button
                key={item.title}
                className={`glass rounded-xl p-5 text-left bg-gradient-to-br ${item.color}
                           hover:border-primary/30 transition-all group`}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl mb-2 block">{item.icon}</span>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted mt-1">{item.desc}</p>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
