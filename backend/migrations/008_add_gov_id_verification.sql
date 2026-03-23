-- Migration 008: Add government ID verification and feature toggles

CREATE TABLE IF NOT EXISTS gov_id_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  front_image_url TEXT NOT NULL,
  back_image_url TEXT,
  id_type TEXT NOT NULL CHECK (id_type IN ('national_id', 'drivers_license', 'passport', 'voters_card')),
  review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT,
  extracted_name TEXT,
  extracted_dob TEXT,
  extracted_id_number TEXT
);

-- Index for ops queue (pending submissions by date)
CREATE INDEX idx_gov_id_submissions_review_status ON gov_id_submissions(review_status, submitted_at);

-- Index for user lookup
CREATE INDEX idx_gov_id_submissions_user_id ON gov_id_submissions(user_id, submitted_at DESC);

COMMENT ON TABLE gov_id_submissions IS 'Government ID verification submissions and review status';
COMMENT ON COLUMN gov_id_submissions.review_status IS 'pending, approved, or rejected';
COMMENT ON COLUMN gov_id_submissions.id_type IS 'Type of government ID submitted';

-- Feature toggles table for runtime configuration
CREATE TABLE IF NOT EXISTS feature_toggles (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Insert default feature toggle for gov ID requirement
INSERT INTO feature_toggles (name, enabled, updated_at)
VALUES ('require_gov_id_for_booking', false, NOW())
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE feature_toggles IS 'Runtime feature flags and configuration';
COMMENT ON COLUMN feature_toggles.enabled IS 'Whether the feature is currently enabled';
