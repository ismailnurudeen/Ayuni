-- Migration 003: Add OTP verification tracking

CREATE TABLE IF NOT EXISTS otp_verifications (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  otp_code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  verification_attempts INTEGER NOT NULL DEFAULT 0,
  last_verification_attempt_at TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

-- Index for looking up active OTP by phone number
CREATE INDEX idx_otp_verifications_phone_number ON otp_verifications(phone_number);
CREATE INDEX idx_otp_verifications_expires_at ON otp_verifications(expires_at);

-- Table to track OTP request rate limiting (resend cooldown + abuse prevention)
CREATE TABLE IF NOT EXISTS otp_rate_limits (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  request_count INTEGER NOT NULL DEFAULT 1,
  first_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ
);

-- Index for cleanup and blocked checking
CREATE INDEX idx_otp_rate_limits_phone_number ON otp_rate_limits(phone_number);
CREATE INDEX idx_otp_rate_limits_blocked_until ON otp_rate_limits(blocked_until);

COMMENT ON TABLE otp_verifications IS 'Tracks OTP codes sent for phone verification';
COMMENT ON TABLE otp_rate_limits IS 'Rate limiting for OTP requests to prevent abuse';
