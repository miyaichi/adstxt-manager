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

-- Create optimized indexes for sellers_json_cache
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

  -- Create a B-Tree index on the domain + status for the common filter combination
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_domain_status' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_domain_status ON sellers_json_cache (domain, status);
    RAISE NOTICE 'Created domain + status index on sellers_json_cache';
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
  
  -- Create a specialized index for seller_id lookups inside arrays
  -- This specifically optimizes the seller_id searches we do frequently
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_sellers_seller_id' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_sellers_seller_id ON sellers_json_cache 
    USING gin ((jsonb_path_query_array(content, '$.sellers[*].seller_id')));
    RAISE NOTICE 'Created specialized seller_id lookup index on sellers_json_cache';
  END IF;
  
  -- Create an index on updated_at for expiration checks
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_updated_at' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_updated_at ON sellers_json_cache (updated_at);
    RAISE NOTICE 'Created updated_at index on sellers_json_cache';
  END IF;
  
  -- Add partial index for success records only to speed up common queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_success_only' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_success_only ON sellers_json_cache (domain) 
    WHERE status = 'success';
    RAISE NOTICE 'Created partial index for success status records';
  END IF;
  
  -- Add functional index for case-insensitive domain matching
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_lower_domain' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_lower_domain ON sellers_json_cache (LOWER(domain));
    RAISE NOTICE 'Created case-insensitive domain index';
  END IF;
  
  -- Add functional index for seller_id lower case matching
  -- This greatly improves performance for case-insensitive seller_id lookups
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_lower_seller_ids' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_lower_seller_ids ON sellers_json_cache 
    USING gin ((jsonb_path_query_array(content, '$.sellers[*].seller_id ? (@ ? (@type() == "string"))').string_value::jsonb));
    RAISE NOTICE 'Created functional index for lowercase seller_id matching';
  END IF;
  
  -- Add specialized index for version and contact_email extraction
  -- This speeds up the common metadata queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_metadata' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_metadata ON sellers_json_cache 
    USING gin ((jsonb_build_object('version', content->>'version', 'contact_email', content->>'contact_email')));
    RAISE NOTICE 'Created metadata extraction index';
  END IF;
  
  -- Add covering index for the most common query pattern
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_sellers_json_cache_covering' 
    AND tablename = 'sellers_json_cache'
  ) THEN
    CREATE INDEX idx_sellers_json_cache_covering ON sellers_json_cache 
    (domain, status, updated_at) INCLUDE (id);
    RAISE NOTICE 'Created covering index for common query pattern';
  END IF;
  
  -- Configure better statistics for the JSONB data to improve query planning
  EXECUTE 'ALTER TABLE sellers_json_cache ALTER COLUMN content SET STATISTICS 1000';
  RAISE NOTICE 'Set higher statistics for content column to improve query planning';
  
  -- Set storage parameters for better performance
  ALTER TABLE sellers_json_cache SET (autovacuum_vacuum_scale_factor = 0.05);
  ALTER TABLE sellers_json_cache SET (autovacuum_analyze_scale_factor = 0.02);
  RAISE NOTICE 'Set optimized autovacuum parameters for sellers_json_cache table';
END
$$;