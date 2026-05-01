require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ==========================================
// Custom Solvers to generate UNIQUE test cases
// ==========================================
const generators = {
  'watermelon': () => {
    const w = Math.floor(Math.random() * 100) + 1;
    const out = (w > 2 && w % 2 === 0) ? 'YES' : 'NO';
    return { input: `${w}`, expected_output: out };
  },
  'way too long words': () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const numWords = Math.floor(Math.random() * 5) + 1;
    let input = `${numWords}\n`;
    let output = '';
    for(let i=0; i<numWords; i++) {
      const len = Math.floor(Math.random() * 15) + 3;
      let w = '';
      for(let j=0; j<len; j++) w += chars[Math.floor(Math.random()*26)];
      input += `${w}\n`;
      if(len > 10) output += `${w[0]}${len-2}${w[len-1]}\n`;
      else output += `${w}\n`;
    }
    return { input: input.trim(), expected_output: output.trim() };
  },
  'team': () => {
    const n = Math.floor(Math.random() * 10) + 1;
    let input = `${n}\n`;
    let count = 0;
    for(let i=0; i<n; i++) {
      const a = Math.random() > 0.5 ? 1 : 0;
      const b = Math.random() > 0.5 ? 1 : 0;
      const c = Math.random() > 0.5 ? 1 : 0;
      input += `${a} ${b} ${c}\n`;
      if(a+b+c >= 2) count++;
    }
    return { input: input.trim(), expected_output: `${count}` };
  },
  'bit++': () => {
    const n = Math.floor(Math.random() * 10) + 1;
    let input = `${n}\n`;
    let x = 0;
    for(let i=0; i<n; i++) {
      const op = Math.random() > 0.5 ? 'X++' : '--X';
      input += `${op}\n`;
      if(op.includes('+')) x++; else x--;
    }
    return { input: input.trim(), expected_output: `${x}` };
  },
  'next round': () => {
    const n = Math.floor(Math.random() * 15) + 5;
    const k = Math.floor(Math.random() * n) + 1;
    let scores = [];
    for(let i=0; i<n; i++) scores.push(Math.floor(Math.random()*20));
    scores.sort((a,b)=>b-a);
    let input = `${n} ${k}\n${scores.join(' ')}`;
    const cutoff = scores[k-1];
    let ans = 0;
    for(let s of scores) if(s > 0 && s >= cutoff) ans++;
    return { input: input, expected_output: `${ans}` };
  },
  'beautiful matrix': () => {
    let mat = Array(5).fill(0).map(()=>Array(5).fill(0));
    const r = Math.floor(Math.random()*5);
    const c = Math.floor(Math.random()*5);
    mat[r][c] = 1;
    let input = mat.map(row => row.join(' ')).join('\n');
    let ans = Math.abs(r-2) + Math.abs(c-2);
    return { input, expected_output: `${ans}` };
  },
  'helpful maths': () => {
    const len = Math.floor(Math.random()*8)+1;
    let nums = [];
    for(let i=0; i<len; i++) nums.push(Math.floor(Math.random()*3)+1);
    let input = nums.join('+');
    nums.sort();
    return { input, expected_output: nums.join('+') };
  },
  'string task': () => {
    const len = Math.floor(Math.random()*15)+1;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let str = '';
    for(let i=0; i<len; i++) str += chars[Math.floor(Math.random()*chars.length)];
    let out = '';
    const vowels = new Set(['a','e','i','o','u','y','A','E','I','O','U','Y']);
    for(let char of str) {
      if(!vowels.has(char)) out += '.' + char.toLowerCase();
    }
    return { input: str, expected_output: out };
  },
  'domino piling': () => {
    const m = Math.floor(Math.random()*16)+1;
    const n = Math.floor(Math.random()*16)+1;
    return { input: `${m} ${n}`, expected_output: `${Math.floor((m*n)/2)}` };
  },
  'boy or girl': () => {
    const len = Math.floor(Math.random()*15)+5;
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let str = '';
    for(let i=0; i<len; i++) str += chars[Math.floor(Math.random()*26)];
    let unique = new Set(str).size;
    return { input: str, expected_output: unique % 2 === 0 ? 'CHAT WITH HER!' : 'IGNORE HIM!' };
  },
  'young physicist': () => {
    const n = Math.floor(Math.random() * 5) + 1;
    let sumX = 0, sumY = 0, sumZ = 0;
    let input = `${n}\n`;
    for(let i=0; i<n; i++) {
      const x = Math.floor(Math.random() * 20) - 10;
      const y = Math.floor(Math.random() * 20) - 10;
      const z = Math.floor(Math.random() * 20) - 10;
      sumX += x; sumY += y; sumZ += z;
      input += `${x} ${y} ${z}\n`;
    }
    const out = (sumX===0 && sumY===0 && sumZ===0) ? 'YES' : 'NO';
    return { input: input.trim(), expected_output: out };
  },
  'presents': () => {
    const n = Math.floor(Math.random() * 10) + 1;
    let arr = Array.from({length: n}, (_, i) => i + 1);
    // shuffle
    for(let i=arr.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    let ans = Array(n).fill(0);
    for(let i=0; i<n; i++) {
      ans[arr[i] - 1] = i + 1;
    }
    return { input: `${n}\n${arr.join(' ')}`, expected_output: ans.join(' ') };
  },
  'lucky division': () => {
    const n = Math.floor(Math.random() * 1000) + 1;
    const luckyNums = [4, 7, 44, 47, 74, 77, 444, 447, 474, 477, 744, 747, 774, 777];
    let isLucky = luckyNums.some(num => n % num === 0);
    return { input: `${n}`, expected_output: isLucky ? 'YES' : 'NO' };
  },
  'nearly lucky number': () => {
    let nStr = '';
    const len = Math.floor(Math.random() * 15) + 1;
    for(let i=0; i<len; i++) {
      nStr += Math.floor(Math.random() * 10);
    }
    let count = 0;
    for(let char of nStr) {
      if(char === '4' || char === '7') count++;
    }
    const isNearly = (count === 4 || count === 7);
    return { input: nStr, expected_output: isNearly ? 'YES' : 'NO' };
  },
  'insomnia cure': () => {
    const k = Math.floor(Math.random() * 10) + 1;
    const l = Math.floor(Math.random() * 10) + 1;
    const m = Math.floor(Math.random() * 10) + 1;
    const n = Math.floor(Math.random() * 10) + 1;
    const d = Math.floor(Math.random() * 100) + 1;
    let damaged = 0;
    for(let i=1; i<=d; i++) {
      if(i%k===0 || i%l===0 || i%m===0 || i%n===0) damaged++;
    }
    return { input: `${k}\n${l}\n${m}\n${n}\n${d}`, expected_output: `${damaged}` };
  }
};

