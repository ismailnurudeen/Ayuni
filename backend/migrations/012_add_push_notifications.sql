-- P1-06: Push Notifications and Inbox
-- Adds device tokens, notification read state, deep linking, and notification preferences

-- Device tokens table (one user can have multiple devices)
CREATE TABLE IF NOT EXISTS device_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  platform    TEXT NOT NULL,        -- 'android' | 'ios'
  token       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

-- Add read_at and deep link columns to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deep_link_target TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deep_link_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type TEXT;

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id             TEXT PRIMARY KEY,
  new_round           BOOLEAN NOT NULL DEFAULT TRUE,
  booking_update      BOOLEAN NOT NULL DEFAULT TRUE,
  payment_required    BOOLEAN NOT NULL DEFAULT TRUE,
  reminder            BOOLEAN NOT NULL DEFAULT TRUE,
  verification_update BOOLEAN NOT NULL DEFAULT TRUE,
  safety_alert        BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  inbox_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
