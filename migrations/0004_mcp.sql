CREATE TABLE mcp_grants (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL,
  device_ids TEXT NOT NULL DEFAULT '[]',
  permissions TEXT NOT NULL DEFAULT '[]',
  expires_at INTEGER,
  cap_a INTEGER NOT NULL,
  cap_b INTEGER NOT NULL,
  cap_step INTEGER NOT NULL,
  cap_rpm INTEGER,
  cap_wave_s INTEGER,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX idx_mcp_grants_admin ON mcp_grants(admin_id);
CREATE INDEX idx_mcp_grants_token ON mcp_grants(token_hash);

CREATE TABLE mcp_usage (
  grant_id TEXT NOT NULL REFERENCES mcp_grants(id) ON DELETE CASCADE,
  window_start INTEGER NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (grant_id, window_start)
);
