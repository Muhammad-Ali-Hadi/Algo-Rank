require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');

async function check() {
  const { data, error } = await supabaseAdmin.from('contests').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  }
}
check();
