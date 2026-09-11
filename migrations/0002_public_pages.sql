CREATE TABLE public_pages (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_public_pages_enabled ON public_pages(enabled);
