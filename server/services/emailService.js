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
          <div style="font-family: Arial, sans-serif; padding: 40px 20px; max-width: 600px; margin: 0 auto; background-color: #0d1117; color: #e6edf3; text-align: center; border-radius: 12px;">
            <h1 style="color: #3b82f6; font-size: 24px; margin-bottom: 5px;">AlgoRank</h1>
            <p style="color: #8b949e; font-size: 14px; margin-top: 0; margin-bottom: 30px;">${type} Request</p>
            
            <p style="font-size: 15px; color: #c9d1d9; margin-bottom: 30px;">
              You requested a ${type.toLowerCase()}. Use the OTP below to verify your identity.
            </p>
            
            <div style="background-color: #2563eb; color: #ffffff; font-size: 36px; font-weight: bold; letter-spacing: 12px; padding: 20px 30px; border-radius: 12px; display: inline-block; margin-bottom: 30px;">
              ${otp}
            </div>
            
            <p style="font-size: 12px; color: #8b949e; margin-top: 20px;">
              This code will expire in 10 minutes.<br>
              If you didn't request this code, you can safely ignore this email.
            </p>
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
