const express = require('express');
const router = express.Router();
const { getProblems, getProblemById } = require('../controllers/problemController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all problems with pagination
router.get('/', authMiddleware, getProblems);

// Get a single problem with test cases
router.get('/:id', authMiddleware, getProblemById);

module.exports = router;
