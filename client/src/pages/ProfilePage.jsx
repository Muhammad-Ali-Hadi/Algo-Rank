import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import NeonLayout from '../components/NeonLayout';
import { api } from '../services/api';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successPopup, setSuccessPopup] = useState({
    show: false,
    message: "",
  });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessPopup({ show: false, message: "" });

    try {
      const data = await api.updateProfileData({ name, username });
      updateUser(data.user);
      setSuccessPopup({
        show: true,
        message: "Profile updated successfully!",
      });
      setTimeout(() => setSuccessPopup({ show: false, message: "" }), 2500);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1_000_000) {
      setMsg({ text: 'Image is too large (max 1MB).', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      
      setUploading(true);
      setError(null);
      setSuccessPopup({ show: false, message: "" });
      try {
        const data = await api.uploadAvatar(base64);
        updateUser(data.user);
        
        // Clear input so same file can be uploaded again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';

        setSuccessPopup({
          show: true,
          message: "Profile photo updated successfully!",
        });
        setTimeout(() => setSuccessPopup({ show: false, message: "" }), 2500);
      } catch (err) {
        setError(err.message || 'Failed to upload photo');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
    
    setUploading(true);
    setError(null);
    setSuccessPopup({ show: false, message: "" });
    try {
      const data = await api.removeAvatar();
      updateUser(data.user);
      
      // Clear input so if the user uploads the *exact same* file, onChange fires
      if (fileInputRef.current) fileInputRef.current.value = '';

      setSuccessPopup({
        show: true,
        message: "Profile photo removed successfully!",
      });
      setTimeout(() => setSuccessPopup({ show: false, message: "" }), 2500);
    } catch (err) {
      setError(err.message || 'Failed to remove photo');
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <NeonLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-foreground">
            Account <span className="neon-glow-text">Settings</span>
          </h1>
          <p className="text-muted text-sm mt-1">Manage your profile and preferences.</p>
        </motion.div>

        {/* Success Popup */}
        <AnimatePresence>
          {successPopup.show && (
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="relative bg-surface border border-primary/30 rounded-2xl p-8 max-w-sm mx-4 shadow-2xl"
                style={{ boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 25px 50px rgba(0,0,0,0.5)' }}
                initial={{ opacity: 0, scale: 0.8, y: -30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 30 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Animated checkmark circle */}
                <div className="flex justify-center mb-5">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-primary/20 border-2 border-green-400/40 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <motion.path
                        strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                      />
                    </svg>
                  </motion.div>
                </div>

                {/* Success message */}
                <motion.p
                  className="text-center text-foreground text-base font-semibold whitespace-pre-line mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  {successPopup.message}
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Avatar Section */}
          <motion.div 
            className="neon-card p-6 flex flex-col items-center justify-center text-center col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-28 h-28 object-cover rounded-full ring-2 ring-primary/40 group-hover:ring-primary transition-all shadow-[0_0_15px_rgba(88,166,255,0.2)]" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-accent/20 border-2 border-primary/40 group-hover:border-primary flex items-center justify-center text-primary text-4xl font-bold transition-all">
                  {user.name?.charAt(0) || 'U'}
                </div>
              )}
              
              <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-xs font-semibold uppercase tracking-wider">
                  {uploading ? 'Uploading...' : 'Change'}
                </span>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleAvatarSelect}
            />

            {user.avatar_url && (
              <button
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="mb-4 text-xs font-medium text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest border border-red-500/20 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20"
              >
                {uploading ? 'Processing...' : 'Remove Photo'}
              </button>
            )}
            
            <h3 className="font-semibold text-foreground text-lg">{user.name}</h3>
            <p className="text-muted text-sm mb-4">@{user.username}</p>
            
            {user.isAdmin && (
              <span className="neon-badge neon-badge-purple">Administrator</span>
            )}
          </motion.div>

          {/* Profile Form */}
          <motion.div 
            className="neon-card p-6 md:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground border-b border-white/10 pb-3 mb-4">
                Personal Information
              </h2>
              
              <div>
                <label className="neon-label">Email Address (Read-Only)</label>
                <input
                  type="email"
                  className="neon-input opacity-60 cursor-not-allowed"
                  value={user.email}
                  disabled
                />
                <p className="text-[10px] text-muted mt-1 ml-1">Email cannot be changed directly.</p>
              </div>

              <div>
                <label className="neon-label">Display Name *</label>
                <input
                  type="text"
                  className="neon-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="neon-label">Username *</label>
                <div className="relative">
                  <span className="absolute left-3 top-[11px] text-muted">@</span>
                  <input
                    type="text"
                    className="neon-input pl-8"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    required
                  />
                </div>
                <p className="text-[10px] text-muted mt-1 ml-1">Letters, numbers, and underscores only.</p>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={loading || (!name && !username) || (name === user.name && username === user.username)}
                  className="neon-btn neon-btn-primary min-w-[140px]"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </NeonLayout>
  );
}
