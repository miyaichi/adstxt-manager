-- Migration to add file_type column to ads_txt_cache table

-- Add file_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'ads_txt_cache' AND column_name = 'file_type'
    ) THEN
        ALTER TABLE ads_txt_cache ADD COLUMN file_type TEXT DEFAULT 'ads.txt';
        
        -- Add check constraint for file_type
        ALTER TABLE ads_txt_cache ADD CONSTRAINT chk_ads_txt_cache_file_type 
            CHECK (file_type IN ('ads.txt', 'app-ads.txt'));
    END IF;
END$$;

-- Update existing records to set file_type = 'ads.txt'
UPDATE ads_txt_cache SET file_type = 'ads.txt' WHERE file_type IS NULL;