const nodemailer = require('nodemailer');
const dns = require('dns').promises;

let _transporter = null;

/**
 * Resolves smtp.gmail.com to IPv4 to prevent ENETUNREACH on Render
 */
async function getResolvedHost() {
  try {
    const { address } = await dns.lookup('smtp.gmail.com', { family: 4 });
    return address;
  } catch (err) {
    return 'smtp.gmail.com';
  }
}

async function getTransporter() {
  if (_transporter) return _transporter;

  const host = await getResolvedHost();
  _transporter = nodemailer.createTransport({
    host: host,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      servername: 'smtp.gmail.com'
    }
  });
  return _transporter;
}

/**
 * Send an OTP email to the user.
 */
async function sendOTPEmail(toRaw, otp, type = 'Password Reset') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[Email] Missing credentials');
    return;
  }

  // Sanitize: Gmail sometimes gets typos like .com becoming ,com
  const to = toRaw.trim().toLowerCase().replace(/,/g, '.');

  try {
    const transporter = await getTransporter();
    const mailOptions = {
      from: `"AlgoRank" <${process.env.EMAIL_USER}>`,
      to,
      subject: `AlgoRank — ${type} OTP`,
      text: `Your ${type} code is: ${otp}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1F6FEB; margin-top: 0;">AlgoRank</h2>
          <p>Your <strong>${type.toLowerCase()}</strong> code is:</p>
          <div style="font-size: 32px; font-weight: bold; margin: 20px 0; color: #1F6FEB; letter-spacing: 5px;">
            ${otp}
          </div>
          <p style="font-size: 14px;">This code expires in 10 minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email] Error for ${to}:`, err.message);
    throw err;
  }
}

module.exports = { sendOTPEmail };
