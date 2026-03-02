import { motion } from 'framer-motion';

export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { icon: 28, text: 'text-lg' },
    md: { icon: 36, text: 'text-2xl' },
    lg: { icon: 48, text: 'text-4xl' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="20" fill="#0D1117" />
          <path
            d="M25 70L45 30L55 50L75 30"
            stroke="#58A6FF"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="75" cy="30" r="6" fill="#1F6FEB" />
          <path
            d="M30 75H70"
            stroke="#1F6FEB"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <motion.div
          className="absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: [
              '0 0 10px rgba(88, 166, 255, 0.0)',
              '0 0 20px rgba(88, 166, 255, 0.2)',
              '0 0 10px rgba(88, 166, 255, 0.0)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
      <span className={`font-bold ${s.text} tracking-tight`}>
        <span className="text-foreground">Algo</span>
        <span className="text-primary">Rank</span>
      </span>
    </motion.div>
  );
}
