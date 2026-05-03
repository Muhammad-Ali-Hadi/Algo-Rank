/**
 * Send an OTP email to the user using Brevo API (HTTP).
 */
async function sendOTPEmail(toRaw, otp, type = 'Password Reset') {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[Email] Missing credentials (BREVO_API_KEY)');
    return;
  }

  // Sanitize: Gmail sometimes gets typos like .com becoming ,com
  const to = toRaw.trim().toLowerCase().replace(/,/g, '.');
  const senderEmail = process.env.EMAIL_USER || 'algo.rank.fast@gmail.com'; 

  try {
    console.log(`[Email] Attempting to send ${type} to ${to} via Brevo...`);
    
    // We use standard fetch over port 443 (HTTP), which bypassing Render's SMTP block
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'AlgoRank', email: senderEmail },
        to: [{ email: to }],
        subject: `AlgoRank: ${type} OTP`,
        textContent: `Your ${type} code is: ${otp}. It will expire in 10 minutes.`,
        htmlContent: `
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
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[Email] ❌ Brevo API FAILED for ${to}:`, errorData);
      throw new Error(`Brevo API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Email] ✅ SUCCESS: Delivered to ${to} (MessageId: ${data.messageId})`);
    return data;
  } catch (err) {
    console.error(`[Email] ❌ FAILED for ${to}:`, err.message);
    throw err;
  }
}

module.exports = { sendOTPEmail };
