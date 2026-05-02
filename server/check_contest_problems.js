require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');

async function test() {
  const { data: cp } = await supabaseAdmin
    .from('contest_problems')
    .select('id, problem_title, scraped_samples')
    .ilike('problem_title', '%Way Too Long Words%')
    .limit(1);
    
  console.log('Contest Problem samples:');
  console.log(JSON.stringify(cp, null, 2));
}
test();
