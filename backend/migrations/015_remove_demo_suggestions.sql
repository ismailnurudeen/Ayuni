-- Migration: Remove demo suggestion profiles
-- Date: 2026-03-27
-- Purpose: Clear demo/fixture suggestion profiles from the database

-- Delete demo suggestion profiles (IDs starting with 'sug-')
DELETE FROM round_profiles WHERE profile_id IN (
  SELECT id FROM suggestion_profiles WHERE id LIKE 'sug-%'
);

DELETE FROM suggestion_profiles WHERE id LIKE 'sug-%';

-- Optional: Reset any reactions to demo profiles
DELETE FROM reactions WHERE profile_id LIKE 'sug-%';
