// =============================================
// Email Service for sending OTP emails
// Uses Nodemailer with SMTP credentials from .env
// =============================================

const nodemailer = require('nodemailer');

// Initialize the email transporter with Gmail
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  family: 4, // Force IPv4 to avoid IPv6 ENETUNREACH timeout issues
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter config on startup and log clearly
transporter.verify((err) => {
  if (err) {
    console.error('❌ Email transporter config error:', err.message);
    console.error('   → Make sure EMAIL_USER and EMAIL_PASS are set correctly in server/.env');
    console.error('   → Gmail requires a 16-char App Password, NOT your regular password.');
  } else {
    console.log('✅ Email transporter ready — OTP emails will be sent from:', process.env.EMAIL_USER);
  }
});

/**
 * Send an OTP email to the user.
 * @param {string} to - recipient email address
 * @param {string} otp - the 6-digit OTP code
 */
async function sendOTPEmail(to, otp) {
  const mailOptions = {
    from: `"AlgoRank" <${process.env.EMAIL_USER || 'noreply@algorank.dev'}>`,
    to,
    subject: 'AlgoRank — Password Reset OTP',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 40px; color: #e5e7eb;">
        <h2 style="text-align: center; color: #58A6FF; margin-bottom: 8px;">AlgoRank</h2>
        <p style="text-align: center; color: #6B7280; font-size: 14px; margin-bottom: 32px;">Password Reset Request</p>
        <p style="font-size: 14px; line-height: 1.6;">You requested a password reset. Use the OTP below to verify your identity:</p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ffffff; background: linear-gradient(135deg, #1F6FEB, #58A6FF); padding: 16px 32px; border-radius: 12px;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #6B7280; text-align: center;">This code expires in <strong style="color: #e5e7eb;">5 minutes</strong>.</p>
        <p style="font-size: 12px; color: #4B5563; text-align: center; margin-top: 32px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendOTPEmail };
