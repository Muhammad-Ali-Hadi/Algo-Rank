/**
 * ============================================================
 *  AlgoRank — Judge0 Integration & Submission Evaluation Engine
 * ============================================================
 *
 * This service implements a Codeforces-style judging pipeline:
 *   1. Judge0 handles compilation + execution (syntax / runtime errors)
 *   2. Our backend handles logical correctness via output comparison
 *   3. Final verdict is determined by our system, NOT by Judge0
 *
 * Verdicts: Accepted | Wrong Answer | Compilation Error |
 *           Runtime Error | Time Limit Exceeded
 */

const { supabaseAdmin } = require('./supabaseClient');
const NodeCache = require('node-cache');

// ─── Configuration ───────────────────────────────────────────
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';
const JUDGE0_TIMEOUT = parseFloat(process.env.JUDGE0_TIMEOUT || '5'); // seconds per test case

// ─── Language Map (Judge0 IDs) ───────────────────────────────
const LANGUAGE_MAP = {
  'C':          50,   // GCC 9.2.0
  'C++':        54,   // G++ 9.2.0
  'Java':       62,   // OpenJDK 13.0.1
  'Python 3':   71,   // Python 3.8.1
  'JavaScript': 63,   // Node.js 12.14.0
};

const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP);

// ─── Test Case Cache (avoids repeated DB calls) ──────────────
const testCaseCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 min TTL

// ─── Helpers ─────────────────────────────────────────────────

/** Base64 encode a string */
const b64Encode = (str) => Buffer.from(str || '').toString('base64');

/** Base64 decode a string (returns '' on null/undefined) */
const b64Decode = (str) => str ? Buffer.from(str, 'base64').toString('utf-8') : '';

/** Build standard headers for Judge0 */
function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (JUDGE0_API_KEY) {
    headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
    headers['X-RapidAPI-Host'] = new URL(JUDGE0_API_URL).host;
  }
  return headers;
}

/**
 * Normalize output for comparison.
 * - Trim leading/trailing whitespace
 * - Normalize line endings to \n
 * - Remove trailing empty lines
 * - Collapse multiple trailing newlines
 */
function normalizeOutput(str) {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')   // Windows → Unix line endings
    .replace(/\r/g, '\n')     // Old Mac → Unix
    .split('\n')
    .map(line => line.trimEnd()) // Remove trailing spaces per line
    .join('\n')
    .trim();                   // Remove leading/trailing whitespace
}

/**
 * Map a Judge0 status ID to our internal verdict string.
 *
 * Judge0 statuses:
 *  1 = In Queue, 2 = Processing, 3 = Accepted,
 *  4 = Wrong Answer, 5 = Time Limit Exceeded,
 *  6 = Compilation Error, 7-12 = Runtime Errors,
 *  13 = Internal Error, 14 = Exec Format Error
 */
function mapJ0Status(statusId) {
  switch (statusId) {
    case 3:  return 'accepted';
    case 4:  return 'wrong_answer';
    case 5:  return 'time_limit';
    case 6:  return 'compile_error';
    case 7:  case 8:  case 9:
    case 10: case 11: case 12:
      return 'runtime_error';
    case 13: case 14:
      return 'runtime_error';
    default: return 'wrong_answer';
  }
}

// ─── Test Case Fetching ──────────────────────────────────────

/**
 * Fetch ALL test cases for a problem (hidden + visible).
 * Results are cached for 5 minutes per problem.
 */
async function fetchAllTestCases(problemId) {
  const cacheKey = `tc:${problemId}`;
  const cached = testCaseCache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabaseAdmin
    .from('test_cases')
    .select('id, input, expected_output, is_hidden, order_index')
    .eq('problem_id', problemId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('[JudgeService] Failed to fetch test cases:', error.message);
    return [];
  }

  const cases = data || [];
  testCaseCache.set(cacheKey, cases);
  return cases;
}

// ─── Core: Single Execution via Judge0 ───────────────────────

