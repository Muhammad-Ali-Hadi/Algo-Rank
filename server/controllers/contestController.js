const crypto = require('crypto');
const { supabaseAdmin } = require('../services/supabaseClient');

const aliasCache = new Map();

// Resolves a short_id (6-digit numeric invite_code) back to a UUID, transparently.
const resolveContestId = async (idOrCode) => {
  if (!idOrCode) return null;
  if (idOrCode.length === 36) return idOrCode; // Standard UUID
  if (aliasCache.has(idOrCode)) return aliasCache.get(idOrCode);
  const { data } = await supabaseAdmin.from('contests').select('id').eq('invite_code', idOrCode).single();
  if (!data) throw new Error('Contest code not found or invalid.');
  aliasCache.set(idOrCode, data.id);
  return data.id;
};
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
    }

    if (p.title) {
      const lowerTitle = String(p.title).trim().toLowerCase().replace(/\s+/g, ' ');
      if (lowerTitle) {
        if (seenTitles.has(lowerTitle)) return `A contest cannot contain duplicate problems. The problem "${String(p.title).trim()}" was added multiple times.`;
        seenTitles.add(lowerTitle);
      }
    }

    if (p.url) {
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
  const problemTitles = problemsArray
    .filter(p => !p.id && p.title)
    .map(p => String(p.title).trim())
    .filter(Boolean);

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

  const normalizeTitle = (t) => String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const byCreatedAtAsc = (a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0);
  const pickDbProblemForPayload = (p) => {
    if (p?.id) {
      return dbProblems.find(dp => dp.id === p.id);
    }

    const target = normalizeTitle(p?.title);
    if (!target) return undefined;

    const candidates = dbProblems
      .filter(dp => normalizeTitle(dp?.title) === target)
      .sort(byCreatedAtAsc);

    if (candidates.length === 0) return undefined;

    // Critical: if both original + fork exist with the same title, always prefer
    // the original (non-fork) so forked statements can't leak into contests.
    const nonFork = candidates.find(dp => !dp?.forked_from_contest_problem);
    return nonFork || candidates[0];
  };

  const problemRows = problemsArray.map((p, i) => {
    const dbProb = pickDbProblemForPayload(p);
    const tc = dbProb ? dbTestCases.filter(t => t.problem_id === dbProb.id) : [];

    return {
      contest_id: contestId,
      problem_title: dbProb ? dbProb.title : String(p.title || '').trim(),
      problem_url: p.url || '',
      order_index: p.order_index !== undefined ? p.order_index : i,
      scraped_content: dbProb ? dbProb.description : null,
      scraped_samples: tc && tc.length > 0 ? tc.map(t => ({ input: t.input, output: t.expected_output })) : null,
      scraped_at: dbProb ? new Date().toISOString() : null
    };
  });

  await supabaseAdmin.from('contest_problems').insert(problemRows);
};

