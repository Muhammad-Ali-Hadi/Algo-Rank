require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixContestProblems() {
  console.log("Fixing existing contest problems that have hidden test cases embedded...");

  const { data: contestProblems } = await supabaseAdmin.from('contest_problems').select('id, scraped_samples, problem_title');
  
  if (!contestProblems) {
    console.log("No contest problems found.");
    return;
  }

  let count = 0;
  for (const cp of contestProblems) {
    if (cp.scraped_samples && cp.scraped_samples.length > 5) {
      // It likely has hidden test cases embedded (e.g. 40+).
      // We only want the first few which are the samples.
      // Wait, we can fetch the actual non-hidden samples for this problem and update it.
      const { data: prob } = await supabaseAdmin.from('problems').select('id').eq('title', cp.problem_title).single();
      
      let samplesToKeep = [];
      if (prob) {
        const { data: tcs } = await supabaseAdmin
          .from('test_cases')
          .select('input, expected_output')
          .eq('problem_id', prob.id)
          .eq('is_hidden', false)
          .order('order_index', { ascending: true });
          
        if (tcs) {
          samplesToKeep = tcs.map(t => ({ input: t.input, output: t.expected_output }));
        }
      } else {
        // Fallback: just keep the first 2
        samplesToKeep = cp.scraped_samples.slice(0, 2);
      }

      await supabaseAdmin
        .from('contest_problems')
        .update({ scraped_samples: samplesToKeep })
        .eq('id', cp.id);
        
      count++;
      console.log(`Fixed test cases visibility for: ${cp.problem_title}`);
    }
  }

  console.log(`Done. Fixed ${count} contest problems.`);
}

fixContestProblems().then(() => process.exit(0));
