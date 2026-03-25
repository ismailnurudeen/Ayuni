-- P1-11: Legal/Privacy/Account Deletion
-- Adds account deletion tracking, data export requests, and privacy consent versioning

-- Track account deletion requests on the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_status TEXT; -- 'pending' | 'cancelled' | 'completed'

CREATE INDEX IF NOT EXISTS idx_users_deletion_status ON users(deletion_status) WHERE deletion_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled ON users(deletion_scheduled_at) WHERE deletion_scheduled_at IS NOT NULL;

-- Data export requests (rate-limited to 1 per 24 hours)
CREATE TABLE IF NOT EXISTS data_export_requests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed' | 'failed'
  export_data  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_export_user ON data_export_requests(user_id);

-- Privacy consent version tracking (extends terms_acceptances)
ALTER TABLE terms_acceptances ADD COLUMN IF NOT EXISTS consent_type TEXT DEFAULT 'onboarding';
