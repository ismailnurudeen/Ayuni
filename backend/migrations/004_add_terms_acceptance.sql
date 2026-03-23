-- Migration 004: Add terms acceptance tracking

CREATE TABLE IF NOT EXISTS terms_acceptances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terms_version TEXT NOT NULL DEFAULT '1.0',
  privacy_version TEXT NOT NULL DEFAULT '1.0',
  ip_address TEXT,
  user_agent TEXT
);

-- Index for looking up user's terms acceptance history
CREATE INDEX idx_terms_acceptances_user_id ON terms_acceptances(user_id);
CREATE INDEX idx_terms_acceptances_accepted_at ON terms_acceptances(accepted_at);

COMMENT ON TABLE terms_acceptances IS 'Records of user consent to terms and privacy policy';
