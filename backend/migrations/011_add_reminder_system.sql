-- Migration 010: Add reminder/notification delivery system
-- Supports WhatsApp/SMS reminder logging, delivery tracking, and user preferences

CREATE TABLE IF NOT EXISTS reminder_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  booking_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  template_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  failure_reason TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_user ON reminder_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_booking ON reminder_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_status ON reminder_logs(status);

CREATE TABLE IF NOT EXISTS reminder_preferences (
  user_id TEXT PRIMARY KEY,
  booking_confirmations BOOLEAN NOT NULL DEFAULT TRUE,
  reminders BOOLEAN NOT NULL DEFAULT TRUE,
  payment_nudges BOOLEAN NOT NULL DEFAULT TRUE,
  cancellation_notices BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
