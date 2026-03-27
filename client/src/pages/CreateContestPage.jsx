import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import NeonLayout from '../components/NeonLayout';
import DurationPicker from '../components/DurationPicker';

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

export default function CreateContestPage() {
  const { user: profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.isAdmin;

  const [activeTab, setActiveTab] = useState(isAdmin ? 'global' : 'local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Global contest form
  const [globalForm, setGlobalForm] = useState({
    name: '',
    description: '',
    start_time: '',
    end_time: '',
    duration_seconds: 0,
  });

  // Local contest form
  const [localForm, setLocalForm] = useState({
    name: '',
    visibility: 'public',
    start_time: '',
    duration_seconds: 3600,
  });

  // Problems (shared)
  const [problems, setProblems] = useState([{ title: '', url: '' }]);

  const addProblem = () => {
    setProblems([...problems, { title: '', url: '' }]);
  };

  const removeProblem = (index) => {
    if (problems.length <= 1) return;
    setProblems(problems.filter((_, i) => i !== index));
  };

  const updateProblem = (index, field, value) => {
    const updated = [...problems];
    updated[index][field] = value;
    setProblems(updated);
  };

  const handleCreateGlobal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const validProblems = problems.filter(p => p.title.trim());

      const res = await fetch(`${API_URL}/contests/global`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...globalForm,
          problems: validProblems,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Global contest created!');
        setTimeout(() => navigate('/contests'), 1500);
      } else {
        setError(data.error || 'Failed to create contest');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocal = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const validProblems = problems.filter(p => p.title.trim());

      const res = await fetch(`${API_URL}/contests/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...localForm,
          problems: validProblems,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Local contest created!' + (data.contest?.invite_code ? ` Invite code: ${data.contest.invite_code}` : ''));
        setTimeout(() => navigate('/contests'), 2500);
      } else {
        setError(data.error || 'Failed to create contest');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <NeonLayout>
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold neon-glow-text">Create Contest</h1>
          <p className="text-muted text-sm mt-1">Set up a new contest for the community</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('global')}
              className={`neon-tab ${activeTab === 'global' ? 'neon-tab-active' : ''}`}
            >
              🌐 Global Contest
            </button>
          )}
          <button
            onClick={() => setActiveTab('local')}
            className={`neon-tab ${activeTab === 'local' ? 'neon-tab-active' : ''}`}
          >
            🏠 Local Contest
          </button>
        </div>

        {/* Feedback */}
        {error && (
          <motion.div
            className="neon-card p-3 mb-4 border-red-500/30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <p className="text-red-400 text-sm">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div
            className="neon-card p-3 mb-4 border-green-500/30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <p className="text-green-400 text-sm">{success}</p>
          </motion.div>
        )}

        {/* Global Contest Form */}
        {activeTab === 'global' && isAdmin && (
          <motion.form
            onSubmit={handleCreateGlobal}
            className="neon-card p-6 space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div>
              <label className="neon-label">Contest Name *</label>
              <input
                type="text"
                className="neon-input"
                placeholder="e.g., Weekly Challenge #1"
                value={globalForm.name}
                onChange={(e) => setGlobalForm({ ...globalForm, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="neon-label">Description</label>
              <textarea
                className="neon-textarea"
                placeholder="Describe the contest..."
                value={globalForm.description}
                onChange={(e) => setGlobalForm({ ...globalForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="neon-label">Start Time *</label>
                <input
                  type="datetime-local"
                  className="neon-input"
                  value={globalForm.start_time}
                  onChange={(e) => setGlobalForm({ ...globalForm, start_time: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="neon-label">End Time (Optional)</label>
                <input
                  type="datetime-local"
                  className="neon-input"
                  value={globalForm.end_time}
                  onChange={(e) => setGlobalForm({ ...globalForm, end_time: e.target.value })}
                />
              </div>

              <div>
                <label className="neon-label">Freeze Time (Optional)</label>
                <input
                  type="datetime-local"
                  className="neon-input"
                  value={globalForm.freeze_time || ''}
                  onChange={(e) => setGlobalForm({ ...globalForm, freeze_time: e.target.value })}
                />
              </div>

              <div>
                <label className="neon-label">Contest Duration Limit</label>
                <DurationPicker
                  valueSeconds={globalForm.duration_seconds}
                  onChange={(val) => setGlobalForm({ ...globalForm, duration_seconds: val })}
                />
                <p className="text-[10px] text-muted mt-1 ml-1">If set, limits how long a participant has after joining. Leave zeros for no limit.</p>
              </div>

              <div className="neon-divider" />

              {/* Problems Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="neon-label mb-0">Problem Set</label>
                  <button type="button" onClick={addProblem} className="neon-btn text-xs py-1 px-3">
                    + Add Problem
                  </button>
                </div>
                <div className="space-y-3">
                  {problems.map((p, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-muted text-sm mt-2.5 w-6 shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        type="text"
                        className="neon-input flex-1"
                        placeholder="Problem title"
                        value={p.title}
                        onChange={(e) => updateProblem(i, 'title', e.target.value)}
                      />
                      <input
                        type="url"
                        className="neon-input flex-1"
                        placeholder="Problem URL (optional)"
                        value={p.url}
                        onChange={(e) => updateProblem(i, 'url', e.target.value)}
                      />
                      {problems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProblem(i)}
                          className="neon-btn neon-btn-danger py-2 px-3 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="neon-btn neon-btn-primary w-full py-3 text-base"
              >
                {loading ? 'Creating...' : 'Create Global Contest'}
              </button>
            </div>
          </motion.form>
        )}

        {/* Local Contest Form */}
        {activeTab === 'local' && (
          <motion.form
            onSubmit={handleCreateLocal}
            className="neon-card p-6 space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div>
              <label className="neon-label">Contest Name *</label>
              <input
                type="text"
                className="neon-input"
                placeholder="e.g., Practice Duel with Friends"
                value={localForm.name}
                onChange={(e) => setLocalForm({ ...localForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="neon-label">Visibility</label>
                <select
                  className="neon-select"
                  value={localForm.visibility}
                  onChange={(e) => setLocalForm({ ...localForm, visibility: e.target.value })}
                >
                  <option value="public">Public</option>
                  <option value="private">Private (Invite Only)</option>
                </select>
              </div>
              <div>
                <label className="neon-label">Duration *</label>
                <DurationPicker
                  valueSeconds={localForm.duration_seconds}
                  onChange={(val) => setLocalForm({ ...localForm, duration_seconds: val })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="neon-label">Start Time *</label>
                <input
                  type="datetime-local"
                  className="neon-input"
                  value={localForm.start_time}
                  onChange={(e) => setLocalForm({ ...localForm, start_time: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="neon-label">Freeze Time (Optional)</label>
                <input
                  type="datetime-local"
                  className="neon-input"
                  value={localForm.freeze_time || ''}
                  onChange={(e) => setLocalForm({ ...localForm, freeze_time: e.target.value })}
                />
              </div>
            </div>

            {localForm.visibility === 'private' && (
              <motion.div
                className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <p className="text-yellow-300/80 text-sm">
                  🔒 A unique invite code will be generated after creation. Share it with participants.
                </p>
              </motion.div>
            )}

            <div className="neon-divider" />

            {/* Problems Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="neon-label mb-0">Problem Set</label>
                <button type="button" onClick={addProblem} className="neon-btn text-xs py-1 px-3">
                  + Add Problem
                </button>
              </div>
              <div className="space-y-3">
                {problems.map((p, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-muted text-sm mt-2.5 w-6 shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <input
                      type="text"
                      className="neon-input flex-1"
                      placeholder="Problem title"
                      value={p.title}
                      onChange={(e) => updateProblem(i, 'title', e.target.value)}
                    />
                    <input
                      type="url"
                      className="neon-input flex-1"
                      placeholder="Problem URL (optional)"
                      value={p.url}
                      onChange={(e) => updateProblem(i, 'url', e.target.value)}
                    />
                    {problems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProblem(i)}
                        className="neon-btn neon-btn-danger py-2 px-3 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neon-btn neon-btn-primary w-full py-3 text-base"
            >
              {loading ? 'Creating...' : 'Create Local Contest'}
            </button>
          </motion.form>
        )}
      </motion.div>
    </NeonLayout >
  );
}
