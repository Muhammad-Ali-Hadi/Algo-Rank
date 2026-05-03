-- Run this in your Supabase SQL Editor
-- Creates the email_otps table for persistent OTP storage (fixes production OTP delivery)

CREATE TABLE IF NOT EXISTS email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'verification',  -- 'verification' | 'password_reset'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);

-- Automatically delete expired OTPs (optional, requires pg_cron or a CRON job)
-- If not using pg_cron, expired rows are cleaned up by the application logic
