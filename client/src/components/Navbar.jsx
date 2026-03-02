import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Logo from './Logo';

export default function Navbar() {
  const { user: profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border"
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo size="sm" />

          {/* Right side */}
          <div className="flex items-center gap-4">
            {profile && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg
                             hover:bg-white/[0.05] transition-colors"
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="w-8 h-8 rounded-full ring-2 ring-border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm font-medium">
                      {profile.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="hidden sm:block text-sm text-foreground font-medium">
                    {profile.name || 'User'}
                  </span>
                  <svg
                    className={`w-4 h-4 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <motion.div
                    className="absolute right-0 mt-2 w-56 glass-strong rounded-xl border border-border shadow-2xl overflow-hidden"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground truncate">
                        {profile.name}
                      </p>
                      <p className="text-xs text-muted truncate">{profile.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400
                                   hover:bg-red-500/10 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
