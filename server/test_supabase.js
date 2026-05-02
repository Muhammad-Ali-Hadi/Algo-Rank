require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');

async function run() {
  const { data } = await supabaseAdmin.from('submissions').select('*, contest_problems(*)').limit(1);
  console.log(JSON.stringify(data, null, 2));
}
run();
