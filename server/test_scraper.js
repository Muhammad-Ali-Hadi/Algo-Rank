require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');

async function test() {
  const { data: p } = await supabaseAdmin.from('problems').select('id').eq('title', 'Way Too Long Words').single();
  const { data: tc } = await supabaseAdmin.from('test_cases').select('*').eq('problem_id', p.id).eq('is_hidden', false);
  console.log('Sample test cases:');
  console.log(tc);
}
test();
