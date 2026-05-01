const crypto = require('crypto');
const { supabaseAdmin } = require('../services/supabaseClient');
const { getOrSet, invalidate, invalidatePattern, KEYS } = require('../services/cacheService');
const { scrapeProblem: scrapeFromUrl } = require('../services/scraperService');

// Helper to check for duplicates in the problems array
const validateUniqueProblems = (problemsArray) => {
  if (!problemsArray || problemsArray.length === 0) return null;
  const seenIds = new Set();
  const seenTitles = new Set();
  const seenUrls = new Set();

  for (const p of problemsArray) {
    if (p.id) {
      if (seenIds.has(p.id)) return 'A contest cannot contain duplicate problems. Please ensure each problem is added only once.';
      seenIds.add(p.id);
    } else if (p.title) {
      const lowerTitle = p.title.toLowerCase();
      if (seenTitles.has(lowerTitle)) return `A contest cannot contain duplicate problems. The problem "${p.title}" was added multiple times.`;
      seenTitles.add(lowerTitle);
    } else if (p.url) {
      if (seenUrls.has(p.url)) return 'A contest cannot contain duplicate problems. Please ensure each problem URL is added only once.';
      seenUrls.add(p.url);
    }
  }
  return null;
};

// Helper to process and insert problems for a contest
const processProblemsForContest = async (contestId, problemsArray) => {
  if (!problemsArray || problemsArray.length === 0) return;

  const problemIds = problemsArray.filter(p => p.id).map(p => p.id);
  const problemTitles = problemsArray.filter(p => !p.id && p.title).map(p => p.title);

  let dbProblems = [];
  let dbTestCases = [];

  if (problemIds.length > 0 || problemTitles.length > 0) {
    let query = supabaseAdmin.from('problems').select('*');
    if (problemIds.length > 0 && problemTitles.length > 0) {
      query = query.or(`id.in.(${problemIds.join(',')}),title.in.("${problemTitles.join('","')}")`);
    } else if (problemIds.length > 0) {
      query = query.in('id', problemIds);
    } else {
      query = query.in('title', problemTitles);
    }

    const { data: probs } = await query;
    if (probs) dbProblems = probs;

    const matchedIds = dbProblems.map(dp => dp.id);
    if (matchedIds.length > 0) {
      const { data: tcs } = await supabaseAdmin
        .from('test_cases')
        .select('*')
        .in('problem_id', matchedIds)
        .eq('is_hidden', false)
        .order('order_index', { ascending: true });
      if (tcs) dbTestCases = tcs;
    }
  }

  const problemRows = problemsArray.map((p, i) => {
    const dbProb = p.id ? dbProblems.find(dp => dp.id === p.id) : dbProblems.find(dp => dp.title.toLowerCase() === p.title.toLowerCase());
    const tc = dbProb ? dbTestCases.filter(t => t.problem_id === dbProb.id) : [];

    return {
      contest_id: contestId,
      problem_title: dbProb ? dbProb.title : p.title,
      problem_url: p.url || '',
      order_index: i,
      scraped_content: dbProb ? dbProb.description : null,
      scraped_samples: tc && tc.length > 0 ? tc.map(t => ({ input: t.input, output: t.expected_output })) : null,
      scraped_at: dbProb ? new Date().toISOString() : null
    };
  });

  await supabaseAdmin.from('contest_problems').insert(problemRows);
};