/**
 * Execute code against a single input via Judge0 (synchronous wait mode).
 * Returns { statusId, stdout, stderr, compile_output, time, memory }
 */
async function executeOnJudge0(code, languageId, stdin) {
  const payload = {
    source_code: b64Encode(code),
    language_id: languageId,
    stdin: b64Encode(stdin),
    cpu_time_limit: JUDGE0_TIMEOUT,
    wall_time_limit: JUDGE0_TIMEOUT * 2,
  };

  const headers = buildHeaders();
  const res = await fetch(
    `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true&fields=status_id,stdout,stderr,compile_output,time,memory`,
    { method: 'POST', headers, body: JSON.stringify(payload) }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('[JudgeService] Judge0 HTTP error:', res.status, text);
    if (res.status === 401 || res.status === 403) {
      throw new Error('Judge0 API authentication failed. Check your JUDGE0_API_KEY.');
    }
    throw new Error(`Judge0 request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    statusId: data.status_id,
    stdout:         b64Decode(data.stdout),
    stderr:         b64Decode(data.stderr),
    compile_output: b64Decode(data.compile_output),
    time:   data.time,
    memory: data.memory,
  };
}

// ─── Public API: Compile (Syntax Check) ──────────────────────

/**
 * Check code for syntax/compilation errors.
 * Sends a minimal execution request to Judge0.
 * Returns { success: bool, error?: string, message?: string }
 */
async function checkSyntax(code, language) {
  const languageId = LANGUAGE_MAP[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  const result = await executeOnJudge0(code, languageId, '');

  // Compilation Error (status 6)
  if (result.statusId === 6) {
    return {
      success: false,
      error: result.compile_output || 'Compilation Error',
    };
  }

  // Runtime errors — for interpreted languages (Python, JS) syntax errors manifest here
  if (result.statusId >= 7 && result.statusId <= 12) {
    const errMsg = result.stderr || result.compile_output || '';

    // An EOFError in Python means the code is syntactically valid but needs stdin
    if (errMsg.includes('EOFError') || errMsg.includes('NoSuchElementException')) {
      return { success: true, message: 'Code compiled successfully.' };
    }

    // Actual syntax error in interpreted language
    return {
      success: false,
      error: errMsg || 'Runtime Error during compilation check',
    };
  }

  // Time Limit (code was waiting for input — it compiled fine)
  if (result.statusId === 5) {
    return { success: true, message: 'Code compiled successfully.' };
  }

  // Status 3 (Accepted) or 4 (Wrong Answer with no input) — both mean it compiled
  return { success: true, message: 'Code compiled successfully.' };
}

// ─── Public API: Full Submission Evaluation ──────────────────

/**
 * Evaluate a submission against ALL test cases (hidden + visible).
 * This runs asynchronously in the background after the HTTP response.
 *
 * Flow:
 *  1. Fetch all test cases for the problem
 *  2. Iterate sequentially, executing each via Judge0
 *  3. Compare stdout with expected_output (our own logic)
 *  4. Early-exit on first failure
 *  5. Update submission row with final verdict
 *
 * @param {string} submissionId      - UUID of the submission row
 * @param {string} contestProblemId - UUID of the contest_problems row
 * @param {string} problemTitle      - Title of the problem
 * @param {string} code              - Source code
 * @param {string} language          - Language name (e.g. "C++")
 */
async function evaluateSubmission(submissionId, contestProblemId, problemTitle, code, language) {
  const languageId = LANGUAGE_MAP[language];
  if (!languageId) {
    await updateSubmissionStatus(submissionId, 'compile_error');
    return;
  }

  try {
    // 1. Resolve the problem from the problems bank
    // First, try to find a fork specifically for this contest problem
    let { data: problem } = await supabaseAdmin
      .from('problems')
      .select('id, time_limit')
      .eq('forked_from_contest_problem', contestProblemId)
      .single();

    // If no fork, fallback to searching by title in the global bank (where forked_from is null)
    if (!problem) {
      const { data: globalProb } = await supabaseAdmin
        .from('problems')
        .select('id, time_limit')
        .eq('title', problemTitle)
        .is('forked_from_contest_problem', null)
        .single();
      problem = globalProb;
    }

    if (!problem) {
      console.warn(`[JudgeService] No problem found in bank for title: "${problemTitle}". Marking WA to prevent false AC.`);
      await updateSubmissionStatus(submissionId, 'wrong_answer');
      return;
    }

    // 2. Fetch all test cases (cached)
    const testCases = await fetchAllTestCases(problem.id);

    if (testCases.length === 0) {
      console.warn(`[JudgeService] No test cases for problem "${problemTitle}". Marking WA.`);
      await updateSubmissionStatus(submissionId, 'wrong_answer');
      return;
    }

    console.log(`[JudgeService] Evaluating submission ${submissionId.slice(0,8)}... against ${testCases.length} test cases`);

    // 3. Execute concurrently in chunks (e.g., 5 at a time) to drastically reduce turnaround time
    const CHUNK_SIZE = 5;
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i += CHUNK_SIZE) {
      const chunk = testCases.slice(i, i + CHUNK_SIZE);
      
      const chunkResults = await Promise.allSettled(
        chunk.map(tc => executeOnJudge0(code, languageId, tc.input || ''))
      );

      for (let j = 0; j < chunk.length; j++) {
        const tc = chunk[j];
        const res = chunkResults[j];

        if (res.status === 'rejected') {
          console.error(`[JudgeService] Judge0 execution failed for TC ${tc.order_index}:`, res.reason.message);
          await updateSubmissionStatus(submissionId, 'runtime_error');
          return;
        }

        const result = res.value;

        // Check for compilation error
        if (result.statusId === 6) {
          await updateSubmissionStatus(submissionId, 'compile_error');
          return;
        }

        // Check for runtime error
        if (result.statusId >= 7 && result.statusId <= 12) {
          await updateSubmissionStatus(submissionId, 'runtime_error');
          return;
        }

        // Check for TLE
        if (result.statusId === 5) {
          await updateSubmissionStatus(submissionId, 'time_limit');
          return;
        }

        // Check for internal Judge0 error
        if (result.statusId === 13 || result.statusId === 14) {
          await updateSubmissionStatus(submissionId, 'runtime_error');
          return;
        }

        // Logical correctness: compare stdout with expected output
        const actual   = normalizeOutput(result.stdout);
        const expected = normalizeOutput(tc.expected_output);

        if (actual !== expected) {
          console.log(`[JudgeService] Wrong Answer on TC ${tc.order_index} (hidden: ${tc.is_hidden})`);
          await updateSubmissionStatus(submissionId, 'wrong_answer');
          return; // Early exit
        }

        passedCount++;
      }
    }

    // 4. All test cases passed
    console.log(`[JudgeService] ✅ All ${passedCount}/${testCases.length} test cases passed for submission ${submissionId.slice(0,8)}`);
    await updateSubmissionStatus(submissionId, 'accepted');

  } catch (error) {
    console.error('[JudgeService] Evaluation error:', error);
    await updateSubmissionStatus(submissionId, 'runtime_error');
  }
}

// ─── Database Update ─────────────────────────────────────────

async function updateSubmissionStatus(submissionId, status) {
  const { error } = await supabaseAdmin
    .from('submissions')
    .update({ status })
    .eq('id', submissionId);

  if (error) {
    console.error(`[JudgeService] Failed to update submission ${submissionId} to ${status}:`, error.message);
  } else {
    console.log(`[JudgeService] Submission ${submissionId.slice(0,8)}... → ${status.toUpperCase()}`);
  }
}

// ─── Exports ─────────────────────────────────────────────────

module.exports = {
  checkSyntax,
  evaluateSubmission,
  SUPPORTED_LANGUAGES,
  LANGUAGE_MAP,
};
