-- Migration to add missing columns to ads_txt_cache table

-- Add url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'ads_txt_cache' AND column_name = 'url'
    ) THEN
        ALTER TABLE ads_txt_cache ADD COLUMN url TEXT;
    END IF;
END$$;

-- Add status_code column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'ads_txt_cache' AND column_name = 'status_code'
    ) THEN
        ALTER TABLE ads_txt_cache ADD COLUMN status_code INTEGER;
    END IF;
END$$;

-- Add error_message column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'ads_txt_cache' AND column_name = 'error_message'
    ) THEN
        ALTER TABLE ads_txt_cache ADD COLUMN error_message TEXT;
    END IF;
END$$;

-- Fix status column to use TEXT type with proper check constraint if needed
DO $$
BEGIN
    -- First check if status is INTEGER type (needs conversion)
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'ads_txt_cache' AND column_name = 'status' AND data_type = 'integer'
    ) THEN
        -- Create a temporary column
        ALTER TABLE ads_txt_cache ADD COLUMN status_new TEXT;
        
        -- Update the new column based on the old status value
        UPDATE ads_txt_cache SET status_new = 
            CASE 
                WHEN status = 0 THEN 'success'
                WHEN status = 1 THEN 'error'
                WHEN status = 2 THEN 'not_found'
                WHEN status = 3 THEN 'invalid_format'
                ELSE 'success'
            END;
            
        -- Drop the old column
        ALTER TABLE ads_txt_cache DROP COLUMN status;
        
        -- Rename the new column to status
        ALTER TABLE ads_txt_cache RENAME COLUMN status_new TO status;
        
        -- Add check constraint
        ALTER TABLE ads_txt_cache ADD CONSTRAINT chk_ads_txt_cache_status 
            CHECK (status IN ('success', 'error', 'not_found', 'invalid_format'));
    END IF;
END$$;