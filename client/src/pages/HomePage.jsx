import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import CodeBackground from '../animations/CodeBackground';
import GridBackground from '../animations/GridBackground';
import ParticleField from '../animations/ParticleField';
import LoginCard from '../components/LoginCard';
import { LoginSkeleton } from '../components/SkeletonLoader';

export default function HomePage() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <>
        <GridBackground />
        <LoginSkeleton />
      </>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Backgrounds */}
      <GridBackground />
      <CodeBackground />
      <ParticleField />

      {/* Gradient overlays */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Hero text above card (large screens) */}
        <motion.div
          className="hidden lg:block text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight mb-4">
            <span className="text-foreground">Master </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Algorithms
            </span>
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto">
            The modern competitive programming platform. Practice problems from
            multiple judges, compete in contests, and climb the ranks.
          </p>
        </motion.div>

        {/* Login Card */}
        <LoginCard />

        {/* Feature badges */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {['Multi-Judge', 'Live Contests', 'Rankings', 'Problem Archive'].map(
            (feature, i) => (
              <motion.span
                key={feature}
                className="px-3 py-1.5 rounded-full text-xs font-medium
                           bg-white/[0.03] border border-border text-muted"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.1 }}
              >
                {feature}
              </motion.span>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
}
