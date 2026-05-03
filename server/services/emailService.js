const { Resend } = require('resend');

let resendInstance = null;

function getResendClient() {
  if (!resendInstance && process.env.RESEND_API_KEY) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Send an OTP email to the user.
 */
async function sendOTPEmail(toRaw, otp, type = 'Password Reset') {
  const resend = getResendClient();
  
  if (!resend) {
    console.error('[Email] Missing RESEND_API_KEY credentials');
    return;
  }

  // Sanitize: Gmail sometimes gets typos like .com becoming ,com
  const to = toRaw.trim().toLowerCase().replace(/,/g, '.');

  const fromEmail = process.env.EMAIL_USER || 'onboarding@resend.dev';

  try {
    console.log(`[Email] Attempting to send ${type} to ${to} via Resend...`);
    
    const { data, error } = await resend.emails.send({
      from: `AlgoRank <${fromEmail}>`,
      to: [to],
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
    });

    if (error) {
      console.error(`[Email] ❌ FAILED for ${to}:`, error.message);
      throw new Error(error.message);
    }

    console.log(`[Email] ✅ SUCCESS: Delivered to ${to} (ID: ${data.id})`);
    return data;
  } catch (err) {
    console.error(`[Email] ❌ Exception FAILED for ${to}:`, err.message);
    throw err;
  }
}

module.exports = { sendOTPEmail };
