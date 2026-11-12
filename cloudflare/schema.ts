// Additive bootstrap only: never drop, replace, or reset existing application data.
// Keep this list aligned with migrations/0001_cloud.sql (verified by tests).
export const schemaStatements=[
  "CREATE TABLE IF NOT EXISTS design_versions (id TEXT PRIMARY KEY, parent_id TEXT, settings TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS studio (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, draft TEXT NOT NULL, active_id TEXT NOT NULL REFERENCES design_versions(id))",
  "CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, mime TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS rounds (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, version_id TEXT NOT NULL, player TEXT NOT NULL, expires INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS records (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, data TEXT NOT NULL, difference REAL NOT NULL, completed_at TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS records_ranking ON records(abs(difference), completed_at)",
  "CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS asset_chunks (asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE, position INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY(asset_id,position))",
  "CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, password_tag TEXT NOT NULL, expires INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS event_profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, revision INTEGER NOT NULL, draft TEXT NOT NULL, active_id TEXT NOT NULL REFERENCES design_versions(id))",
  "CREATE TABLE IF NOT EXISTS game_event_state (id INTEGER PRIMARY KEY CHECK(id=1), active_event_id TEXT NOT NULL REFERENCES event_profiles(id), revision INTEGER NOT NULL)",
  "CREATE TABLE IF NOT EXISTS event_design_versions (version_id TEXT PRIMARY KEY REFERENCES design_versions(id), event_id TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS records_event ON records(COALESCE(json_extract(data,'$.eventId'),'f1'))",
  "CREATE TABLE IF NOT EXISTS daily_scores (event_id TEXT NOT NULL, day TEXT NOT NULL, score_id TEXT NOT NULL, data TEXT NOT NULL, difference REAL NOT NULL, completed_at TEXT NOT NULL, PRIMARY KEY(event_id,day,score_id))",
  "CREATE INDEX IF NOT EXISTS daily_scores_ranking ON daily_scores(event_id,day,abs(difference),completed_at,score_id)"
] as const;
const ready=new WeakMap<D1Database,Promise<void>>();
export async function ensureSchema(database:D1Database){let pending=ready.get(database);if(!pending){pending=database.batch(schemaStatements.map(sql=>database.prepare(sql))).then(()=>{});ready.set(database,pending);}try{await pending;}catch(error){ready.delete(database);throw error;}}