// ==================== CREATE GLOBAL CONTEST (Admin Only) ====================
const createGlobalContest = async (req, res) => {
  const { name, description, start_time, end_time, duration_seconds, problems, freeze_time, unfreeze_time } = req.body;

  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'Name, start time, and end time are required' });
  }

  const duplicateError = validateUniqueProblems(problems);
  if (duplicateError) {
    return res.status(400).json({ error: duplicateError });
  }

  try {
    const invite_code = Math.floor(100000 + Math.random() * 900000).toString();
    const contestPayload = {
      name,
      description: description || '',
      type: 'global',
      visibility: 'public',
      start_time,
      end_time,
      duration_seconds: duration_seconds || null,
      creator_id: req.user.id,
      freeze_time: freeze_time || null,
      invite_code,
    };

    if (unfreeze_time !== undefined) contestPayload.unfreeze_time = unfreeze_time;

    let { data: contest, error: contestError } = await supabaseAdmin
      .from('contests')
      .insert(contestPayload)
      .select()
      .single();

    if (contestError && contestError.message && contestError.message.includes('unfreeze_time')) {
      delete contestPayload.unfreeze_time;
      const retry = await supabaseAdmin.from('contests').insert(contestPayload).select().single();
      contest = retry.data;
      contestError = retry.error;
    }

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
  const { name, visibility, start_time, duration_seconds, problems, unfreeze_time } = req.body;

  if (!name || !start_time || !duration_seconds) {
    return res.status(400).json({ error: 'Name, start time, and duration are required' });
  }

  const duplicateError = validateUniqueProblems(problems);
  if (duplicateError) {
    return res.status(400).json({ error: duplicateError });
  }

  try {
    // Always assign a short numeric ID to all contests now for URL mapping
    const invite_code = Math.floor(100000 + Math.random() * 900000).toString();

    // Calculate end_time from start_time + duration_seconds
    const startDate = new Date(start_time);
    const endDate = new Date(startDate.getTime() + duration_seconds * 1000);

    const contestPayload = {
      name,
      description: '',
      type: 'local',
      visibility: visibility || 'public',
      start_time,
      end_time: endDate.toISOString(),
      duration_seconds,
      creator_id: req.user.id,
      freeze_time: req.body.freeze_time || null,
      invite_code,
    };

    if (unfreeze_time !== undefined) contestPayload.unfreeze_time = unfreeze_time;

    let { data: contest, error: contestError } = await supabaseAdmin
      .from('contests')
      .insert(contestPayload)
      .select()
      .single();

    if (contestError && contestError.message && contestError.message.includes('unfreeze_time')) {
      delete contestPayload.unfreeze_time;
      const retry = await supabaseAdmin.from('contests').insert(contestPayload).select().single();
      contest = retry.data;
      contestError = retry.error;
    }

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
    // Fire global fetch and joined fetch concurrently
    const [contestsRes, joinedRes] = await Promise.all([
      supabaseAdmin
        .from('contests')
        .select('*, contest_participants(count)')
        .or(`type.eq.global,visibility.eq.public,creator_id.eq.${req.user.id}`)
        .order('start_time', { ascending: false }),
      supabaseAdmin
        .from('contest_participants')
        .select('contest_id')
        .eq('user_id', req.user.id)
    ]);

    const { data: contests, error } = contestsRes;
    const { data: joinedContestIds } = joinedRes;

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
  try {
    const { id: rawId } = req.params;
    const id = await resolveContestId(rawId);
    const includeContent = req.query.includeProblemsContent === 'true';
    const problemSelectString = includeContent ? '*' : 'id, contest_id, problem_title, problem_url, order_index, scraped_at';

    // Run independent database reads concurrently
    const [contestRes, problemsRes, participantsRes] = await Promise.all([
      supabaseAdmin.from('contests').select('*').eq('id', id).single(),
      supabaseAdmin.from('contest_problems').select(problemSelectString).eq('contest_id', id).order('order_index', { ascending: true }),
      supabaseAdmin.from('contest_participants').select('user_id, joined_at').eq('contest_id', id)
    ]);

    const contest = contestRes.data;
    const problems = problemsRes.data;
    const participants = participantsRes.data;

    if (contestRes.error || !contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    // Check access for private contests
    if (contest.visibility === 'private' && contest.creator_id !== req.user.id) {
      const isParticipant = (participants || []).some(p => p.user_id === req.user.id);
      if (!isParticipant) {
        return res.status(403).json({ error: 'You do not have access to this private contest' });
      }
    }

    let participantDetails = [];
    if (participants && participants.length > 0) {
      const uids = participants.map(p => p.user_id);
      const { data: users } = await supabaseAdmin.from('users').select('id, username, name, avatar_url').in('id', uids);
      participantDetails = participants.map(p => ({
        ...p,
        user: (users || []).find(u => u.id === p.user_id) || null
      }));
    }

    // Shield problem details securely if the contest hasn't launched yet
    const nowServer = new Date();
    const isUpcoming = new Date(contest.start_time) > nowServer;
    const isCreatorOrAdmin = contest.creator_id === req.user.id || req.user.isAdmin;
    
    let visibleProblems = problems || [];
    if (isUpcoming && !isCreatorOrAdmin) {
      visibleProblems = [];
    }

    return res.status(200).json({
      contest,
      problems: visibleProblems,
      participants: participantDetails,
      server_time: nowServer.toISOString(),
    });
  } catch (err) {
    console.error('Get contest by id exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== UPDATE CONTEST ====================
const updateContest = async (req, res) => {
  try {
    const { id: rawId } = req.params;
    const id = await resolveContestId(rawId);
    const { name, description, start_time, end_time, duration_seconds, visibility, freeze_time, unfreeze_time, problems } = req.body;

    if (problems !== undefined) {
      const duplicateError = validateUniqueProblems(problems);
      if (duplicateError) {
        return res.status(400).json({ error: duplicateError });
      }
    }

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
      if (new Date(start_time).getTime() !== new Date(contest.start_time).getTime()) {
        if (new Date() < new Date(contest.start_time)) {
          updates.start_time = start_time;
        } else {
          return res.status(400).json({ error: 'Cannot change start time of an active or past contest' });
        }
      }
    }

    if (end_time !== undefined) updates.end_time = end_time;
    if (duration_seconds !== undefined) updates.duration_seconds = duration_seconds;
    if (visibility !== undefined) updates.visibility = visibility;
    if (freeze_time !== undefined) updates.freeze_time = freeze_time;
    if (unfreeze_time !== undefined) updates.unfreeze_time = unfreeze_time;

    let { data: updated, error: updateErr } = await supabaseAdmin
      .from('contests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateErr && updateErr.message && updateErr.message.includes('unfreeze_time')) {
      delete updates.unfreeze_time;
      const retry = await supabaseAdmin.from('contests').update(updates).eq('id', id).select().single();
      updated = retry.data;
      updateErr = retry.error;
    }

    if (updateErr) {
      console.error('Update contest error payload:', updateErr);
      return res.status(500).json({ error: 'Failed to update contest' });
    }

    // Update problems if provided, rigorously preserving UUIDs to retain active submissions
    if (problems !== undefined) {
      const { data: existingCP } = await supabaseAdmin.from('contest_problems').select('id, problem_title').eq('contest_id', id);
      const existingMap = new Map((existingCP || []).map(p => [p.problem_title.toLowerCase(), p.id]));
      
      const payloadTitles = problems.map(p => p.title.toLowerCase());
      
      const toDelete = (existingCP || []).filter(cp => !payloadTitles.includes(cp.problem_title.toLowerCase())).map(cp => cp.id);
      if (toDelete.length > 0) {
        await supabaseAdmin.from('contest_problems').delete().in('id', toDelete);
      }
      
      const newProblems = problems
        .map((p, i) => ({ ...p, order_index: i }))
        .filter(p => !existingMap.has(p.title.toLowerCase()));
      
      if (newProblems.length > 0) {
        // Find existing database rows to pull `description` accurately for new elements
        await processProblemsForContest(id, newProblems);
      }
      
      // Iterate entire array to fix alignment configurations safely without database row deletions
      for (let i = 0; i < problems.length; i++) {
        const p = problems[i];
        const existingId = existingMap.get(p.title.toLowerCase());
        if (existingId) {
          await supabaseAdmin.from('contest_problems').update({ order_index: i }).eq('id', existingId);
        }
      }
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
  try {
    const { id: rawId } = req.params;
    const id = await resolveContestId(rawId);
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
  try {
    const { id: rawId } = req.params;
    const id = await resolveContestId(rawId);

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
  const { id: rawId } = req.params; // contest_id
  const id = await resolveContestId(rawId);
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
      evaluateSubmission(submission.id, contestProblem.id, contestProblem.problem_title, code_text, language)
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
  try {
    const { id: rawId } = req.params;
    const id = await resolveContestId(rawId);
    const cachedData = await getOrSet(KEYS.leaderboard(id), 10, async () => {
      // Run independent data reads concurrently without strictly mapping unfreeze_time explicitly directly to prevent fatal crashes if column missing
      const [contestRes, submissionsRes, participantsRes] = await Promise.all([
        supabaseAdmin.from('contests').select('*').eq('id', id).single(),
        supabaseAdmin.from('submissions').select('*, contest_problems(order_index, problem_title)').eq('contest_id', id).order('submitted_at', { ascending: true }),
        supabaseAdmin.from('contest_participants').select('*').eq('contest_id', id)
      ]);

      const contest = contestRes.data;
      const submissions = submissionsRes.data;
      const participants = participantsRes.data;

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
      const unfreezeTime = contest?.unfreeze_time ? new Date(contest.unfreeze_time) : null;
      
      const isFrozen = freezeTime && now >= freezeTime && (!unfreezeTime || now < unfreezeTime);

      // Build leaderboard: count accepted problems per user, track penalty time
      // Build user stats
      const userStats = {};
      for (const p of participants) {
        userStats[p.user_id] = {
          user_id: p.user_id,
          is_disqualified: p.is_disqualified || false,
          user: (users || []).find(u => u.id === p.user_id) || null,
          solved: 0,
          penalty: 0,
          maxSolveTimeSeconds: 0, // Tie-breaker: actual time of last AC submission
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
            userStats[uid].problems[problemKey] = { status: 'frozen', attempts: 0, submission_id: sub.id };
          } else if (userStats[uid].problems[problemKey].status !== 'accepted') {
            userStats[uid].problems[problemKey].status = 'frozen';
            userStats[uid].problems[problemKey].submission_id = sub.id;
          }
          continue;
        }

        if (!userStats[uid].problems[problemKey]) {
          userStats[uid].problems[problemKey] = { status: 'pending', attempts: 0 };
        }

        const prob = userStats[uid].problems[problemKey];

        if (prob.status === 'accepted') continue; // already solved

        prob.attempts++;
        const startTime = new Date(contest.start_time);
        const solveTimeMins = Math.max(0, Math.floor((new Date(sub.submitted_at) - startTime) / 60000));
        const solveTimeSecs = Math.max(0, Math.floor((new Date(sub.submitted_at) - startTime) / 1000));

        // Always store the metadata for the most recent un-accepted submission
        prob.solveTime = solveTimeMins;
        prob.solveTimeSeconds = solveTimeSecs;

        if (sub.status === 'accepted') {
          prob.status = 'accepted';
          userStats[uid].solved++;
          // Penalty: minutes from contest start + 20min per wrong attempt
          userStats[uid].penalty += solveTimeMins + (prob.attempts - 1) * 20;
          // Tie-breaker: track max solve time in seconds
          userStats[uid].maxSolveTimeSeconds = Math.max(userStats[uid].maxSolveTimeSeconds, solveTimeSecs);

          // Mark first blood
          if (firstBloods[problemKey] === uid) {
            prob.isFirstBlood = true;
          }
          prob.submission_id = sub.id;
        } else {
          prob.status = sub.status;
          prob.submission_id = sub.id;
        }
      }

      // Filter out participants who haven't made any submissions (unless disqualified, we want to show them)
      let leaderboard = Object.values(userStats).filter(u => Object.keys(u.problems).length > 0 || u.is_disqualified);

      // Separate disqualified and normal users
      const normalUsers = leaderboard.filter(u => !u.is_disqualified);
      const disqualifiedUsers = leaderboard.filter(u => u.is_disqualified);

      // Sort normal users by:
      // 1. Solved problems (desc)
      // 2. Penalty (asc)
      // 3. Max solve time in seconds (asc) - Tie-breaker
      const sortedNormal = normalUsers.sort((a, b) => 
        b.solved - a.solved || 
        a.penalty - b.penalty || 
        a.maxSolveTimeSeconds - b.maxSolveTimeSeconds
      ).map((entry, index) => ({ ...entry, rank: index + 1 }));

      // Disqualified users get rank '-'
      const sortedDisqualified = disqualifiedUsers.map(entry => ({ ...entry, rank: '-' }));

      leaderboard = [...sortedNormal, ...sortedDisqualified];

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

// ==================== FORK PROBLEM ====================
const forkProblem = async (req, res) => {
  try {
    const { id: rawId, problemId } = req.params;
    const id = await resolveContestId(rawId);

    // 1. Validate contest exists and is upcoming
    const { data: contest, error: contestErr } = await supabaseAdmin
      .from('contests')
      .select('id, start_time')
      .eq('id', id)
      .single();

    if (contestErr || !contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    const now = new Date();
    if (now >= new Date(contest.start_time)) {
      return res.status(400).json({ error: 'Cannot fork problems after the contest has started. Forking is only available during the scheduling phase.' });
    }

    // 2. Validate the contest_problem exists in this contest
    const { data: contestProblem, error: cpErr } = await supabaseAdmin
      .from('contest_problems')
      .select('*')
      .eq('id', problemId)
      .eq('contest_id', id)
      .single();

    if (cpErr || !contestProblem) {
      return res.status(404).json({ error: 'Problem not found in this contest' });
    }

    // 3. Check for duplicate fork (same user, same contest_problem)
    const { data: existingFork } = await supabaseAdmin
      .from('problems')
      .select('id, title, description')
      .eq('creator_id', req.user.id)
      .eq('forked_from_contest_problem', problemId)
      .single();

    if (existingFork) {
      return res.status(200).json({
        message: 'Existing fork found',
        fork: existingFork,
      });
    }

    // 4. Try to find metadata from the original problem bank (matched by title)
    const { data: originalProblem } = await supabaseAdmin
      .from('problems')
      .select('id, difficulty, time_limit, memory_limit')
      .eq('title', contestProblem.problem_title)
      .is('forked_from_contest_problem', null)
      .single();

    // 5. Create the forked problem in the problems table
    const { data: forkedProblem, error: insertErr } = await supabaseAdmin
      .from('problems')
      .insert({
        title: contestProblem.problem_title,
        description: contestProblem.scraped_content || '',
        difficulty: originalProblem?.difficulty || null,
        time_limit: originalProblem?.time_limit || 1000,
        memory_limit: originalProblem?.memory_limit || 256,
        creator_id: req.user.id,
        forked_from_contest_problem: contestProblem.id,
      })
      .select()
      .single();

    if (insertErr) {
      // Handle unique constraint violation gracefully by returning existing
      if (insertErr.code === '23505') {
        const { data: reFetch } = await supabaseAdmin
          .from('problems')
          .select('*')
          .eq('creator_id', req.user.id)
          .eq('forked_from_contest_problem', problemId)
          .single();
        return res.status(200).json({ message: 'Existing fork retrieved', fork: reFetch });
      }
      console.error('Fork problem insert error details:', {
        code: insertErr.code,
        message: insertErr.message,
        details: insertErr.details,
        hint: insertErr.hint
      });
      
      if (insertErr.code === '42703') { // Undefined column
        return res.status(500).json({ error: 'Database schema mismatch. Please ensure you have run the migration in fork_migration.sql to add creator_id and forked_from_contest_problem columns.' });
      }
      
      return res.status(500).json({ error: `Failed to create forked problem: ${insertErr.message}` });
    }

    // 6. Copy sample test cases from scraped_samples JSON → test_cases rows
    const testCaseRows = [];

    if (contestProblem.scraped_samples && Array.isArray(contestProblem.scraped_samples)) {
      contestProblem.scraped_samples.forEach((sample, idx) => {
        testCaseRows.push({
          problem_id: forkedProblem.id,
          input: sample.input || '',
          expected_output: sample.output || '',
          is_hidden: false,
          order_index: idx,
        });
      });
    }

    // 7. Copy hidden test cases if original problem was found
    if (originalProblem) {
      const { data: hiddenTCs } = await supabaseAdmin
        .from('test_cases')
        .select('*')
        .eq('problem_id', originalProblem.id)
        .eq('is_hidden', true)
        .order('order_index', { ascending: true });

      if (hiddenTCs && hiddenTCs.length > 0) {
        const startIdx = testCaseRows.length;
        hiddenTCs.forEach((tc, idx) => {
          testCaseRows.push({
            problem_id: forkedProblem.id,
            input: tc.input,
            expected_output: tc.expected_output,
            is_hidden: true,
            order_index: startIdx + idx,
          });
        });
      }
    }

    // Insert all test cases at once
    if (testCaseRows.length > 0) {
      const { error: tcErr } = await supabaseAdmin
        .from('test_cases')
        .insert(testCaseRows);

      if (tcErr) {
        console.error('Fork test cases insert error:', tcErr);
        // Don't fail the whole operation — problem was created, test cases can be retried
      }
    }

    return res.status(201).json({
      message: 'Problem forked successfully',
      fork: forkedProblem,
      testCasesCopied: testCaseRows.length,
    });
  } catch (err) {
    console.error('Fork problem exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== UPDATE FORK DESCRIPTION ====================
const updateForkDescription = async (req, res) => {
  try {
    const { forkId } = req.params;
    const { description } = req.body;

    if (description === undefined || description === null) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // 1. Fetch the fork and validate it IS a fork
    const { data: fork, error: fetchErr } = await supabaseAdmin
      .from('problems')
      .select('id, creator_id, forked_from_contest_problem')
      .eq('id', forkId)
      .single();

    if (fetchErr || !fork) {
      return res.status(404).json({ error: 'Forked problem not found' });
    }

    if (!fork.forked_from_contest_problem) {
      return res.status(400).json({ error: 'This problem is not a fork. Only forked problems can be edited this way.' });
    }

    // 2. Validate ownership of the fork
    if (fork.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit forks that you created' });
    }

    // 3. Update ONLY the description in the problems table
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('problems')
      .update({ description })
      .eq('id', forkId)
      .select()
      .single();

    if (updateErr) {
      console.error('Update fork description error:', updateErr);
      return res.status(500).json({ error: 'Failed to update fork description' });
    }

    // 4. SYNC TO CONTEST: If the user is the creator of the contest associated with this fork,
    // update the scraped_content in contest_problems so it's visible to participants.
    try {
      const { data: contestProblem } = await supabaseAdmin
        .from('contest_problems')
        .select('id, contest_id')
        .eq('id', fork.forked_from_contest_problem)
        .single();

      if (contestProblem) {
        const { data: contest } = await supabaseAdmin
          .from('contests')
          .select('id, creator_id')
          .eq('id', contestProblem.contest_id)
          .single();

        if (contest && (contest.creator_id === req.user.id || req.user.isAdmin)) {
          // Sync the description to the contest
          await supabaseAdmin
            .from('contest_problems')
            .update({ scraped_content: description })
            .eq('id', contestProblem.id);
          
          console.log(`Synced fork ${forkId} to contest problem ${contestProblem.id}`);
        }
      }
    } catch (syncErr) {
      console.error('Failed to sync fork description to contest:', syncErr);
      // Don't fail the primary request
    }

    return res.status(200).json({
      message: 'Fork description updated',
      fork: updated,
    });
  } catch (err) {
    console.error('Update fork description exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== DISQUALIFY PARTICIPANT ====================
const disqualifyParticipant = async (req, res) => {
  const { id: rawId, userId } = req.params;
  try {
    const id = await resolveContestId(rawId);
    
    // Authorize owner
    const { data: contest } = await supabaseAdmin.from('contests').select('creator_id').eq('id', id).single();
    if (!contest || (contest.creator_id !== req.user.id && !req.user.isAdmin)) {
      return res.status(403).json({ error: 'Only contest owner or admin can disqualify' });
    }

    // Get current disqualify status to toggle
    const { data: participant } = await supabaseAdmin.from('contest_participants').select('*').eq('contest_id', id).eq('user_id', userId).single();
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // This may fail if the user didn't run the SQL migration to add is_disqualified column!
    const { error } = await supabaseAdmin.from('contest_participants').update({ is_disqualified: !(participant.is_disqualified || false) }).eq('contest_id', id).eq('user_id', userId);
    
    if (error) {
      if (error.code === '42703') {
         return res.status(500).json({ error: 'Database column is_disqualified missing. Please run the SQL migration manually.' });
      }
      throw error;
    }
    
    invalidate(KEYS.leaderboard(id));
    return res.status(200).json({ message: 'Disqualification status updated' });
  } catch (err) {
    console.error('Disqualify exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== GET SUBMISSION CODE ====================
const getSubmissionCode = async (req, res) => {
  const { id: rawId, subId } = req.params;
  try {
    const id = await resolveContestId(rawId);

    const { data: contest } = await supabaseAdmin.from('contests').select('creator_id, end_time').eq('id', id).single();
    if (!contest) return res.status(404).json({ error: 'Contest not found' });

    // Fetch submission + related contest problem info
    const { data: submission, error: subError } = await supabaseAdmin.from('submissions')
      .select('*, contest_problems(problem_title)')
      .eq('id', subId)
      .single();

    if (subError || !submission) {
      console.error('[getSubmissionCode] Submission fetch error:', subError);
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Separately fetch user info
    const { data: user } = await supabaseAdmin.from('users')
      .select('name, username, avatar_url')
      .eq('id', submission.user_id)
      .single();

    submission.users = user || null;

    const isOwner = String(contest.creator_id) === String(req.user.id) || req.user.isAdmin;
    const isEnded = new Date(contest.end_time) < new Date();
    const isSelf = String(submission.user_id) === String(req.user.id);

    console.log(`[getSubmissionCode] isOwner=${isOwner}, isEnded=${isEnded}, isSelf=${isSelf}, creator_id=${contest.creator_id}, user.id=${req.user.id}`);

    if (!isOwner && !isEnded && !isSelf) {
      return res.status(403).json({ error: 'You do not have permission to view this submission. Codes are open-sourced to everyone after the contest ends.' });
    }

    return res.status(200).json(submission);
  } catch (err) {
    console.error('Get submission code exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
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
  forkProblem,
  updateForkDescription,
  disqualifyParticipant,
  getSubmissionCode,
};
