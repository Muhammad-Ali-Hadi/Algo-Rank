const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables (SUPABASE_URL and SUPABASE_ANON_KEY are required)');
  process.exit(1);
}

// Public client (respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Detect if a real service role key was provided
const isRealServiceKey =
  supabaseServiceRoleKey &&
  supabaseServiceRoleKey.startsWith('eyJ') &&
  supabaseServiceRoleKey.length > 100;

// Admin client (bypasses RLS) - falls back to anon if no real service key
const supabaseAdmin = isRealServiceKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : supabase;

const hasAdminAccess = isRealServiceKey;

module.exports = { supabase, supabaseAdmin, hasAdminAccess };
