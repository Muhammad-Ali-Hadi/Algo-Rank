require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');

async function test() {
  const { data, error } = await supabaseAdmin.from('contests').select('id, name').limit(1);
  console.log('Contests ID format:', data, error);
}
test();
