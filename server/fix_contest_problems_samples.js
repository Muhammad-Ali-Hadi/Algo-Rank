require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');

async function fixContestProblems() {
  console.log('Fetching all problems and their fixed test cases...');
  
  // 1. Get all problems
  const { data: problems, error: pErr } = await supabaseAdmin.from('problems').select('id, title');
  if (pErr || !problems) {
    console.error('Failed to fetch problems', pErr);
    process.exit(1);
  }

  // 2. Build a map of problem title -> test cases
  const problemCases = {};
  for (const p of problems) {
    const { data: tcs } = await supabaseAdmin
      .from('test_cases')
      .select('input, expected_output')
      .eq('problem_id', p.id)
      .eq('is_hidden', false)
      .order('order_index', { ascending: true });
      
    if (tcs && tcs.length > 0) {
      problemCases[p.title.toLowerCase()] = tcs.map(t => ({
        input: t.input,
        output: t.expected_output
      }));
    }
  }

  console.log('Fetching all contest problems...');
  // 3. Get all contest problems
  const { data: contestProblems, error: cpErr } = await supabaseAdmin
    .from('contest_problems')
    .select('id, problem_title');
    
  if (cpErr || !contestProblems) {
    console.error('Failed to fetch contest problems', cpErr);
    process.exit(1);
  }

  console.log(`Updating ${contestProblems.length} contest problems...`);
  
  let updatedCount = 0;
  // 4. Update those that have matching fresh test cases
  for (const cp of contestProblems) {
    const freshSamples = problemCases[cp.problem_title.toLowerCase()];
    if (freshSamples) {
      const { error: updErr } = await supabaseAdmin
        .from('contest_problems')
        .update({ scraped_samples: freshSamples })
        .eq('id', cp.id);
        
      if (!updErr) {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} contest problems with fixed formatting!`);
}

fixContestProblems().then(() => process.exit(0)).catch(console.error);
