require('dotenv').config();
const { supabaseAdmin } = require('./services/supabaseClient');
const { scrapeProblem } = require('./services/scraperService');

const problemsList = [
  // Easy
  { name: 'Watermelon', difficulty: 'easy' },
  { name: 'Way Too Long Words', difficulty: 'easy' },
  { name: 'Team', difficulty: 'easy' },
  { name: 'Bit++', difficulty: 'easy' },
  { name: 'Next Round', difficulty: 'easy' },
  { name: 'Beautiful Matrix', difficulty: 'easy' },
  { name: 'Helpful Maths', difficulty: 'easy' },
  { name: 'String Task', difficulty: 'easy' },
  { name: 'Domino Piling', difficulty: 'easy' },
  { name: 'Boy or Girl', difficulty: 'easy' },
  { name: 'Young Physicist', difficulty: 'easy' },
  { name: 'Presents', difficulty: 'easy' },
  { name: 'Lucky Division', difficulty: 'easy' },
  { name: 'Nearly Lucky Number', difficulty: 'easy' },
  { name: 'Insomnia Cure', difficulty: 'easy' },
  { name: 'Drinks', difficulty: 'easy' },
  { name: 'Arrival of the General', difficulty: 'easy' },
  { name: 'I Wanna Be the Guy', difficulty: 'easy' },
  { name: 'Magnets', difficulty: 'easy' },
  { name: 'HQ9+', difficulty: 'easy' },
  // Medium
  { name: 'Effective Approach', difficulty: 'medium' },
  { name: 'Little Elephant and Bits', difficulty: 'medium' },
  { name: 'Queue at the School', difficulty: 'medium' },
  { name: 'Sereja and Dima', difficulty: 'medium' },
  { name: 'Even Odds', difficulty: 'medium' },
  { name: 'Twins', difficulty: 'medium' },
  { name: 'Chat room', difficulty: 'medium' },
  { name: 'Little Girl and Game', difficulty: 'medium' },
  { name: 'Comparing Strings', difficulty: 'medium' },
  { name: 'Keyboard', difficulty: 'medium' },
  // Hard
  { name: 'BerSU Ball', difficulty: 'hard' },
  { name: 'Jeff and Periods', difficulty: 'hard' },
  { name: 'Sort the Array', difficulty: 'hard' },
  { name: 'Fox And Names', difficulty: 'hard' },
  { name: 'T-primes', difficulty: 'hard' },
  { name: 'Xenia and Ringroad', difficulty: 'hard' },
  { name: 'Dima and Friends', difficulty: 'hard' },
  { name: 'Cakeminator', difficulty: 'hard' },
  { name: 'Jzzhu and Children', difficulty: 'hard' },
  { name: 'Valera and X', difficulty: 'hard' },
  { name: 'Roma and Lucky Numbers', difficulty: 'hard' },
  { name: 'Fedor and New Game', difficulty: 'hard' },
  { name: 'Free Ice Cream', difficulty: 'hard' },
  { name: 'Game With Sticks', difficulty: 'hard' },
  { name: 'Little Elephant and Rozdil', difficulty: 'hard' },
  { name: 'Dragons', difficulty: 'hard' },
  { name: 'DZY Loves Chessboard', difficulty: 'hard' },
  { name: 'Dubstep', difficulty: 'hard' },
  { name: 'Olesya and Rodion', difficulty: 'hard' },
  { name: 'Vanya and Fence', difficulty: 'hard' }
];

async function run() {
  console.log('Fetching Codeforces problemset...');
  let allProblems = [];
  try {
    const res = await fetch('https://codeforces.com/api/problemset.problems');
    const data = await res.json();
    if (data.status === 'OK') {
      allProblems = data.result.problems;
    } else {
      console.error('Failed to fetch from CF API:', data);
      process.exit(1);
    }
  } catch (err) {
    console.error('API Fetch error:', err);
    process.exit(1);
  }

  console.log(`Successfully fetched ${allProblems.length} problems from CF API.`);

  // Create a map by name (lowercased for case-insensitive match)
  const cfMap = new Map();
  // Reverse loop so older (lower contest ID) problems take precedence if names conflict
  for (let i = allProblems.length - 1; i >= 0; i--) {
    const p = allProblems[i];
    if (p.name) {
      cfMap.set(p.name.toLowerCase().trim(), p);
    }
  }

  for (let i = 0; i < problemsList.length; i++) {
    const item = problemsList[i];
    const nameLower = item.name.toLowerCase().trim();
    const cfProb = cfMap.get(nameLower);

    if (!cfProb) {
      console.warn(`[${i+1}/${problemsList.length}] ⚠️ Not found on Codeforces: ${item.name}`);
      continue;
    }

    const url = `https://codeforces.com/contest/${cfProb.contestId}/problem/${cfProb.index}`;
    console.log(`\n[${i+1}/${problemsList.length}] Processing: ${item.name} (${url})`);

    try {
      // Check if it already exists
      const { data: existing } = await supabaseAdmin
        .from('problems')
        .select('id')
        .eq('title', item.name)
        .single();
      
      if (existing) {
        console.log(`   -> Skipping, already exists in database.`);
        continue;
      }

      // 1. Scrape problem
      const scraped = await scrapeProblem(url);
      
      // Parse time limit (e.g., "1 second" -> 1000, "2 seconds" -> 2000)
      let timeLimitMs = 1000;
      if (scraped.timeLimit) {
        const match = scraped.timeLimit.match(/([\d.]+)\s*second/i);
        if (match) timeLimitMs = Math.round(parseFloat(match[1]) * 1000);
      }

      // Parse memory limit (e.g., "256 megabytes" -> 256)
      let memoryLimitMb = 256;
      if (scraped.memoryLimit) {
        const match = scraped.memoryLimit.match(/(\d+)\s*megabyte/i);
        if (match) memoryLimitMb = parseInt(match[1]);
      }

      // 2. Insert into `problems` table
      const { data: insertedProblem, error: probErr } = await supabaseAdmin
        .from('problems')
        .insert({
          title: item.name,
          description: scraped.statement || '',
          difficulty: item.difficulty,
          time_limit: timeLimitMs,
          memory_limit: memoryLimitMb
        })
        .select()
        .single();

      if (probErr) {
        console.error(`   ❌ Failed to insert problem:`, probErr.message);
        continue;
      }

      // 3. Insert into `test_cases` table
      if (scraped.samples && scraped.samples.length > 0) {
        const testCaseRows = scraped.samples.map((s, idx) => ({
          problem_id: insertedProblem.id,
          input: s.input || '',
          expected_output: s.output || '',
          is_hidden: false,
          order_index: idx
        }));

        const { error: tcErr } = await supabaseAdmin
          .from('test_cases')
          .insert(testCaseRows);

        if (tcErr) {
          console.error(`   ❌ Failed to insert test cases:`, tcErr.message);
        } else {
          console.log(`   ✅ Inserted problem and ${testCaseRows.length} test cases.`);
        }
      } else {
        console.log(`   ✅ Inserted problem (no sample test cases found).`);
      }

    } catch (err) {
      console.error(`   ❌ Error processing ${item.name}:`, err.message);
    }

    // Delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\nFinished processing all problems!');
  process.exit(0);
}

run();
