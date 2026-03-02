import { motion } from 'framer-motion';

function SkeletonPulse({ className = '' }) {
  return (
    <div className={`relative overflow-hidden bg-white/[0.04] rounded ${className}`}>
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(88, 166, 255, 0.04), transparent)',
        }}
        animate={{ translateX: ['-100%', '100%'] }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <motion.div
      className="flex items-center gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <SkeletonPulse className="w-12 h-12 rounded-full" />
      <div className="space-y-2">
        <SkeletonPulse className="h-4 w-32 rounded" />
        <SkeletonPulse className="h-3 w-48 rounded" />
      </div>
    </motion.div>
  );
}

export function CardSkeleton() {
  return (
    <motion.div
      className="glass rounded-xl p-6 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <SkeletonPulse className="h-5 w-1/3 rounded" />
      <SkeletonPulse className="h-4 w-full rounded" />
      <SkeletonPulse className="h-4 w-2/3 rounded" />
      <div className="flex gap-3 pt-2">
        <SkeletonPulse className="h-8 w-20 rounded-lg" />
        <SkeletonPulse className="h-8 w-20 rounded-lg" />
      </div>
    </motion.div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonPulse className="h-8 w-64 rounded" />
            <SkeletonPulse className="h-4 w-96 rounded" />
          </div>
          <SkeletonPulse className="h-10 w-32 rounded-lg" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={i}
              className="glass rounded-xl p-5 space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <SkeletonPulse className="h-4 w-20 rounded" />
              <SkeletonPulse className="h-8 w-16 rounded" />
              <SkeletonPulse className="h-2 w-full rounded-full" />
            </motion.div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        className="w-full max-w-md glass-strong rounded-2xl p-8 sm:p-10 space-y-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex justify-center">
          <SkeletonPulse className="h-12 w-48 rounded" />
        </div>
        <SkeletonPulse className="h-4 w-48 mx-auto rounded" />
        <SkeletonPulse className="h-[1px] w-full" />
        <SkeletonPulse className="h-12 w-full rounded-xl" />
        <SkeletonPulse className="h-3 w-64 mx-auto rounded" />
      </motion.div>
    </div>
  );
}

export default SkeletonPulse;
