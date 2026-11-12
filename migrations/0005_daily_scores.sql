-- Preserve daily jiu jitsu scores independently of the public board.
CREATE TABLE IF NOT EXISTS daily_scores (event_id TEXT NOT NULL, day TEXT NOT NULL, score_id TEXT NOT NULL, data TEXT NOT NULL, difference REAL NOT NULL, completed_at TEXT NOT NULL, PRIMARY KEY(event_id,day,score_id));
CREATE INDEX IF NOT EXISTS daily_scores_ranking ON daily_scores(event_id,day,abs(difference),completed_at,score_id);
