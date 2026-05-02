require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');

async function test() {
  const { data, error } = await supabaseAdmin.from('contests').select('id, name, invite_code').limit(2);
  console.log('Contests invite_code:', data, error);
}
test();
