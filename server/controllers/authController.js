const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Always use service role for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Regular client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const signup = async (req, res) => {
  const { email, password, username, name } = req.body;

  if (!email || !password || !username || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Step 1: Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Step 2: Create auth user using admin API (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm, no email sent
      user_metadata: {
        name,
        username: username.toLowerCase(),
        password, // plain text stored in public.users via trigger
        avatar_url: ''
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Step 3: Manually insert into public.users as backup
    // (in case the trigger didn't fire)
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        email,
        username: username.toLowerCase(),
        password,
        name,
        avatar_url: ''
      }, { onConflict: 'id' });

    if (insertError) {
      console.error('Insert error:', insertError);
      // Don't fail — auth user was created, just log
    }

    // Step 4: Sign in immediately to get session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return res.status(400).json({ error: signInError.message });
    }

    return res.status(200).json({
      message: 'Signup successful',
      session: signInData.session,
      user: {
        id: authData.user.id,
        email,
        username: username.toLowerCase(),
        name
      }
    });

  } catch (err) {
    console.error('Signup exception:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
};

const signin = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/email and password are required' });
  }

  try {
    let email = identifier;

    // If identifier is a username (no @), look up the email
    if (!identifier.includes('@')) {
      const { data: userData, error: lookupError } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('username', identifier.toLowerCase())
        .single();

      if (lookupError || !userData) {
        return res.status(400).json({ error: 'Username not found' });
      }

      email = userData.email;
    }

    // Sign in with email + password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Fetch full user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.status(200).json({
      message: 'Login successful',
      session: data.session,
      user: profile || data.user
    });

  } catch (err) {
    console.error('Signin exception:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, name, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    return res.status(200).json({ user: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { signup, signin, getProfile };