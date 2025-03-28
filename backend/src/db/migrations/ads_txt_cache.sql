-- Migration for ads_txt_cache table

CREATE TABLE IF NOT EXISTS ads_txt_cache (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  content TEXT,
  url TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'not_found', 'invalid_format')),
  status_code INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create an index on domain for faster lookups
CREATE INDEX IF NOT EXISTS idx_ads_txt_cache_domain ON ads_txt_cache (domain);