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
const OTP_EXPIRY_MINUTES = 10; // Increased to 10 for better UX

/**
 * Generate a secure 6-digit numeric OTP
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// ==================== FORGOT PASSWORD ====================
// Generates OTP and sends it to the user's registered email
const forgotPassword = async (req, res) => {
  const emailRaw = req.body.email;
  if (!emailRaw) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const email = emailRaw.trim().toLowerCase().replace(/,/g, '.');

  try {
    // Check if user exists with this email
    const { data: user, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (lookupError || !user) {
      return res.status(404).json({ error: `No account found with email ${email}. Please check your spelling or sign up.` });
    }

    // Generate OTP and store in DB for persistence
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Delete any old password reset OTPs for this email
    await supabaseAdmin
      .from('email_otps')
      .delete()
      .eq('email', email)
      .eq('type', 'password_reset');

    // Insert new OTP
    const { error: insertError } = await supabaseAdmin.from('email_otps').insert({
      email,
      otp,
      type: 'password_reset',
      expires_at: expiresAt
    });

    if (insertError) throw insertError;

    // Use await for Vercel/Serverless compatibility (prevents silent background failure)
    await sendOTPEmail(email, otp, 'Password Reset');

    return res.status(200).json({
      message: 'OTP sent to your email. It expires in 10 minutes.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to send OTP. ' + err.message });
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
  const email = emailRaw.trim().toLowerCase().replace(/,/g, '.');

  try {
    // Fetch from DB
    const { data: stored, error: fetchError } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('type', 'password_reset')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !stored) {
      return res.status(400).json({ error: 'No OTP requested or expired. Please request a new one.' });
    }

    // Check expiration using UTC Epoch for timezone independence
    const nowEpoch = Date.now();
    const expiresEpoch = new Date(stored.expires_at).getTime();

    if (nowEpoch > expiresEpoch) {
      await supabaseAdmin.from('email_otps').delete().eq('id', stored.id);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check correctness
    if (stored.otp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Invalid OTP. Please check and try again.' });
    }

    // OTP is valid — mark as verified in the DB record itself so reset step knows
    // We update the record to indicate it's been verified
    // Alternatively, we can just return success and check again in resetPassword
    // but storing the 'verified' state is safer if we want to ensure multi-step logic.
    // For now, let's just return success; the resetPassword will verify the OTP again.
    
    return res.status(200).json({ message: 'OTP verified successfully. You can now reset your password.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== RESET PASSWORD ====================
// Resets the user's password after OTP verification
const resetPassword = async (req, res) => {
  const emailRaw = req.body.email;
  const { otp, newPassword } = req.body;

  if (!emailRaw || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }
  const email = emailRaw.trim().toLowerCase().replace(/,/g, '.');

  // Validate new password strength
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    // Verify OTP again to ensure authorization
    const { data: stored, error: fetchError } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('type', 'password_reset')
      .eq('otp', otp.toString().trim())
      .single();

    if (fetchError || !stored) {
      return res.status(400).json({ error: 'Invalid OTP or session expired.' });
    }

    if (new Date() > new Date(stored.expires_at)) {
      await supabaseAdmin.from('email_otps').delete().eq('id', stored.id);
      return res.status(400).json({ error: 'OTP has expired.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password in database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    // Clean up used OTP
    await supabaseAdmin.from('email_otps').delete().eq('id', stored.id);

    return res.status(200).json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { forgotPassword, verifyOtp, resetPassword };
