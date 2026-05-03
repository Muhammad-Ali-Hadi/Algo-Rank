// =============================================
// Email Service for sending OTP emails
// Uses Nodemailer with Gmail SMTP
// =============================================

const nodemailer = require('nodemailer');

// Lazily create transporter so missing env vars don't crash the whole server at startup
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4, // Force IPv4 — avoids IPv6 ENETUNREACH on some cloud hosts
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Needed on some cloud providers (e.g. Render)
    },
  });

  // Verify on first use
  _transporter.verify((err) => {
    if (err) {
      console.error('❌ Email transporter error:', err.message);
      console.error('   → Check EMAIL_USER and EMAIL_PASS in Render environment variables');
      console.error('   → Gmail requires a 16-char App Password (not your regular password)');
      console.error('   → Generate at: https://myaccount.google.com/apppasswords');
    } else {
      console.log('✅ Email transporter ready — sending from:', process.env.EMAIL_USER);
    }
  });

  return _transporter;
}

/**
 * Send an OTP email to the user.
 * @param {string} to - recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} type - 'Password Reset' | 'Email Verification'
 */
async function sendOTPEmail(to, otp, type = 'Password Reset') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS environment variables are not set on the server.');
  }

  const transporter = getTransporter();

  const mailOptions = {
    from: `"AlgoRank" <${process.env.EMAIL_USER}>`,
    to,
    subject: `AlgoRank — ${type} OTP`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 40px; color: #e5e7eb;">
        <h2 style="text-align: center; color: #58A6FF; margin-bottom: 8px;">AlgoRank</h2>
        <p style="text-align: center; color: #6B7280; font-size: 14px; margin-bottom: 32px;">${type}</p>
        <p style="font-size: 14px; line-height: 1.6;">Use the OTP below to complete your <strong>${type.toLowerCase()}</strong>:</p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ffffff; background: linear-gradient(135deg, #1F6FEB, #58A6FF); padding: 16px 32px; border-radius: 12px;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #6B7280; text-align: center;">This code expires in <strong style="color: #e5e7eb;">10 minutes</strong>.</p>
        <p style="font-size: 12px; color: #4B5563; text-align: center; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] OTP sent to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email] Failed to send OTP to ${to}:`, err.message);
    // Reset transporter so it's re-verified on next attempt
    _transporter = null;
    throw err;
  }
}

module.exports = { sendOTPEmail };
