-- Migration for sellers_json_cache table with JSONB type for PostgreSQL

-- First, check if sellers_json_cache already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'sellers_json_cache') THEN
    -- Create new table if it doesn't exist
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

    RAISE NOTICE 'Created new sellers_json_cache table';
  ELSE
    -- Table exists, check if we need to alter content column type
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'sellers_json_cache' 
      AND column_name = 'content' 
      AND data_type != 'jsonb'
    ) THEN
      -- Alter the existing table to change content column type
      -- This will preserve all data
      ALTER TABLE sellers_json_cache 
      ALTER COLUMN content TYPE JSONB USING 
        CASE 
          WHEN content IS NULL THEN NULL
          WHEN content = '' THEN NULL
          ELSE content::jsonb 
        END;
      
      RAISE NOTICE 'Altered content column to JSONB type while preserving data';
    ELSE
      RAISE NOTICE 'Table sellers_json_cache already exists with JSONB content column';
    END IF;
    
    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'sellers_json_cache_status_check' 
      AND conrelid = 'sellers_json_cache'::regclass
    ) THEN
      -- Add the check constraint if it doesn't exist
      BEGIN
        ALTER TABLE sellers_json_cache 
        ADD CONSTRAINT sellers_json_cache_status_check 
        CHECK (status IN ('success', 'error', 'not_found', 'invalid_format'));
        
        RAISE NOTICE 'Added status check constraint';
      EXCEPTION
        WHEN check_violation THEN
          RAISE NOTICE 'Some existing data violates the status check constraint. Updating invalid status values.';
          
          -- Update any invalid status values
          UPDATE sellers_json_cache 
          SET status = 'error' 
          WHERE status NOT IN ('success', 'error', 'not_found', 'invalid_format');
          
          -- Try adding the constraint again
          ALTER TABLE sellers_json_cache 
          ADD CONSTRAINT sellers_json_cache_status_check 
          CHECK (status IN ('success', 'error', 'not_found', 'invalid_format'));
          
          RAISE NOTICE 'Updated invalid status values and added constraint';
      END;
    END IF;
  END IF;
END
$$;

-- Create indexes if they don't exist
DO $$
BEGIN
  -- Create an index on domain for faster lookups
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_domain' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_domain ON sellers_json_cache (domain);
    RAISE NOTICE 'Created domain index on sellers_json_cache';
  END IF;

  -- Create a gin index on the JSONB content for faster JSON searches
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_content' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_content ON sellers_json_cache USING gin (content jsonb_path_ops);
    RAISE NOTICE 'Created content JSONB index on sellers_json_cache';
  END IF;

  -- Create an index for finding specific seller_ids quickly
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_seller_id' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_seller_id ON sellers_json_cache 
    USING gin ((content -> 'sellers') jsonb_path_ops);
    RAISE NOTICE 'Created seller_id index on sellers_json_cache';
  END IF;
END
$$;