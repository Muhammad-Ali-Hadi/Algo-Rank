require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');

async function run() {
  const { data: contests } = await supabaseAdmin.from('contests').select('id, invite_code');
  if (!contests) return;

  for (const c of contests) {
    if (!c.invite_code || c.invite_code.length !== 6 || isNaN(Number(c.invite_code))) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await supabaseAdmin.from('contests').update({ invite_code: code }).eq('id', c.id);
      console.log(`Updated ${c.id} with short code ${code}`);
    }
  }
  console.log('Done!');
}
run().then(() => process.exit(0));