async function run() {
  console.log("Cleaning up duplicated hidden test cases...");
  await supabaseAdmin.from('test_cases').delete().eq('is_hidden', true);

  const { data: problems } = await supabaseAdmin.from('problems').select('id, title');
  
  for (const problem of problems) {
    const titleLower = problem.title.toLowerCase();
    const generator = generators[titleLower];
    
    // Fetch sample cases just in case we need to fallback
    const { data: samples } = await supabaseAdmin
      .from('test_cases')
      .select('*')
      .eq('problem_id', problem.id)
      .eq('is_hidden', false);

    const testCasesToInsert = [];
    const casesNeeded = 40;

    for (let i = 0; i < casesNeeded; i++) {
      let tc;
      if (generator) {
        tc = generator(); // Truly unique generated case!
      } else {
        // Fallback: If we don't have a solver for this exact problem,
        // we lightly duplicate the sample, because generating true answers requires the logic.
        const sample = samples && samples.length > 0 ? samples[i % samples.length] : { input: '1', expected_output: '1' };
        tc = { input: sample.input, expected_output: sample.expected_output };
      }

      testCasesToInsert.push({
        problem_id: problem.id,
        input: tc.input,
        expected_output: tc.expected_output,
        is_sample: false,
        is_hidden: true,
        order_index: (samples ? samples.length : 0) + i
      });
    }

    const { error } = await supabaseAdmin.from('test_cases').insert(testCasesToInsert);
    if (!error) {
      console.log(`✅ Inserted 40 ${generator ? 'UNIQUE' : 'replicated'} hidden test cases for "${problem.title}"`);
    } else {
      console.error(`❌ Error inserting for ${problem.title}:`, error.message);
    }
  }

  console.log("Done generating unique test cases!");
}

run().then(() => process.exit(0));
