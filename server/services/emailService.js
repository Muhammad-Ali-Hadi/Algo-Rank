const nodemailer = require('nodemailer');
const dns = require('dns').promises;

let _transporter = null;
let _resolvedIp = null;

/**
 * Resolves smtp.gmail.com to IPv4 to prevent ENETUNREACH on Render's network
 */
async function getResolvedHost() {
  if (_resolvedIp) return _resolvedIp;
  try {
    const { address } = await dns.lookup('smtp.gmail.com', { family: 4 });
    _resolvedIp = address;
    console.log(`[Email] Resolved smtp.gmail.com to IPv4: ${_resolvedIp}`);
    return _resolvedIp;
  } catch (err) {
    console.warn(`[Email] DNS lookup failed, using hostname. Error: ${err.message}`);
    return 'smtp.gmail.com';
  }
}

async function getTransporter() {
  // Re-verify existing transporter
  if (_transporter) return _transporter;

  const host = await getResolvedHost();
  
  // Using Port 587 with STARTTLS - highly recommended for Asia/Singapore cloud regions
  _transporter = nodemailer.createTransport({
    host: host,
    port: 587,
    secure: false, // STARTTLS
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      servername: 'smtp.gmail.com' // Crucial when connecting via IP
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000
  });

  return _transporter;
}

/**
 * Send an OTP email to the user.
 */
async function sendOTPEmail(toRaw, otp, type = 'Password Reset') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[Email] Configuration Error: EMAIL_USER or EMAIL_PASS missing');
    return;
  }

  // Sanitize email: Convert "gmail,com" to "gmail.com"
  const to = toRaw.trim().toLowerCase().replace(/,/g, '.');
  console.log(`[Email] Triggering ${type} email to ${to}...`);

  try {
    const transporter = await getTransporter();
    
    // Test the connection before sending
    await transporter.verify();

    const mailOptions = {
      from: `"AlgoRank" <${process.env.EMAIL_USER}>`,
      to,
      subject: `AlgoRank: ${type} OTP`,
      text: `Your ${type.toLowerCase()} code is: ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #333; border: 1px solid #ddd; border-radius: 8px; max-width: 480px;">
          <h2 style="color: #1F6FEB;">AlgoRank</h2>
          <p>Your <strong>${type.toLowerCase()}</strong> code is:</p>
          <div style="font-size: 32px; font-weight: bold; margin: 20px 0; color: #1F6FEB; background: #f4f4f4; padding: 16px; text-align: center; border-radius: 4px;">
            ${otp}
          </div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p style="font-size: 12px; color: #666; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] SUCCESS: Delivered to ${to} (${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[Email] FATAL ERROR for ${to}:`, err.message);
    // Reset transporter on error to force a fresh connection attempt next time
    _transporter = null;
    throw err;
  }
}

module.exports = { sendOTPEmail };
