-- Additive event storage. Existing records, the November backup and old studio are preserved.
CREATE TABLE IF NOT EXISTS event_profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, revision INTEGER NOT NULL, draft TEXT NOT NULL, active_id TEXT NOT NULL REFERENCES design_versions(id));
CREATE TABLE IF NOT EXISTS game_event_state (id INTEGER PRIMARY KEY CHECK(id=1), active_event_id TEXT NOT NULL REFERENCES event_profiles(id), revision INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS event_design_versions (version_id TEXT PRIMARY KEY REFERENCES design_versions(id), event_id TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS records_event ON records(COALESCE(json_extract(data,'$.eventId'),'f1'));
