const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const verificationMiddleware = require('../middleware/verificationMiddleware');
const { submissionLimiter } = require('../middleware/rateLimiter');
const { heavyThrottler } = require('../middleware/throttler');
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
  disqualifyParticipant,
  getSubmissionCode,
} = require('../controllers/contestController');

// All contest routes require authentication
router.use(authMiddleware);

// Global contest creation (admin only)
router.post('/global', adminMiddleware, verificationMiddleware, createGlobalContest);

// Local contest creation (any authenticated user)
router.post('/local', verificationMiddleware, createLocalContest);

// List all visible contests
router.get('/', getContests);

// Scrape a problem from URL
router.post('/scrape-problem', heavyThrottler, scrapeProblemHandler);

// Join a contest by invite code
router.post('/join-invite', verificationMiddleware, joinByInviteCode);

// Compile code (Syntax Check)
router.post('/compile', heavyThrottler, compileSolution);

// Get submission status
router.get('/submissions/:subId', getSubmissionStatus);

// Fork routes (must be before /:id catch-all)
router.post('/:id/fork/:problemId', heavyThrottler, forkProblem);
router.put('/fork/:forkId/description', updateForkDescription);

// Get submission code and details (POST to bypass client GET cache; must be before /:id catch-all)
router.post('/:id/submissions/:subId/code', getSubmissionCode);

// Get a specific contest by ID
router.get('/:id', getContestById);

// Update a contest (admin or creator)
router.put('/:id', updateContest);

// Delete a contest (admin or creator)
router.delete('/:id', deleteContest);

// Join a contest
router.post('/:id/join', verificationMiddleware, joinContest);

// Submit a solution (rate limited & queued)
router.post('/:id/submit', heavyThrottler, submissionLimiter, verificationMiddleware, submitSolution);

// Get leaderboard
router.get('/:id/leaderboard', getLeaderboard);

// Disqualify participant
router.post('/:id/disqualify/:userId', disqualifyParticipant);

module.exports = router;

