const dns = require('dns');
const nodemailer = require('nodemailer');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const smtpLookup = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, family: 4 }, callback);
};

/**
 * Send an OTP email to the user.
 */
async function sendOTPEmail(toRaw, otp, type = 'Password Reset') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[Email] Missing credentials (EMAIL_USER/EMAIL_PASS)');
    return;
  }

  // Sanitize: Gmail sometimes gets typos like .com becoming ,com
  const to = toRaw.trim().toLowerCase().replace(/,/g, '.');

  // THE ULTIMATE RENDER FIX: Force IPv4 to prevent ENETUNREACH
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4,
    lookup: smtpLookup,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      servername: 'smtp.gmail.com',
      minVersion: 'TLSv1.2',
    },
    // Increase timeout for cross-region deployments
    connectionTimeout: 20000, 
    greetingTimeout: 20000,
    socketTimeout: 60000
  });

  try {
    console.log(`[Email] Attempting to send ${type} to ${to} (Forced IPv4 Gmail)...`);
    
    const mailOptions = {
      from: `"AlgoRank" <${process.env.EMAIL_USER}>`,
      to,
      subject: `AlgoRank: ${type} OTP`,
      text: `Your ${type} code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #1F6FEB; border-radius: 12px; max-width: 500px; background-color: #fcfcfc;">
          <h2 style="color: #1F6FEB; margin-top: 0;">AlgoRank Verification</h2>
          <p style="font-size: 16px;">Your <strong>${type.toLowerCase()}</strong> code is:</p>
          <div style="font-size: 36px; font-weight: bold; color: #1F6FEB; margin: 25px 0; text-align: center; background: #f0f7ff; padding: 15px; border-radius: 8px; letter-spacing: 5px;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #555;">This code will expire in 10 minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
          <p style="font-size: 11px; color: #999;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`[Email] ✅ SUCCESS: Delivered to ${to} (ID: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[Email] ❌ FAILED for ${to}:`, err.message);
    throw err;
  }
}

module.exports = { sendOTPEmail };
