-- Analytics events table (self-hosted, privacy-safe)
CREATE TABLE IF NOT EXISTS analytics_events (
    id            TEXT PRIMARY KEY,
    user_id_hash  TEXT NOT NULL,
    event_name    TEXT NOT NULL,
    properties    JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_name ON analytics_events (event_name);
CREATE INDEX idx_analytics_events_created ON analytics_events (created_at);
CREATE INDEX idx_analytics_events_user_hash ON analytics_events (user_id_hash);
