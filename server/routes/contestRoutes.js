const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { submissionLimiter } = require('../middleware/rateLimiter');
const {
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
} = require('../controllers/contestController');

// All contest routes require authentication
router.use(authMiddleware);

// Global contest creation (admin only)
router.post('/global', adminMiddleware, createGlobalContest);

// Local contest creation (any authenticated user)
router.post('/local', createLocalContest);

// List all visible contests
router.get('/', getContests);

// Scrape a problem from URL
router.post('/scrape-problem', scrapeProblemHandler);

// Join a contest by invite code
router.post('/join-invite', joinByInviteCode);

// Compile code (Syntax Check)
router.post('/compile', compileSolution);

// Get submission status
router.get('/submissions/:subId', getSubmissionStatus);

// Fork routes (must be before /:id catch-all)
router.post('/:id/fork/:problemId', forkProblem);
router.put('/fork/:forkId/description', updateForkDescription);

// Get a specific contest by ID
router.get('/:id', getContestById);

// Update a contest (admin or creator)
router.put('/:id', updateContest);

// Delete a contest (admin or creator)
router.delete('/:id', deleteContest);

// Join a contest
router.post('/:id/join', joinContest);

// Submit a solution (rate limited)
router.post('/:id/submit', submissionLimiter, submitSolution);

// Get leaderboard
router.get('/:id/leaderboard', getLeaderboard);

module.exports = router;

