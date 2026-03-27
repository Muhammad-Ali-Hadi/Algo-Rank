import { useAuth } from '../hooks/useAuth';
import Navbar from './Navbar';

export default function NeonLayout({ children }) {
  const { user: profile } = useAuth();

  return (
    <div className={profile ? 'neon-theme min-h-[100vh] flex flex-col relative overflow-hidden' : ''}>
      {/* Subtle background glow */}
      {profile && <div className="neon-bg-glow" />}

      <Navbar />

      {/* Main content area wrapped in PS5 border container if logged in */}
      {profile ? (
        <main className="relative flex-1 z-10 pt-24 px-4 sm:px-6 lg:px-8 max-w-[1400px] w-full mx-auto pb-12">
          <div className="ps5-border-container p-[1px] md:p-1 mb-8">
            <div className="bg-black backdrop-blur-md rounded-[14px] p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-160px)] shadow-[inset_0_0_20px_rgba(31,111,235,0.05)]">
              {children}
            </div>
          </div>
        </main>
      ) : (
        <main className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12">
          {children}
        </main>
      )}
    </div>
  );
}
