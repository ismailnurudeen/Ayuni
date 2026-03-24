-- P1-05: Booking Support Workflows
-- Adds support requests (cancellation/reschedule) and booking audit log

CREATE TABLE IF NOT EXISTS booking_support_requests (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL,           -- 'cancellation' | 'reschedule'
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'requested',  -- 'requested' | 'under_review' | 'approved' | 'denied'
  refund_status TEXT,                  -- 'eligible' | 'partial' | 'ineligible' | 'processed'
  new_availability JSONB,             -- for reschedule requests
  resolution_notes TEXT,
  resolved_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_booking ON booking_support_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON booking_support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_user ON booking_support_requests(user_id);

CREATE TABLE IF NOT EXISTS booking_audit_log (
  id          TEXT PRIMARY KEY,
  booking_id  TEXT NOT NULL,
  actor_id    TEXT NOT NULL,
  actor_type  TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'ops' | 'system'
  action      TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_booking ON booking_audit_log(booking_id);
