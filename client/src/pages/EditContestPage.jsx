import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import NeonLayout from '../components/NeonLayout';
import DurationPicker from '../components/DurationPicker';
import { api } from '../services/api';

export default function EditContestPage() {
  const { id } = useParams();
  const { user: profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [contest, setContest] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'public',
    duration_seconds: 3600,
    start_time: '',
    end_time: '',
    freeze_time: '',
  });
  
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    const fetchContest = async () => {
      try {
        const data = await api.getContestById(id);
        const { contest: c, problems: p } = data;
        
        // Ensure user is authorized
        if (c.creator_id !== profile.id && !profile.isAdmin) {
          navigate(`/contests/${id}`);
          return;
        }

        setContest(c);
        setForm({
          name: c.name,
          description: c.description || '',
          visibility: c.visibility,
          duration_seconds: c.duration_seconds || 0,
          start_time: c.start_time ? c.start_time.slice(0, 16) : '',
          end_time: c.end_time ? c.end_time.slice(0, 16) : '',
          freeze_time: c.freeze_time ? c.freeze_time.slice(0, 16) : '',
        });
        
        setProblems(p.length > 0 ? p.map(prob => ({ title: prob.problem_title, url: prob.problem_url })) : [{ title: '', url: '' }]);
      } catch (err) {
        setError('Failed to load contest data');
      } finally {
        setLoading(false);
      }
    };

    fetchContest();
  }, [id, profile, navigate]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const validProblems = problems.filter(p => p.title.trim());
      
      const payload = {
        name: form.name,
        description: form.description,
        visibility: form.visibility,
        start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
        freeze_time: form.freeze_time ? new Date(form.freeze_time).toISOString() : null,
        problems: validProblems,
      };

      if (contest.type === 'global') {
        payload.end_time = form.end_time ? new Date(form.end_time).toISOString() : null;
        payload.duration_seconds = form.duration_seconds || null;
      } else {
        payload.duration_seconds = form.duration_seconds;
      }

      await api.updateContest(id, payload);
      setSuccess('Contest updated successfully');
      setTimeout(() => navigate(`/contests/${id}`), 1500);
    } catch (err) {
      setError(err.message || 'Failed to update contest');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <NeonLayout>
        <div className="max-w-2xl mx-auto neon-card p-8 animate-pulse space-y-4">
          <div className="h-6 bg-white/5 rounded w-1/3 mb-4" />
          <div className="h-10 bg-white/5 rounded w-full" />
          <div className="h-20 bg-white/5 rounded w-full" />
        </div>
      </NeonLayout>
    );
  }

  if (error && !contest) {
    return (
      <NeonLayout>
        <div className="max-w-2xl mx-auto neon-card p-8 text-center">
          <p className="text-red-400">{error}</p>
          <Link to="/contests" className="neon-btn mt-4 inline-block">Back to Contests</Link>
        </div>
      </NeonLayout>
    );
  }

  return (
    <NeonLayout>
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Edit <span className="neon-glow-text">Contest</span>
            </h1>
            <p className="text-muted text-sm mt-1">Make changes to your existing contest.</p>
          </div>
          <Link to={`/contests/${id}`} className="neon-btn text-xs py-1.5 px-3">
            Cancel
          </Link>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 mb-4 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            {success}
          </div>
        )}

        <motion.form 
          onSubmit={handleSubmit}
          className="neon-card p-6 space-y-6"
        >
          {/* Start Time Editor */}
          {new Date() < new Date(contest.start_time) ? (
            <div>
              <label className="neon-label">Start Time</label>
              <input
                type="datetime-local"
                className="neon-input"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-muted">
              <span className="font-semibold text-foreground">Note:</span> Contest start time cannot be modified because it has already started. Started at <strong className="text-primary">{new Date(contest.start_time).toLocaleString()}</strong>.
            </div>
          )}

          <div>
            <label className="neon-label">Contest Name *</label>
            <input
              type="text"
              className="neon-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {contest.type === 'global' && (
            <div>
              <label className="neon-label">Description</label>
              <textarea
                className="neon-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="neon-label">Visibility</label>
              <select
                className="neon-select"
                value={form.visibility}
                onChange={(e) => setForm({ ...form, visibility: e.target.value })}
              >
                <option value="public">Public</option>
                <option value="private">Private (Invite Only)</option>
              </select>
            </div>
            
            <div>
              <label className="neon-label">Duration</label>
              <DurationPicker 
                valueSeconds={form.duration_seconds} 
                onChange={(val) => setForm({...form, duration_seconds: val})} 
                required={contest.type === 'local'}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contest.type === 'global' && (
              <div>
                <label className="neon-label">End Time</label>
                <input
                  type="datetime-local"
                  className="neon-input"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            )}
            
            <div>
              <label className="neon-label">Freeze Time (Optional)</label>
              <input
                type="datetime-local"
                className="neon-input"
                value={form.freeze_time}
                onChange={(e) => setForm({ ...form, freeze_time: e.target.value })}
              />
              <p className="text-[10px] text-muted mt-1">Hide submissions from leaderboard after this time.</p>
            </div>
          </div>

          <div className="neon-divider" />

          {/* Problems */}
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
                  <span className="text-primary font-bold mt-2.5 w-6 shrink-0 text-center">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      className="neon-input"
                      placeholder="Problem title"
                      value={p.title}
                      onChange={(e) => updateProblem(i, 'title', e.target.value)}
                    />
                    <input
                      type="url"
                      className="neon-input text-xs"
                      placeholder="Problem URL (https://codeforces.com/...)"
                      value={p.url}
                      onChange={(e) => updateProblem(i, 'url', e.target.value)}
                    />
                  </div>
                  {problems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProblem(i)}
                      className="neon-btn neon-btn-danger p-2 text-xs mt-1"
                      title="Remove Problem"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="neon-btn neon-btn-primary w-full py-3"
            >
              {saving ? 'Saving Changes...' : 'Save Contest'}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </NeonLayout>
  );
}
