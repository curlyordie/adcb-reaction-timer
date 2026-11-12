-- Run this if you already ran the original 0001_cloud.sql before D1 artwork support.
-- Safe to run again. No existing settings, history or scores are deleted.
CREATE TABLE IF NOT EXISTS asset_chunks (asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE, position INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY(asset_id,position));
