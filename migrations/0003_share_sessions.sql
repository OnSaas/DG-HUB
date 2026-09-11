CREATE TABLE share_sessions (
  id TEXT PRIMARY KEY,
  share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_share_sessions_token ON share_sessions(token_hash);
CREATE INDEX idx_share_sessions_share ON share_sessions(share_id);