// ==================== CREATE GLOBAL CONTEST (Admin Only) ====================
const createGlobalContest = async (req, res) => {
  const { name, description, start_time, end_time, duration_seconds, problems, freeze_time } = req.body;

  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'Name, start time, and end time are required' });
  }

  const duplicateError = validateUniqueProblems(problems);
  if (duplicateError) {
    return res.status(400).json({ error: duplicateError });
  }

  try {
    const { data: contest, error: contestError } = await supabaseAdmin
      .from('contests')
      .insert({
        name,
        description: description || '',
        type: 'global',
        visibility: 'public',
        start_time,
        end_time,
        duration_seconds: duration_seconds || null,
        creator_id: req.user.id,
        freeze_time: freeze_time || null,
      })
      .select()
      .single();

    if (contestError) {
      console.error('Create global contest error:', contestError);
      return res.status(500).json({ error: 'Failed to create contest: ' + contestError.message });
    }

    // Insert problems if provided
    await processProblemsForContest(contest.id, problems);

    invalidatePattern('contests:');
    return res.status(201).json({ message: 'Global contest created', contest });
  } catch (err) {
    console.error('Create global contest exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== CREATE LOCAL CONTEST (Any User) ====================
const createLocalContest = async (req, res) => {
  const { name, visibility, start_time, duration_seconds, problems } = req.body;

  if (!name || !start_time || !duration_seconds) {
    return res.status(400).json({ error: 'Name, start time, and duration are required' });
  }

  const duplicateError = validateUniqueProblems(problems);
  if (duplicateError) {
    return res.status(400).json({ error: duplicateError });
  }

  try {
    const invite_code = visibility === 'private' ? crypto.randomBytes(6).toString('hex') : null;

    // Calculate end_time from start_time + duration_seconds
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + duration_seconds * 1000);

    const { data: contest, error: contestError } = await supabaseAdmin
      .from('contests')
      .insert({
        name,
        description: '',
        type: 'local',
        visibility: visibility || 'public',
        start_time,
        end_time: endDate.toISOString(),
        duration_seconds,
        creator_id: req.user.id,
        invite_code,
      })
      .select()
      .single();

    if (contestError) {
      console.error('Create local contest error:', contestError);
      return res.status(500).json({ error: 'Failed to create contest: ' + contestError.message });
    }

    // Auto-join the creator
    await supabaseAdmin
      .from('contest_participants')
      .insert({ contest_id: contest.id, user_id: req.user.id });

    // Insert problems if provided
    await processProblemsForContest(contest.id, problems);

    invalidatePattern('contests:');
    return res.status(201).json({ message: 'Local contest created', contest });
  } catch (err) {
    console.error('Create local contest exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== GET CONTESTS ====================
const getContests = async (req, res) => {
  try {
    // Get all global contests + public local contests + user's private contests
    const { data: contests, error } = await supabaseAdmin
      .from('contests')
      .select('*, contest_participants(count)')
      .or(`type.eq.global,visibility.eq.public,creator_id.eq.${req.user.id}`)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Get contests error:', error);
      return res.status(500).json({ error: 'Failed to fetch contests' });
    }

    // Also get contests the user has joined
    const { data: joinedContestIds } = await supabaseAdmin
      .from('contest_participants')
      .select('contest_id')
      .eq('user_id', req.user.id);

    const joinedIds = (joinedContestIds || []).map(j => j.contest_id);
    let allContestIds = contests.map(c => c.id);
    const missingIds = joinedIds.filter(id => !allContestIds.includes(id));

    let finalContests = [...contests];

    if (missingIds.length > 0) {
      const { data: extraContests } = await supabaseAdmin
        .from('contests')
        .select('*, contest_participants(count)')
        .in('id', missingIds);

      if (extraContests) {
        finalContests = [...finalContests, ...extraContests];
      }
    }

    return res.status(200).json({ contests: finalContests });
  } catch (err) {
    console.error('Get contests exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== GET CONTEST BY ID ====================
const getContestById = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: contest, error } = await supabaseAdmin
      .from('contests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // Check access for private contests
    if (contest.visibility === 'private' && contest.creator_id !== req.user.id) {
      const { data: participation } = await supabaseAdmin
        .from('contest_participants')
        .select('id')
        .eq('contest_id', id)
        .eq('user_id', req.user.id)
        .single();

      if (!participation) {
        return res.status(403).json({ error: 'You do not have access to this private contest' });
      }
    }

    // Get problems
    const { data: problems } = await supabaseAdmin
      .from('contest_problems')
      .select('*')
      .eq('contest_id', id)
      .order('order_index', { ascending: true });

    // Get participants with user info
    const { data: participants } = await supabaseAdmin
      .from('contest_participants')
      .select('user_id, joined_at')
      .eq('contest_id', id);

    let participantDetails = [];
    if (participants && participants.length > 0) {
      const userIds = participants.map(p => p.user_id);
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, username, name, avatar_url')
        .in('id', userIds);

      participantDetails = participants.map(p => {
        const user = (users || []).find(u => u.id === p.user_id);
        return { ...p, user: user || null };
      });
    }

    return res.status(200).json({
      contest,
      problems: problems || [],
      participants: participantDetails,
    });
  } catch (err) {
    console.error('Get contest by id exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== UPDATE CONTEST ====================
const updateContest = async (req, res) => {
  const { id } = req.params;
  const { name, description, start_time, end_time, duration_seconds, visibility, freeze_time, problems } = req.body;

  if (problems !== undefined) {
    const duplicateError = validateUniqueProblems(problems);
    if (duplicateError) {
      return res.status(400).json({ error: duplicateError });
    }
  }

  try {
    // Check ownership or admin
    const { data: contest, error: fetchErr } = await supabaseAdmin
      .from('contests')
      .select('creator_id, start_time')
      .eq('id', id)
      .single();

    if (fetchErr || !contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    if (contest.creator_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the creator or admin can edit this contest' });
    }

    // Build update object
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    if (start_time !== undefined) {
      if (new Date() < new Date(contest.start_time)) {
        updates.start_time = start_time;
      } else {
        return res.status(400).json({ error: 'Cannot change start time of an active or past contest' });
      }
    }

    if (end_time !== undefined) updates.end_time = end_time;
    if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds;
    if (visibility !== undefined) updates.visibility = visibility;
    if (freeze_time !== undefined) updates.freeze_time = freeze_time;

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('contests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ error: 'Failed to update contest' });
    }

    // Update problems if provided
    if (problems !== undefined) {
      // Delete existing problems and re-insert
      await supabaseAdmin.from('contest_problems').delete().eq('contest_id', id);
      await processProblemsForContest(id, problems);
    }

    invalidate(KEYS.contest(id));
    invalidatePattern('contests:');
    invalidate(KEYS.leaderboard(id));

    return res.status(200).json({ message: 'Contest updated', contest: updated });
  } catch (err) {
    console.error('Update contest exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== DELETE CONTEST ====================
const deleteContest = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: contest, error: fetchErr } = await supabaseAdmin
      .from('contests')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (fetchErr || !contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    if (contest.creator_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the creator or admin can delete this contest' });
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('contests')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      return res.status(500).json({ error: 'Failed to delete contest' });
    }

    invalidate(KEYS.contest(id));
    invalidatePattern('contests:');

    return res.status(200).json({ message: 'Contest deleted' });
  } catch (err) {
    console.error('Delete contest exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== JOIN CONTEST ====================
const joinContest = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: contest, error: contestError } = await supabaseAdmin
      .from('contests')
      .select('id, visibility, creator_id')
      .eq('id', id)
      .single();

    if (contestError || !contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    if (contest.visibility === 'private' && contest.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'This is a private contest. Use an invite code to join.' });
    }

    const { data: existing } = await supabaseAdmin
      .from('contest_participants')
      .select('id')
      .eq('contest_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already joined this contest' });
    }

    const { error: joinError } = await supabaseAdmin
      .from('contest_participants')
      .insert({ contest_id: id, user_id: req.user.id });

    if (joinError) {
      return res.status(500).json({ error: 'Failed to join contest' });
    }

    invalidate(KEYS.contest(id));
    return res.status(200).json({ message: 'Successfully joined contest' });
  } catch (err) {
    console.error('Join contest exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== JOIN BY INVITE CODE ====================
const joinByInviteCode = async (req, res) => {
  const { invite_code } = req.body;

  if (!invite_code) {
    return res.status(400).json({ error: 'Invite code is required' });
  }

  try {
    const { data: contest, error } = await supabaseAdmin
      .from('contests')
      .select('id')
      .eq('invite_code', invite_code)
      .single();

    if (error || !contest) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const { data: existing } = await supabaseAdmin
      .from('contest_participants')
      .select('id')
      .eq('contest_id', contest.id)
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already joined this contest' });
    }

    const { error: joinError } = await supabaseAdmin
      .from('contest_participants')
      .insert({ contest_id: contest.id, user_id: req.user.id });

    if (joinError) {
      return res.status(500).json({ error: 'Failed to join contest' });
    }

    return res.status(200).json({ message: 'Successfully joined contest', contestId: contest.id });
  } catch (err) {
    console.error('Join by invite code exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== SCRAPE PROBLEM ====================
const scrapeProblemHandler = async (req, res) => {
  const { url, problem_id } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Problem URL is required' });
  }

  try {
    // Check cache first
    const cached = await getOrSet(KEYS.scrapedProblem(url), 3600, async () => {
      return await scrapeFromUrl(url);
    });

    // If problem_id provided, cache the content in DB too
    if (problem_id && cached) {
      await supabaseAdmin
        .from('contest_problems')
        .update({
          scraped_content: cached.statement,
          scraped_samples: cached.samples,
          scraped_at: new Date().toISOString(),
        })
        .eq('id', problem_id);
    }

    return res.status(200).json(cached);
  } catch (err) {
    console.error('Scrape problem error:', err);
    return res.status(500).json({
      error: 'Failed to scrape problem',
      details: err.message,
    });
  }
};

// ==================== SUBMIT SOLUTION ====================
const submitSolution = async (req, res) => {
  const { id } = req.params; // contest_id
  const { problem_id, language, code_text, solution_url } = req.body;

  if (!problem_id || !language) {
    return res.status(400).json({ error: 'Problem ID and language are required' });
  }

  if (!code_text && !solution_url) {
    return res.status(400).json({ error: 'Either code or solution URL is required' });
  }

  // Validate language
  const { SUPPORTED_LANGUAGES } = require('../services/judgeService');
  if (code_text && !SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}` });
  }

  try {
    // Verify contest and problem exist — also fetch problem_title for judge lookup
    const { data: contestProblem } = await supabaseAdmin
      .from('contest_problems')
      .select('id, contest_id, problem_title')
      .eq('id', problem_id)
      .eq('contest_id', id)
      .single();

    if (!contestProblem) {
      return res.status(404).json({ error: 'Problem not found in this contest' });
    }

    // Check user is a participant
    const { data: participant } = await supabaseAdmin
      .from('contest_participants')
      .select('id')
      .eq('contest_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!participant) {
      return res.status(403).json({ error: 'You must join the contest first' });
    }

    // Insert submission with status = 'pending'
    const { data: submission, error: subErr } = await supabaseAdmin
      .from('submissions')
      .insert({
        contest_id: id,
        problem_id,
        user_id: req.user.id,
        language,
        code_text: code_text || '',
        solution_url: solution_url || '',
        status: 'pending',
      })
      .select()
      .single();

    if (subErr) {
      return res.status(500).json({ error: 'Failed to submit solution' });
    }

    // Fire off async evaluation in background (don't await — return immediately)
    if (code_text) {
      const { evaluateSubmission } = require('../services/judgeService');
      evaluateSubmission(submission.id, contestProblem.problem_title, code_text, language)
        .then(() => invalidate(KEYS.leaderboard(id)))
        .catch(err => console.error('[SubmitSolution] Background evaluation failed:', err));
    }

    invalidate(KEYS.leaderboard(id));
    return res.status(201).json({ message: 'Solution submitted', submission });
  } catch (err) {
    console.error('Submit solution exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== GET SUBMISSION STATUS ====================
const getSubmissionStatus = async (req, res) => {
  const { subId } = req.params;

  try {
    const { data: submission, error } = await supabaseAdmin
      .from('submissions')
      .select('id, status')
      .eq('id', subId)
      .single();

    if (error || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.status(200).json(submission);
  } catch (err) {
    console.error('Get submission status exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== GET LEADERBOARD ====================
const getLeaderboard = async (req, res) => {
  const { id } = req.params;

  try {
    const cachedData = await getOrSet(KEYS.leaderboard(id), 10, async () => {
      // Get contest info for freeze time
      const { data: contest } = await supabaseAdmin
        .from('contests')
        .select('freeze_time, start_time, end_time')
        .eq('id', id)
        .single();

      // Get all submissions for this contest
      const { data: submissions } = await supabaseAdmin
        .from('submissions')
        .select('*, contest_problems(order_index, problem_title)')
        .eq('contest_id', id)
        .order('submitted_at', { ascending: true });

      // Get participants
      const { data: participants } = await supabaseAdmin
        .from('contest_participants')
        .select('user_id')
        .eq('contest_id', id);

      if (!participants) {
        return { leaderboard: [], frozen: false };
      }

      // Get user info
      const userIds = participants.map(p => p.user_id);
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, username, name, avatar_url')
        .in('id', userIds);

      const now = new Date();
      const freezeTime = contest?.freeze_time ? new Date(contest.freeze_time) : null;
      const isFrozen = freezeTime && now >= freezeTime;

      // Build leaderboard: count accepted problems per user, track penalty time
      // Build user stats
      const userStats = {};
      for (const p of participants) {
        userStats[p.user_id] = {
          user_id: p.user_id,
          user: (users || []).find(u => u.id === p.user_id) || null,
          solved: 0,
          penalty: 0,
          problems: {},
        };
      }

      // Pre-calculate first bloods (absolute earliest accepted submission per problem)
      const firstBloods = {};
      for (const sub of (submissions || [])) {
        if (sub.status !== 'accepted') continue;
        const problemIdx = sub.contest_problems?.order_index ?? 0;
        const problemKey = `p${problemIdx}`;
        if (!firstBloods[problemKey]) {
          firstBloods[problemKey] = sub.user_id;
        }
      }

      for (const sub of (submissions || [])) {
        const uid = sub.user_id;
        if (!userStats[uid]) continue;

        const problemIdx = sub.contest_problems?.order_index ?? 0;
        const problemKey = `p${problemIdx}`;

        // If frozen, hide submissions after freeze time
        if (isFrozen && new Date(sub.submitted_at) >= freezeTime) {
          if (!userStats[uid].problems[problemKey]) {
            userStats[uid].problems[problemKey] = { status: 'frozen', attempts: 0 };
          } else if (userStats[uid].problems[problemKey].status !== 'accepted') {
            userStats[uid].problems[problemKey].status = 'frozen';
          }
          continue;
        }

        if (!userStats[uid].problems[problemKey]) {
          userStats[uid].problems[problemKey] = { status: 'pending', attempts: 0 };
        }

        const prob = userStats[uid].problems[problemKey];

        if (prob.status === 'accepted') continue; // already solved

        prob.attempts++;

        if (sub.status === 'accepted') {
          prob.status = 'accepted';
          userStats[uid].solved++;
          // Penalty: minutes from contest start + 20min per wrong attempt
          const startTime = new Date(contest.start_time);
          const solveTimeMins = Math.max(0, Math.floor((new Date(sub.submitted_at) - startTime) / 60000));

          userStats[uid].penalty += solveTimeMins + (prob.attempts - 1) * 20;
          prob.solveTime = solveTimeMins;

          // Mark first blood
          if (firstBloods[problemKey] === uid) {
            prob.isFirstBlood = true;
          }
        } else {
          prob.status = sub.status;
        }
      }

      // Sort: most solved desc, then least penalty asc
      const leaderboard = Object.values(userStats)
        .sort((a, b) => b.solved - a.solved || a.penalty - b.penalty)
        .map((entry, rank) => ({ ...entry, rank: rank + 1 }));

      return { leaderboard, frozen: isFrozen };
    });

    return res.status(200).json(cachedData);
  } catch (err) {
    console.error('Get leaderboard exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== COMPILE SOLUTION (Syntax Check) ====================
const compileSolution = async (req, res) => {
  const { language, code_text } = req.body;

  if (!language || !code_text) {
    return res.status(400).json({ error: 'Language and code are required' });
  }

  try {
    const { checkSyntax } = require('../services/judgeService');
    const result = await checkSyntax(code_text, language);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Compile solution exception:', error);
    return res.status(500).json({ error: error.message || 'Compilation service unavailable' });
  }
};

module.exports = {
  createGlobalContest,
  createLocalContest,
  getContests,
  getContestById,
  updateContest,
  deleteContest,
  joinContest,
  joinByInviteCode,
  scrapeProblemHandler,
  compileSolution,
  submitSolution,
  getSubmissionStatus,
  getLeaderboard,
};
