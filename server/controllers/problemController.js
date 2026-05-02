const { supabaseAdmin } = require('../services/supabaseClient');
const { getOrSet } = require('../services/cacheService');

// ==================== GET PROBLEMS (PAGINATED) ====================
const getProblems = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Calculate range
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Cache paginated problem grids for up to 30 seconds to obliterate 700ms cold boots
    const cacheKey = `problems:page${page}:limit${limit}`;
    const payload = await getOrSet(cacheKey, 30, async () => {
      // Fetch problems with pagination count
      const { data: problems, error, count } = await supabaseAdmin
        .from('problems')
        .select('id, title, difficulty, time_limit, memory_limit, created_at', { count: 'exact' })
        .is('forked_from_contest_problem', null)
        .order('created_at', { ascending: true })
        .range(from, to);

      if (error) {
        throw new Error('Failed to fetch problems from database');
      }

      return {
        problems: problems || [],
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      };
    });

    return res.status(200).json(payload);
  } catch (err) {
    console.error('Get problems exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== GET PROBLEM BY ID ====================
const getProblemById = async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch problem details
    const { data: problem, error: probError } = await supabaseAdmin
      .from('problems')
      .select('*')
      .eq('id', id)
      .single();

    if (probError || !problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Fetch associated public test cases only
    const { data: testCases, error: tcError } = await supabaseAdmin
      .from('test_cases')
      .select('*')
      .eq('problem_id', id)
      .eq('is_hidden', false)
      .order('order_index', { ascending: true });

    if (tcError) {
      console.error('Get test cases error:', tcError);
      // We don't fail completely if test cases fail, but we log it
    }

    return res.status(200).json({
      problem,
      testCases: testCases || []
    });
  } catch (err) {
    console.error('Get problem by id exception:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getProblems,
  getProblemById
};
