-- Migration 007: Add freeze policy fields
-- Adds next_incident_id to user_states for tracking safety incidents and freezes

ALTER TABLE user_states ADD COLUMN IF NOT EXISTS next_incident_id INTEGER DEFAULT 1;
