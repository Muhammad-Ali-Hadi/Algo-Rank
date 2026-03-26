import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import NeonLayout from '../components/NeonLayout';
import { api } from '../services/api';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const data = await api.updateProfileData({ name, username });
      setUser({ ...user, ...data.user });
      setMsg({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setMsg({ text: err.message || 'Failed to update profile', type: 'error' });
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
      setMsg({ text: '', type: '' });
      try {
        const data = await api.uploadAvatar(base64);
        setUser({ ...user, ...data.user });
        setMsg({ text: 'Avatar updated!', type: 'success' });
      } catch (err) {
        setMsg({ text: err.message || 'Failed to upload avatar', type: 'error' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
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

        {msg.text && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-lg border ${msg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
          >
            {msg.text}
          </motion.div>
        )}

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
