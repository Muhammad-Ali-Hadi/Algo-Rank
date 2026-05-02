const express = require('express');
const router = express.Router();
const { signup, signin, getProfile } = require('../controllers/authController');
const { sendVerificationOTP, verifyEmail } = require('../controllers/verificationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', sendVerificationOTP);
router.get('/profile', authMiddleware, getProfile);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;