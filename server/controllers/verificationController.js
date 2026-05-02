const { supabaseAdmin } = require('../services/supabaseClient');
const { sendOTPEmail } = require('../services/emailService');
const { generateToken } = require('../utils/authUtils');
const crypto = require('crypto');

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const verificationOtpStore = new Map();

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Clean up expired OTPs periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of verificationOtpStore.entries()) {
    if (now > data.expiresAt) {
      verificationOtpStore.delete(email);
    }
  }
}, 15 * 60 * 1000);

// ==================== SEND VERIFICATION OTP ====================
const sendVerificationOTP = async (req, res) => {
  const emailRaw = req.body.email || req.user?.email;
  if (!emailRaw) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const email = emailRaw.trim().toLowerCase();

  try {
    // Check if user is already verified
    const { data: user, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('is_verified')
      .eq('email', email)
      .single();

    if (lookupError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate and store OTP
    const otp = generateOTP();
    verificationOtpStore.set(email, {
      otp,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    });

    // Send email
    await sendOTPEmail(email, otp, 'Email Verification');

    return res.status(200).json({ message: 'Verification OTP sent to your email' });
  } catch (err) {
    console.error('Send verification OTP error:', err);
    return res.status(500).json({ error: 'Failed to send verification OTP' });
  }
};

// ==================== VERIFY EMAIL ====================
const verifyEmail = async (req, res) => {
  const emailRaw = req.body.email || req.user?.email;
  const { otp } = req.body;

  if (!emailRaw || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }
  const email = emailRaw.trim().toLowerCase();

  const stored = verificationOtpStore.get(email);

  if (!stored) {
    return res.status(400).json({ error: 'No verification requested or OTP expired' });
  }

  if (Date.now() > stored.expiresAt) {
    verificationOtpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (stored.otp !== otp.toString()) {
    return res.status(400).json({ error: 'Invalid verification OTP' });
  }

  try {
    // Mark user as verified in database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ is_verified: true })
      .eq('email', email);

    if (updateError) {
      throw updateError;
    }

    // Clean up
    verificationOtpStore.delete(email);

    // Fetch user again to get full data for token
    const { data: updatedUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // Generate NEW token with isVerified: true
    const token = generateToken(updatedUser);

    return res.status(200).json({ 
      message: 'Email verified successfully!', 
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        name: updatedUser.name,
        avatar_url: updatedUser.avatar_url,
        isVerified: true
      }
    });
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ error: 'Failed to verify email' });
  }
};

const initiateVerification = async (email) => {
  const otp = generateOTP();
  verificationOtpStore.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  });
  await sendOTPEmail(email, otp, 'Email Verification');
};

module.exports = { sendVerificationOTP, verifyEmail, initiateVerification };
