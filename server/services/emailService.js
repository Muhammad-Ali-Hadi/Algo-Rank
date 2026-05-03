const nodemailer = require('nodemailer');
const dns = require('dns').promises;

// Persistent cache for performance
let _transporter = null;
let _resolvedIp = null;

/**
 * Resolves smtp.gmail.com to IPv4 once to prevent ENETUNREACH on Render
 */
async function getResolvedHost() {
  if (_resolvedIp) return _resolvedIp;
  try {
    const { address } = await dns.lookup('smtp.gmail.com', { family: 4 });
    _resolvedIp = address;
    console.log(`[Email] Resolved host to IPv4: ${_resolvedIp}`);
    return _resolvedIp;
  } catch (err) {
    console.warn(`[Email] DNS lookup failed, falling back to hostname: ${err.message}`);
    return 'smtp.gmail.com';
  }
}

/**
 * Get or create a persistent transporter with pooling
 */
async function getTransporter() {
  if (_transporter) return _transporter;

  const host = await getResolvedHost();
  _transporter = nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    pool: true, // Reuse connections for speed
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10000, 
    socketTimeout: 30000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      servername: 'smtp.gmail.com'
    }
  });

  // Verify on first init
  _transporter.verify((error) => {
    if (error) {
       console.error('[Email] Transporter verification failed:', error.message);
    } else {
       console.log('[Email] Transporter is ready and verified');
    }
  });

  return _transporter;
}

/**
 * Send an OTP email to the user.
 */
async function sendOTPEmail(toRaw, otp, type = 'Password Reset') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('[Email] Configuration missing (EMAIL_USER/EMAIL_PASS)');
    return;
  }

  // Sanitize: Gmail sometimes gets typos like .com becoming ,com
  const to = toRaw.trim().toLowerCase().replace(/,/g, '.');
  console.log(`[Email] Attempting to send ${type} OTP to ${to}...`);

  try {
    const transporter = await getTransporter();
    
    // Header optimization: Using bare email as 'from' can sometimes improve deliverability
    const mailOptions = {
      from: process.env.EMAIL_USER, 
      to,
      subject: `AlgoRank: Your ${type} Code`, // Shorter subject
      text: `Your ${type} code is: ${otp}. This code is valid for 10 minutes.`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #333; max-width: 500px; border: 1px solid #1F6FEB; border-radius: 12px; background: #fafafa;">
          <h2 style="color: #1F6FEB; margin-top: 0; font-size: 24px;">AlgoRank</h2>
          <p style="font-size: 16px; color: #555;">Use the code below to complete your ${type.toLowerCase()}:</p>
          <div style="font-size: 36px; font-weight: bold; margin: 24px 0; color: #1F6FEB; letter-spacing: 4px; text-align: center; background: #f0f7ff; padding: 12px; border-radius: 8px;">
            ${otp}
          </div>
          <p style="font-size: 14px; color: #777;">This code is valid for <strong>10 minutes</strong>.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Successfully delivered to ${to} (MessageID: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[Email] FAILED to deliver to ${to}:`, err.message);
    // Don't rethrow here if we want non-blocking delivery to not crash the background process
    return null;
  }
}

module.exports = { sendOTPEmail };
