const express = require('express');
const router = express.Router();
const { signup, signin, getProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/profile', authMiddleware, getProfile);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;