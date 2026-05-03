const nodemailer = require('nodemailer');

/**
 * Send an OTP email to the user.
 */
async function sendOTPEmail(toRaw, otp, type = 'Password Reset') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[Email] Missing credentials');
    return;
  }

  const to = toRaw.trim().toLowerCase().replace(/,/g, '.');

  // Nodemailer's 'service: gmail' is often the most compatible for cloud hosts
  // because it uses internal well-known settings.
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Adding reasonable timeouts to prevent infinite hangs
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000
  });

  try {
    const mailOptions = {
      from: `"AlgoRank" <${process.env.EMAIL_USER}>`,
      to,
      subject: `AlgoRank: ${type} OTP`,
      text: `Your ${type} code is: ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #1F6FEB; border-radius: 8px;">
          <h2>AlgoRank Verification</h2>
          <p>Your <b>${type.toLowerCase()}</b> code is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #1F6FEB; margin: 20px 0;">${otp}</div>
          <p>Expires in 10 minutes.</p>
        </div>
      `
    };

    console.log(`[Email] Attempting one-shot send to ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] ✅ SUCCESS: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email] ❌ FAILED: ${err.message}`);
    // Check for common Render errors
    if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
      console.error('[Email] HINT: If you are on Render FREE tier, SMTP (Port 465/587) is blocked by Render.');
    }
    throw err;
  }
}

module.exports = { sendOTPEmail };
