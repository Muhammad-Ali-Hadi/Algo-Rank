const { supabaseAdmin } = require('../services/supabaseClient');
const { sendOTPEmail } = require('../services/emailService');
const { generateToken } = require('../utils/authUtils');
const crypto = require('crypto');

const OTP_EXPIRY_MINUTES = 10;

function parseUtcTimestamp(value) {
  if (!value) return NaN;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const hasTimezone = /([zZ]|[+-]\d\d:?\d\d)$/.test(normalized);
    return Date.parse(hasTimezone ? normalized : `${normalized}Z`);
  }

  return Date.parse(value);
}

function isOtpExpired(expiresAt) {
  const expiresEpoch = parseUtcTimestamp(expiresAt);
  return Number.isNaN(expiresEpoch) || Date.now() > expiresEpoch;
}

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// ==================== SEND VERIFICATION OTP ====================
const sendVerificationOTP = async (req, res) => {
  const emailRaw = req.body.email || req.user?.email;
  if (!emailRaw) {
    return res.status(400).json({ error: 'Email is required' });
  }
  // Sanitize: replace , with . and trim
  const email = emailRaw.trim().toLowerCase().replace(/,/g, '.');

  try {
    // Check if user exists and is not already verified
    const { data: user, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('is_verified')
      .eq('email', email)
      .single();

    if (lookupError || !user) {
      return res.status(404).json({ error: `User with email ${email} not found. Ensure your signup was successful.` });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    await initiateVerification(email);

    return res.status(200).json({ message: 'Verification OTP sent to your email' });
  } catch (err) {
    console.error('Send verification OTP error:', err);
    return res.status(500).json({ error: 'Failed to send verification OTP. ' + err.message });
  }
};

// ==================== VERIFY EMAIL ====================
const verifyEmail = async (req, res) => {
  const emailRaw = req.body.email || req.user?.email;
  const { otp } = req.body;

  if (!emailRaw || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }
  const email = emailRaw.trim().toLowerCase().replace(/,/g, '.');

  try {
    // Fetch from DB (works across serverless/cloud deployments)
    const { data: stored, error: fetchError } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('type', 'verification')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !stored) {
      return res.status(400).json({ error: 'No verification requested or OTP expired. Please request a new one.' });
    }

    if (isOtpExpired(stored.expires_at)) {
      // Clean up
      await supabaseAdmin.from('email_otps').delete().eq('id', stored.id);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (stored.otp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }

    // Mark user as verified
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ is_verified: true })
      .eq('email', email);

    if (updateError) throw updateError;

    // Clean up used OTP
    await supabaseAdmin.from('email_otps').delete().eq('id', stored.id);

    // Fetch updated user for token
    const { data: updatedUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

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
        isVerified: true,
      },
    });
  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ error: 'Failed to verify email' });
  }
};

// ==================== SHARED: INITIATE VERIFICATION ====================
const initiateVerification = async (email) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Delete any old OTPs for this email first
  await supabaseAdmin
    .from('email_otps')
    .delete()
    .eq('email', email.toLowerCase())
    .eq('type', 'verification');

  // Insert new OTP into DB using an explicit UTC timestamp.
  const { error } = await supabaseAdmin.from('email_otps').insert({
    email: email.toLowerCase(),
    otp,
    type: 'verification',
    expires_at: expiresAt,
  });

  if (error) {
    console.error('[initiateVerification] DB insert error:', error);
    throw new Error('Failed to store OTP in database. ' + error.message);
  }

  // Use await for Vercel/Serverless compatibility (prevents silent background failure)
  await sendOTPEmail(email, otp, 'Email Verification');
};

module.exports = { sendVerificationOTP, verifyEmail, initiateVerification };
