const bcrypt = require('bcrypt');
const { supabaseAdmin } = require('../services/supabaseClient');
const { invalidate, KEYS } = require('../services/cacheService');

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

module.exports = { getProfileData, updateProfileData, uploadAvatar };
