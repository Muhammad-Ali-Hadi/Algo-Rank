// =============================================
// Email Service for sending OTP emails
// Uses Nodemailer with Gmail SMTP
// =============================================

const nodemailer = require('nodemailer');

/**
 * Send an OTP email to the user.
 * @param {string} to - recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} type - 'Password Reset' | 'Email Verification'
 */
async function sendOTPEmail(to, otp, type = 'Password Reset') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[Email] Missing EMAIL_USER or EMAIL_PASS environment variables');
    return;
  }

  // Use the most basic config — often most reliable on cloud platforms
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

  const mailOptions = {
    from: `"AlgoRank" <${process.env.EMAIL_USER}>`,
    to: to.trim().toLowerCase(),
    subject: `AlgoRank — ${type} OTP`,
    text: `Your ${type} code is: ${otp}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #1F6FEB;">AlgoRank</h2>
        <p>Your <strong>${type.toLowerCase()}</strong> code is:</p>
        <div style="font-size: 32px; font-weight: bold; margin: 20px 0; color: #1F6FEB;">
          ${otp}
        </div>
        <p>This code expires in 10 minutes.</p>
        <p style="font-size: 12px; color: #666;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Success: ${to} (${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[Email] Error: ${to} ->`, err.message);
    // Don't throw the error so the user's DB operation isn't rolled back 
    // unless you want them to see the failure.
    throw err;
  }
}

module.exports = { sendOTPEmail };
