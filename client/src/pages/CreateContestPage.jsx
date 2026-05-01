import { useState, useEffect } from 'react';
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
  const [problems, setProblems] = useState([{ title: '', id: null }]);
  const [availableProblems, setAvailableProblems] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(null);

  // Fetch problems for autocomplete

  
  useEffect(() => {
    const loadProblems = async () => {
      try {
        // Fetch up to 100 problems for the datalist
        const { api } = await import('../services/api');
        const data = await api.getProblems(1, 100);
        setAvailableProblems(data.problems || []);
      } catch (err) {
        console.error('Failed to load problem set for suggestions', err);
      }
    };
    loadProblems();
  }, []);

  const addProblem = () => {
    setProblems([...problems, { title: '', id: null }]);
  };

  const removeProblem = (index) => {
    if (problems.length <= 1) return;
    setProblems(problems.filter((_, i) => i !== index));
  };

  const updateProblem = (index, field, value) => {
    const updated = [...problems];
    updated[index][field] = value;
    
    // Auto-match ID if title matches exactly
    if (field === 'title') {
      const match = availableProblems.find(p => p.title.toLowerCase() === value.toLowerCase());
      if (match) {
        updated[index].id = match.id;
      } else {
        delete updated[index].id;
      }
    }
    
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
                      <div className="relative flex-1">
                        <input
                          type="text"
                          className="neon-input w-full"
                          placeholder="Search problem by name..."
                          value={p.title}
                          onFocus={() => setFocusedIndex(`global-${i}`)}
                          onBlur={() => setTimeout(() => setFocusedIndex(null), 200)}
                          onChange={(e) => updateProblem(i, 'title', e.target.value)}
                        />
                        {focusedIndex === `global-${i}` && p.title && (
                          <div className="absolute z-50 w-full mt-1 bg-[#0a0a0f] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {availableProblems
                              .filter(ap => ap.title.toLowerCase().includes(p.title.toLowerCase()))
                              .map(ap => (
                                <div 
                                  key={ap.id}
                                  className="px-4 py-2 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors"
                                  onClick={() => {
                                    updateProblem(i, 'title', ap.title);
                                    setFocusedIndex(null);
                                  }}
                                >
                                  <span className="text-sm text-foreground">{ap.title}</span>
                                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${ap.difficulty === 'easy' ? 'bg-green-500/10 border-green-500/30 text-green-400' : ap.difficulty === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                    {ap.difficulty}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      
                      {p.id ? (
                        <div className="flex flex-col justify-center shrink-0 w-16">
                          <span className="text-green-400 text-[10px] uppercase font-bold tracking-wider flex items-center justify-center mb-1">✓ Found</span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-1 py-0.5 rounded text-center border ${
                            availableProblems.find(ap => ap.id === p.id)?.difficulty === 'easy' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                            availableProblems.find(ap => ap.id === p.id)?.difficulty === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                            'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>
                            {availableProblems.find(ap => ap.id === p.id)?.difficulty}
                          </span>
                        </div>
                      ) : (
                        <div className="w-16 shrink-0"></div>
                      )}
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
                    <div className="relative flex-1">
                      <input
                        type="text"
                        className="neon-input w-full"
                        placeholder="Search problem by name..."
                        value={p.title}
                        onFocus={() => setFocusedIndex(`local-${i}`)}
                        onBlur={() => setTimeout(() => setFocusedIndex(null), 200)}
                        onChange={(e) => updateProblem(i, 'title', e.target.value)}
                      />
                      {focusedIndex === `local-${i}` && p.title && (
                        <div className="absolute z-50 w-full mt-1 bg-[#0a0a0f] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                          {availableProblems
                            .filter(ap => ap.title.toLowerCase().includes(p.title.toLowerCase()))
                            .map(ap => (
                              <div 
                                key={ap.id}
                                className="px-4 py-2 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors"
                                onClick={() => {
                                  updateProblem(i, 'title', ap.title);
                                  setFocusedIndex(null);
                                }}
                              >
                                <span className="text-sm text-foreground">{ap.title}</span>
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${ap.difficulty === 'easy' ? 'bg-green-500/10 border-green-500/30 text-green-400' : ap.difficulty === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                  {ap.difficulty}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {p.id ? (
                      <div className="flex flex-col justify-center shrink-0 w-16">
                        <span className="text-green-400 text-[10px] uppercase font-bold tracking-wider flex items-center justify-center mb-1">✓ Found</span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1 py-0.5 rounded text-center border ${
                          availableProblems.find(ap => ap.id === p.id)?.difficulty === 'easy' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                          availableProblems.find(ap => ap.id === p.id)?.difficulty === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                          'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                          {availableProblems.find(ap => ap.id === p.id)?.difficulty}
                        </span>
                      </div>
                    ) : (
                      <div className="w-16 shrink-0"></div>
                    )}
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
