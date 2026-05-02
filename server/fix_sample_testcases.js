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

  const cfMap = new Map();
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

    if (!cfProb) continue;

    const url = `https://codeforces.com/contest/${cfProb.contestId}/problem/${cfProb.index}`;
    console.log(`\nRe-scraping samples for: ${item.name} (${url})`);

    try {
      const { data: existingProblem } = await supabaseAdmin
        .from('problems')
        .select('id')
        .eq('title', item.name)
        .single();
      
      if (!existingProblem) continue;

      const scraped = await scrapeProblem(url);
      
      if (scraped.samples && scraped.samples.length > 0) {
        // Delete old public test cases
        await supabaseAdmin
            .from('test_cases')
            .delete()
            .eq('problem_id', existingProblem.id)
            .eq('is_hidden', false);

        const testCaseRows = scraped.samples.map((s, idx) => ({
          problem_id: existingProblem.id,
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
          console.log(`   ✅ Restored ${testCaseRows.length} public test cases.`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Error processing ${item.name}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\nFinished updating public samples!');
  process.exit(0);
}

run();
