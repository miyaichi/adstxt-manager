-- Migration to add sellers_json_cache table

-- Create sellers_json_cache table
CREATE TABLE IF NOT EXISTS sellers_json_cache (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  content TEXT,
  status TEXT NOT NULL,
  status_code INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sellers_json_cache_domain ON sellers_json_cache (domain);