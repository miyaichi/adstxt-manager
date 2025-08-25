-- Migration to add file_type column to ads_txt_cache table

-- Add file_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'ads_txt_cache' AND column_name = 'file_type'
    ) THEN
        ALTER TABLE ads_txt_cache ADD COLUMN file_type TEXT DEFAULT 'ads.txt' 
        CHECK (file_type IN ('ads.txt', 'app-ads.txt'));
    END IF;
END$$;