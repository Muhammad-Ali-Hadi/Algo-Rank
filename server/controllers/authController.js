const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../services/supabaseClient');
const { initiateVerification } = require('./verificationController');
const { generateToken, isAdminUser } = require('../utils/authUtils');

const SALT_ROUNDS = 10; // NEW: bcrypt cost factor

// ==================== SIGNUP ====================
const signup = async (req, res) => {
  let { email, password, username, name } = req.body;

  if (!email || !password || !username || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  email = email.trim();
  username = username.trim();
  name = name.trim();

  try {
    // Check if email already exists
    const { data: emailExists } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (emailExists) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Check if username already exists
    const { data: usernameExists } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (usernameExists) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // NEW: Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert directly into public.users
    const userId = crypto.randomUUID();
    const userData = {
      id: userId,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      name: name,
      avatar_url: '',
      is_verified: false // We try to include it
    };

    let { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();

    // FALLBACK: If column is missing, try inserting without it
    if (insertError && insertError.message.includes('column "is_verified"')) {
      console.warn('Database is missing is_verified column. Falling back to standard signup.');
      delete userData.is_verified;
      const retry = await supabaseAdmin
        .from('users')
        .insert(userData)
        .select()
        .single();
      newUser = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to create account: ' + insertError.message });
    }

    // Send verification OTP
    // Don't swallow the error here since it silently fails initial OTP delivery
    await initiateVerification(email.toLowerCase());

    // Generate JWT
    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        name: newUser.name,
        avatar_url: newUser.avatar_url,
        created_at: newUser.created_at,
        isAdmin: isAdminUser(newUser.email, newUser.username),
        isVerified: !!newUser.is_verified
      }
    });

  } catch (err) {
    console.error('Signup exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== SIGNIN ====================
const signin = async (req, res) => {
  let { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  identifier = identifier.trim();

  try {
    // Look up user by email or username
    let query;
    if (identifier.includes('@')) {
      query = supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', identifier.toLowerCase())
        .single();
    } else {
      query = supabaseAdmin
        .from('users')
        .select('*')
        .eq('username', identifier.toLowerCase())
        .single();
    }

    const { data: user, error: lookupError } = await query;

    if (lookupError || !user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // CHANGED: Verify password against bcrypt hash instead of plain-text comparison
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Generate JWT
    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        isAdmin: isAdminUser(user.email, user.username),
        isVerified: !!user.is_verified
      }
    });

  } catch (err) {
    console.error('Signin exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== GET PROFILE ====================
const getProfile = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, name, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdmin = isAdminUser(data.email, data.username);
    return res.status(200).json({ user: { ...data, isAdmin, isVerified: !!data.is_verified } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { signup, signin, getProfile };