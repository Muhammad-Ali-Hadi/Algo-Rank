require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function addHiddenTestCasesToAllProblems() {
  // 1. Fetch all problems from the database
  const { data: problems, error: probErr } = await supabaseAdmin
    .from('problems')
    .select('id, title');
  
  if (probErr) {
    console.error("Error fetching problems:", probErr.message);
    process.exit(1);
  }
  
  if (!problems || problems.length === 0) {
    console.log("No problems found in the database. Please run populate_problems.js first.");
    return;
  }

  console.log(`Found ${problems.length} problems. Generating hidden test cases...`);
  
  // 2. Loop through each problem
  for (const problem of problems) {
    // Count existing test cases
    const { count, error: countErr } = await supabaseAdmin
      .from('test_cases')
      .select('*', { count: 'exact', head: true })
      .eq('problem_id', problem.id);
      
    if (countErr) {
      console.error(`Error counting test cases for ${problem.title}:`, countErr.message);
      continue;
    }

    const existingCount = count || 0;
    const casesNeeded = 40; // We want to add 40 hidden test cases per problem
    
    // Only add if there are few test cases (i.e. just the sample ones)
    if (existingCount < casesNeeded) {
      const testCases = [];
      for (let i = 0; i < casesNeeded; i++) {
        // Generating placeholder inputs/outputs.
        // Since we don't know the exact logic for every Codeforces problem,
        // we use placeholder values. The judge loop will run against these!
        testCases.push({
          problem_id: problem.id,
          input: `Hidden_Input_${i}`,
          expected_output: `Hidden_Output_${i}`,
          is_sample: false,
          is_hidden: true,
          order_index: existingCount + i
        });
      }
      
      const { error } = await supabaseAdmin.from('test_cases').insert(testCases);
      if (error) {
        console.error(`❌ Failed to add to ${problem.title}:`, error.message);
      } else {
        console.log(`✅ Added ${casesNeeded} hidden test cases to "${problem.title}"`);
      }
    } else {
      console.log(`⏩ "${problem.title}" already has ${existingCount} test cases. Skipping.`);
    }
  }
  
  console.log("\n🎉 Finished adding hidden test cases to all problems.");
}

addHiddenTestCasesToAllProblems().then(() => process.exit(0));
