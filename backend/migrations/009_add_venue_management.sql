-- P1-04: Venue Management System
-- Expand the venues table with structured columns for full venue management.

-- Add structured columns to existing venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS venue_type TEXT NOT NULL DEFAULT 'Cafe';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 20;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS operating_hours JSONB NOT NULL DEFAULT '{}';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS blackout_dates JSONB NOT NULL DEFAULT '[]';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Migrate existing venue data from payload JSONB into structured columns
UPDATE venues SET
  name = COALESCE(payload->>'name', ''),
  address = COALESCE(payload->>'address', ''),
  area = COALESCE(payload->>'area', ''),
  venue_type = COALESCE(payload->>'type', 'Cafe'),
  status = CASE
    WHEN readiness = 'ready' THEN 'active'
    WHEN readiness = 'paused' THEN 'inactive'
    WHEN readiness = 'waitlist' THEN 'inactive'
    ELSE 'active'
  END
WHERE name = '';

-- Venue time slots for per-slot capacity tracking (prevents overbooking)
CREATE TABLE IF NOT EXISTS venue_time_slots (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER NOT NULL,
  booked_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(venue_id, slot_date, start_time)
);

-- Indexes for common venue queries
CREATE INDEX IF NOT EXISTS idx_venues_status ON venues(status);
CREATE INDEX IF NOT EXISTS idx_venues_area ON venues(area);
CREATE INDEX IF NOT EXISTS idx_venues_city_status ON venues(city, status);
CREATE INDEX IF NOT EXISTS idx_venues_venue_type ON venues(venue_type);
CREATE INDEX IF NOT EXISTS idx_venue_time_slots_venue_date ON venue_time_slots(venue_id, slot_date);
