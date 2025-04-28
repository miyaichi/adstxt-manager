-- Migration to add file_type column to ads_txt_cache table for SQLite

-- Add file_type column if it doesn't exist
ALTER TABLE ads_txt_cache ADD COLUMN file_type TEXT DEFAULT 'ads.txt';

-- Update existing records to set file_type = 'ads.txt'
UPDATE ads_txt_cache SET file_type = 'ads.txt' WHERE file_type IS NULL;