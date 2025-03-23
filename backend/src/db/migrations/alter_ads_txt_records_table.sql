-- Alter ads_txt_records table to add request_id and status columns

-- Add missing columns
ALTER TABLE ads_txt_records ADD COLUMN request_id TEXT NOT NULL DEFAULT '';
ALTER TABLE ads_txt_records ADD COLUMN status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending';

-- Create index on request_id
CREATE INDEX IF NOT EXISTS idx_ads_txt_records_request_id ON ads_txt_records (request_id);

-- Remove publisher_id column and index if they exist (rename to request_id)
-- In SQLite, we can't directly drop columns, so we need to create a new table and copy data
-- This is a basic migration - actual data migration would need more careful handling
CREATE TABLE IF NOT EXISTS ads_txt_records_new (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_type TEXT NOT NULL,
  relationship TEXT CHECK(relationship IN ('DIRECT', 'RESELLER')) NOT NULL,
  certification_authority_id TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Copy data from old table to new table (if there's any data to preserve)
INSERT OR IGNORE INTO ads_txt_records_new (
  id, request_id, domain, account_id, account_type, 
  relationship, certification_authority_id, status, created_at, updated_at
)
SELECT 
  id, publisher_id, domain, account_id, account_type, 
  relationship, certification_authority_id, 'pending', created_at, updated_at
FROM ads_txt_records;

-- Drop old table
DROP TABLE IF EXISTS ads_txt_records;

-- Rename new table to old table name
ALTER TABLE ads_txt_records_new RENAME TO ads_txt_records;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_ads_txt_records_domain ON ads_txt_records (domain);
CREATE INDEX IF NOT EXISTS idx_ads_txt_records_request_id ON ads_txt_records (request_id);