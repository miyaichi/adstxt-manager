-- Migration for sellers_json_cache table with JSONB type for PostgreSQL

-- Create or replace the sellers_json_cache table with JSONB content
DROP TABLE IF EXISTS sellers_json_cache;

CREATE TABLE sellers_json_cache (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  content JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'not_found', 'invalid_format')),
  status_code INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create an index on domain for faster lookups
CREATE INDEX idx_sellers_json_cache_domain ON sellers_json_cache (domain);

-- Create a gin index on the JSONB content for faster JSON searches
CREATE INDEX idx_sellers_json_cache_content ON sellers_json_cache USING gin (content jsonb_path_ops);

-- Create an index for finding specific seller_ids quickly
CREATE INDEX idx_sellers_json_cache_seller_id ON sellers_json_cache 
USING gin ((content -> 'sellers') jsonb_path_ops);