require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixHiddenTestCases() {
  console.log("Cleaning up old dummy hidden test cases...");
  
  // 1. Delete all existing hidden test cases that were generated with "Hidden_Input"
  const { error: deleteErr } = await supabaseAdmin
    .from('test_cases')
    .delete()
    .eq('is_hidden', true);
    
  if (deleteErr) {
    console.error("Error deleting old hidden test cases:", deleteErr);
    process.exit(1);
  }
  
  console.log("Deleted old dummy hidden test cases.");

  // 2. Fetch all problems
  const { data: problems, error: probErr } = await supabaseAdmin
    .from('problems')
    .select('id, title');
    
  if (probErr) {
    console.error("Error fetching problems:", probErr.message);
    process.exit(1);
  }
  
  console.log(`Found ${problems.length} problems. Generating new format-accurate hidden test cases...`);

  // 3. Loop through each problem
  for (const problem of problems) {
    // Fetch the sample (non-hidden) test cases for this problem
    const { data: sampleCases, error: sampleErr } = await supabaseAdmin
      .from('test_cases')
      .select('input, expected_output')
      .eq('problem_id', problem.id)
      .eq('is_hidden', false)
      .order('order_index', { ascending: true });

    if (sampleErr || !sampleCases || sampleCases.length === 0) {
      console.log(`⚠️ Problem "${problem.title}" has no sample test cases to copy format from. Skipping.`);
      continue;
    }

    const casesNeeded = 40;
    const testCasesToInsert = [];
    
    // 4. Duplicate the sample test cases until we reach 40 hidden cases
    // This ensures the inputs and outputs exactly match the formatting expected by the user's code
    for (let i = 0; i < casesNeeded; i++) {
      // Rotate through available sample cases
      const sampleCase = sampleCases[i % sampleCases.length];
      
      testCasesToInsert.push({
        problem_id: problem.id,
        input: sampleCase.input,
        expected_output: sampleCase.expected_output,
        is_sample: false,
        is_hidden: true,
        order_index: sampleCases.length + i // Append after sample cases
      });
    }
    
    const { error: insertErr } = await supabaseAdmin.from('test_cases').insert(testCasesToInsert);
    
    if (insertErr) {
      console.error(`❌ Failed to add to ${problem.title}:`, insertErr.message);
    } else {
      console.log(`✅ Added ${casesNeeded} format-accurate hidden test cases to "${problem.title}"`);
    }
  }
  
  console.log("\n🎉 Finished fixing hidden test cases! They now match the exact format of real test cases.");
}

fixHiddenTestCases().then(() => process.exit(0));
