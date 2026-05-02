const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../services/supabaseClient');
const { invalidate, KEYS, getOrSet } = require('../services/cacheService');

// ==================== GET PROFILE ====================
const getProfileData = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, name, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ==================== UPDATE PROFILE ====================
const updateProfileData = async (req, res) => {
  const { name, username } = req.body;

  try {
    // Check if username is taken by someone else
    if (username) {
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', req.user.id)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (username) updates.username = username.toLowerCase();

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, email, username, name, avatar_url, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    // Invalidate cache
    invalidate(KEYS.userProfile(req.user.id));

    return res.status(200).json({ message: 'Profile updated', user: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ==================== UPLOAD AVATAR ====================
const uploadAvatar = async (req, res) => {
  const { avatar_base64 } = req.body;

  if (!avatar_base64) {
    return res.status(400).json({ error: 'Avatar data is required' });
  }

  // Validate size (limit ~1MB of base64)
  if (avatar_base64.length > 1_400_000) {
    return res.status(400).json({ error: 'Image is too large. Maximum 1MB allowed.' });
  }

  // Validate it's a valid data URL
  if (!avatar_base64.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid image format' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: avatar_base64 })
      .eq('id', req.user.id)
      .select('id, email, username, name, avatar_url, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }

    invalidate(KEYS.userProfile(req.user.id));

    return res.status(200).json({ message: 'Avatar updated', user: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ==================== REMOVE AVATAR ====================
const removeAvatar = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: null })
      .eq('id', req.user.id)
      .select('id, email, username, name, avatar_url, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to remove avatar' });
    }

    invalidate(KEYS.userProfile(req.user.id));

    return res.status(200).json({ message: 'Avatar removed', user: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ==================== GET CONTEST HISTORY ====================
const getContestHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get all contests the user participated in
    const { data: participations, error: partErr } = await supabaseAdmin
      .from('contest_participants')
      .select('contest_id, contests(id, name, start_time, end_time)')
      .eq('user_id', userId);

    if (partErr) throw partErr;

    const history = [];

    for (const part of participations) {
      const contest = part.contests;
      if (!contest) continue;

      // Use the same logic as getLeaderboard to find rank
      // We wrap it in getOrSet to leverage the same cache as the public leaderboard
      const cachedData = await getOrSet(KEYS.leaderboard(contest.id), 10, async () => {
        // Fallback: This is a duplicate of the logic in contestController.js
        // Ideally this should be in a shared service, but we are minimizing external alterations.
        const [submissionsRes, participantsRes] = await Promise.all([
          supabaseAdmin.from('submissions').select('*, contest_problems(order_index)').eq('contest_id', contest.id).order('submitted_at', { ascending: true }),
          supabaseAdmin.from('contest_participants').select('*').eq('contest_id', contest.id)
        ]);

        const submissions = submissionsRes.data || [];
        const participants = participantsRes.data || [];

        const userStats = {};
        for (const p of participants) {
          userStats[p.user_id] = { solved: 0, penalty: 0, problems: {}, is_disqualified: p.is_disqualified };
        }

        for (const sub of submissions) {
          const uid = sub.user_id;
          if (!userStats[uid] || userStats[uid].is_disqualified) continue;
          const probIdx = sub.contest_problems?.order_index ?? 0;
          const probKey = `p${probIdx}`;
          if (!userStats[uid].problems[probKey]) userStats[uid].problems[probKey] = { status: 'pending', attempts: 0 };
          if (userStats[uid].problems[probKey].status === 'accepted') continue;

          userStats[uid].problems[probKey].attempts++;
          if (sub.status === 'accepted') {
            userStats[uid].problems[probKey].status = 'accepted';
            userStats[uid].solved++;
            const solveTime = Math.max(0, Math.floor((new Date(sub.submitted_at) - new Date(contest.start_time)) / 60000));
            userStats[uid].penalty += solveTime + (userStats[uid].problems[probKey].attempts - 1) * 20;
          }
        }

        const leaderboard = Object.values(userStats)
          .filter(u => !u.is_disqualified)
          .sort((a, b) => b.solved - a.solved || a.penalty - b.penalty)
          .map((u, i) => ({ user_id: u.user_id, rank: i + 1 }));

        const disqualified = Object.values(userStats)
          .filter(u => u.is_disqualified)
          .map(u => ({ user_id: u.user_id, rank: '-' }));

        return { leaderboard: [...leaderboard, ...disqualified] };
      });

      const userEntry = (cachedData.leaderboard || []).find(e => e.user_id === userId);
      
      history.push({
        id: contest.id,
        name: contest.name,
        rank: userEntry ? userEntry.rank : '-',
        endTime: contest.end_time
      });
    }

    // Sort history by end time (most recent first)
    history.sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

    return res.status(200).json(history);
  } catch (err) {
    console.error('Contest history error:', err);
    return res.status(500).json({ error: 'Failed to fetch contest history' });
  }
};

module.exports = { getProfileData, updateProfileData, uploadAvatar, removeAvatar, getContestHistory };
