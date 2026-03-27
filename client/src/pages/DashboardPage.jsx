import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import NeonLayout from '../components/NeonLayout';
import CinematicScrollIntro from '../components/CinematicScrollIntro';

export default function DashboardPage() {
  const { user: profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <NeonLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/5 rounded w-1/3" />
          <div className="h-4 bg-white/5 rounded w-1/2" />
        </div>
      </NeonLayout>
    );
  }

  const quickActions = [
    {
      title: 'Browse Contests',
      description: 'View active and upcoming competitions',
      icon: '🏆',
      link: '/contests',
    },
    {
      title: 'Create Contest',
      description: 'Start a new contest or practice duel',
      icon: '⚡',
      link: '/contests/create',
    },
  ];

  return (
    <CinematicScrollIntro userName={profile.name || profile.username}>
      <NeonLayout>
        {/* Welcome Section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, <span className="neon-glow-text">{profile.name || profile.username}</span>
          </h1>
          <p className="text-muted text-sm mt-1">
            Ready to solve some problems? Check out the latest contests.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <Link to={action.link} className="block">
                <div className="neon-card p-6 cursor-pointer group">
                  <div className="text-3xl mb-3">{action.icon}</div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-muted text-sm mt-1">{action.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </NeonLayout>
    </CinematicScrollIntro>
  );
}
