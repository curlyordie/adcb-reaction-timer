-- Run once if your existing D1 database predates built-in Admin login.
-- Safe to repeat; preserves designs, artwork and scores.
CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, password_tag TEXT NOT NULL, expires INTEGER NOT NULL);
