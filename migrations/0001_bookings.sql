CREATE TABLE IF NOT EXISTS booking_requests (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  kind TEXT NOT NULL,
  start_ms INTEGER NOT NULL DEFAULT 0,
  end_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  event_id TEXT NOT NULL,
  result_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  lock_until INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS booking_overlap ON booking_requests(kind,status,start_ms,end_ms);
CREATE TABLE IF NOT EXISTS booking_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
