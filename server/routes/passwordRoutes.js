// =============================================
// NEW FILE: Password Reset Routes
// =============================================

const express = require('express');
const router = express.Router();
const { forgotPassword, verifyOtp, resetPassword } = require('../controllers/passwordController');

// POST /api/password/forgot    — sends OTP to email
router.post('/forgot', forgotPassword);

// POST /api/password/verify-otp — verifies the OTP
router.post('/verify-otp', verifyOtp);

// POST /api/password/reset      — resets password after OTP verification
router.post('/reset', resetPassword);

module.exports = router;
