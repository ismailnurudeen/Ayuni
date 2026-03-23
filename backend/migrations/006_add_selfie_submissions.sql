-- Migration 006: Add selfie verification submissions

CREATE TABLE IF NOT EXISTS selfie_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT
);

-- Index for ops queue (pending submissions by date)
CREATE INDEX idx_selfie_submissions_review_status ON selfie_submissions(review_status, submitted_at);

-- Index for user lookup
CREATE INDEX idx_selfie_submissions_user_id ON selfie_submissions(user_id, submitted_at DESC);

COMMENT ON TABLE selfie_submissions IS 'Selfie verification submissions and review status';
COMMENT ON COLUMN selfie_submissions.review_status IS 'pending, approved, or rejected';
COMMENT ON COLUMN selfie_submissions.reviewed_by IS 'Ops user who reviewed the submission';
