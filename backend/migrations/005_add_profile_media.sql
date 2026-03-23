-- Migration 005: Add profile media storage

CREATE TABLE IF NOT EXISTS profile_media (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  storage_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_size_bytes INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER
);

-- Index for looking up user's media sorted by order
CREATE INDEX idx_profile_media_user_id_order ON profile_media(user_id, display_order);
CREATE INDEX idx_profile_media_uploaded_at ON profile_media(uploaded_at);

COMMENT ON TABLE profile_media IS 'Profile media items (images and videos) for user profiles';
COMMENT ON COLUMN profile_media.storage_url IS 'URL or path to stored media file';
COMMENT ON COLUMN profile_media.display_order IS 'Order in which media appears on profile (0-5 for 6 items max)';
