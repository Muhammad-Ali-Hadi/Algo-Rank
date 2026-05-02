require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');

async function check() {
  console.log('Checking database schema for problems table...');
  const { data, error } = await supabaseAdmin
    .from('problems')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching from problems table:', error);
    return;
  }

  if (data && data.length >= 0) {
    const columns = Object.keys(data[0] || {});
    console.log('Existing columns in problems table:', columns);
    
    const required = ['creator_id', 'forked_from_contest_problem'];
    const missing = required.filter(col => !columns.includes(col));
    
    if (missing.length > 0) {
      console.error('MISSING COLUMNS:', missing);
      console.log('Please run the migration in server/fork_migration.sql');
    } else {
      console.log('All required columns exist.');
    }
  }
}

check();
