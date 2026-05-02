// =============================================
// NEW FILE: Password Reset Controller
// Handles forgot-password, OTP verification,
// and password reset with bcrypt hashing
// =============================================

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { supabaseAdmin } = require('../services/supabaseClient');
const { sendOTPEmail } = require('../services/emailService');

const SALT_ROUNDS = 10;
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// In-memory OTP store: email -> { otp, expiresAt }
// For production, consider using Redis or a DB table
const otpStore = new Map();

/**
 * Generate a secure 6-digit numeric OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Clean up expired OTPs periodically (every 10 minutes)
 */
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
    }
  }
}, 10 * 60 * 1000);

// ==================== FORGOT PASSWORD ====================
// Generates OTP and sends it to the user's registered email
const forgotPassword = async (req, res) => {
  const emailRaw = req.body.email;
  if (!emailRaw) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const email = emailRaw.trim();

  try {
    // Check if user exists with this email
    const { data: user, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (lookupError || !user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    // Generate OTP and store with expiry
    const otp = generateOTP();
    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    });

    // Send OTP email
    await sendOTPEmail(email.toLowerCase(), otp);

    return res.status(200).json({
      message: 'OTP sent to your email. It expires in 5 minutes.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    // Return the actual error so it's visible during development
    return res.status(500).json({ error: err.message || 'Failed to send OTP. Please try again.' });
  }
};

// ==================== VERIFY OTP ====================
// Validates the OTP the user entered (correctness + expiration)
const verifyOtp = async (req, res) => {
  const emailRaw = req.body.email;
  const { otp } = req.body;

  if (!emailRaw || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }
  const email = emailRaw.trim();

  const stored = otpStore.get(email.toLowerCase());

  if (!stored) {
    return res.status(400).json({ error: 'No OTP was requested for this email. Please request a new one.' });
  }

  // Check expiration
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  // Check correctness
  if (stored.otp !== otp.toString()) {
    return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
  }

  // OTP is valid — mark as verified but keep it for the reset step
  otpStore.set(email.toLowerCase(), { ...stored, verified: true });

  return res.status(200).json({ message: 'OTP verified successfully. You can now reset your password.' });
};

// ==================== RESET PASSWORD ====================
// Resets the user's password after OTP verification
const resetPassword = async (req, res) => {
  const emailRaw = req.body.email;
  const { otp, newPassword } = req.body;

  if (!emailRaw || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }
  const email = emailRaw.trim();

  // Validate new password strength
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const stored = otpStore.get(email.toLowerCase());

  if (!stored || !stored.verified) {
    return res.status(400).json({ error: 'OTP not verified. Please verify your OTP first.' });
  }

  // Double-check OTP and expiration
  if (stored.otp !== otp.toString()) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  try {
    // Hash the new password with bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password in database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email.toLowerCase());

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Clean up OTP after successful reset
    otpStore.delete(email.toLowerCase());

    return res.status(200).json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { forgotPassword, verifyOtp, resetPassword };
