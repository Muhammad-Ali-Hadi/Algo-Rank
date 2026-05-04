import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import Logo from '../components/Logo';
import GridBackground from '../animations/GridBackground';

export default function VerificationPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Use email from state or location or current user
  const email = location.state?.email || user?.email;

  useEffect(() => {
    if (!email) {
      navigate('/dashboard');
    }
    if (user?.isVerified) {
      navigate('/dashboard');
    }
  }, [email, user, navigate]);

  // Automatically send OTP when landing on this page for the first time
  useEffect(() => {
    const autoSendOtp = async () => {
      // Check if we already auto-sent in this session to avoid spamming
      const hasAutoSent = sessionStorage.getItem(`otp_sent_${email}`);
      
      if (email && !user?.isVerified && !hasAutoSent) {
        try {
          // Mark as sent before the call to prevent race conditions if effect re-runs
          sessionStorage.setItem(`otp_sent_${email}`, 'true');
          
          // If they just came from signup, we might want to clear state
          if (location.state?.email) {
            window.history.replaceState({}, document.title);
          }
          
          await api.resendVerification(email);
          console.log('Verification OTP sent automatically');
        } catch (err) {
          console.warn('Auto-OTP sending may have encountered an issue:', err);
          // Optional: clear the flag so they can try again if they refresh
          // sessionStorage.removeItem(`otp_sent_${email}`);
        }
      }
    };
    autoSendOtp();
  }, [email, user?.isVerified, location.state?.email]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyEmail(otp, email);
      setSuccess(res.message);
      
      // Update local user state and token
      if (res.token && res.user) {
        updateUser(res.user, res.token);
      } else if (user) {
        updateUser({ isVerified: true });
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.resendVerification(email);
      setSuccess(res.message);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <GridBackground />
      
      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl opacity-50" />
        
        <div className="relative glass-strong rounded-2xl p-8 space-y-6">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Verify your Email</h1>
            <p className="text-sm text-muted">
              We sent a 6-digit code to <span className="text-primary font-medium">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs text-muted uppercase tracking-widest font-bold ml-1">
                Verification Code
              </label>
              <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-4 py-4 rounded-xl bg-white/[0.04] border border-border
                           text-center text-2xl font-mono tracking-[0.5em] text-foreground 
                           placeholder:text-muted/20 focus:outline-none focus:border-primary/50 
                           transition-all"
                required
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <p className="text-red-400 text-xs font-medium">{error}</p>
                </motion.div>
              )}
              {success && (
                <motion.div
                  className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-green-400 text-xs font-medium">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full neon-btn neon-btn-primary py-4 font-bold tracking-wider"
            >
              {loading ? 'VERIFYING...' : 'VERIFY EMAIL'}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-border/50">
            <p className="text-xs text-muted">
              Didn't receive the code?{' '}
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-primary hover:underline font-bold disabled:opacity-50"
              >
                {resending ? 'RESENDING...' : 'RESEND CODE'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
