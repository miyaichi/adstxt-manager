-- Migration for sellers_json_seller_lookup table (normalized seller search optimization)
-- This table enables high-performance seller_id lookups for sellers.json data

DO $$
BEGIN
  -- Check if the sellers_json_seller_lookup table already exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'sellers_json_seller_lookup') THEN
    -- Create the normalized seller lookup table
    CREATE TABLE sellers_json_seller_lookup (
      cache_id TEXT NOT NULL REFERENCES sellers_json_cache(id) ON DELETE CASCADE,
      seller_id TEXT NOT NULL,
      domain TEXT NOT NULL, -- TEXT type, case normalization handled at insert time
      seller_data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (cache_id, seller_id) -- Composite primary key ensures uniqueness
    );

    RAISE NOTICE 'Created sellers_json_seller_lookup table';
  ELSE
    RAISE NOTICE 'sellers_json_seller_lookup table already exists';
  END IF;
END
$$;

-- Create optimized indexes for the sellers_json_seller_lookup table
DO $$
BEGIN
  -- Functional index for case-insensitive domain + seller_id combination (most common query pattern)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_seller_lookup_lower_domain_seller_id'
    AND tablename = 'sellers_json_seller_lookup'
  ) THEN
    CREATE INDEX idx_seller_lookup_lower_domain_seller_id
    ON sellers_json_seller_lookup (LOWER(domain), seller_id);
    RAISE NOTICE 'Created case-insensitive domain + seller_id index on sellers_json_seller_lookup';
  END IF;

  -- Index for seller_id lookups across all domains
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_seller_lookup_seller_id'
    AND tablename = 'sellers_json_seller_lookup'
  ) THEN
    CREATE INDEX idx_seller_lookup_seller_id
    ON sellers_json_seller_lookup (seller_id);
    RAISE NOTICE 'Created seller_id index on sellers_json_seller_lookup';
  END IF;

  -- Index for domain-only lookups (useful for domain-specific operations)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_seller_lookup_domain'
    AND tablename = 'sellers_json_seller_lookup'
  ) THEN
    CREATE INDEX idx_seller_lookup_domain
    ON sellers_json_seller_lookup (domain);
    RAISE NOTICE 'Created domain index on sellers_json_seller_lookup';
  END IF;

  -- GIN index for JSONB seller_data for flexible JSON queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_seller_lookup_seller_data'
    AND tablename = 'sellers_json_seller_lookup'
  ) THEN
    CREATE INDEX idx_seller_lookup_seller_data
    ON sellers_json_seller_lookup USING gin (seller_data jsonb_path_ops);
    RAISE NOTICE 'Created seller_data JSONB index on sellers_json_seller_lookup';
  END IF;

  -- Index for updated_at for maintenance and monitoring queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_seller_lookup_updated_at'
    AND tablename = 'sellers_json_seller_lookup'
  ) THEN
    CREATE INDEX idx_seller_lookup_updated_at
    ON sellers_json_seller_lookup (updated_at);
    RAISE NOTICE 'Created updated_at index on sellers_json_seller_lookup';
  END IF;

  -- Covering index for the most common query pattern (domain + seller_id)
  -- Only include cache_id to avoid index size limits (seller_data is too large)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_seller_lookup_covering'
    AND tablename = 'sellers_json_seller_lookup'
  ) THEN
    CREATE INDEX idx_seller_lookup_covering
    ON sellers_json_seller_lookup (domain, seller_id) INCLUDE (cache_id);
    RAISE NOTICE 'Created covering index for optimized lookups on sellers_json_seller_lookup';
  END IF;
END
$$;

-- Set storage parameters for better performance
DO $$
BEGIN
  -- Configure autovacuum settings for the lookup table
  ALTER TABLE sellers_json_seller_lookup SET (autovacuum_vacuum_scale_factor = 0.05);
  ALTER TABLE sellers_json_seller_lookup SET (autovacuum_analyze_scale_factor = 0.02);
  RAISE NOTICE 'Set optimized autovacuum parameters for sellers_json_seller_lookup table';

  -- Set higher statistics for better query planning on frequently queried columns
  EXECUTE 'ALTER TABLE sellers_json_seller_lookup ALTER COLUMN seller_data SET STATISTICS 1000';
  EXECUTE 'ALTER TABLE sellers_json_seller_lookup ALTER COLUMN domain SET STATISTICS 500';
  EXECUTE 'ALTER TABLE sellers_json_seller_lookup ALTER COLUMN seller_id SET STATISTICS 500';
  RAISE NOTICE 'Set higher statistics for key columns to improve query planning';
END
$$;

-- Add helpful comments for documentation
COMMENT ON TABLE sellers_json_seller_lookup IS 'Normalized table for high-performance seller_id lookups in sellers.json data. Eliminates need for JSONB array scanning.';
COMMENT ON COLUMN sellers_json_seller_lookup.cache_id IS 'Foreign key to sellers_json_cache.id (TEXT type)';
COMMENT ON COLUMN sellers_json_seller_lookup.seller_id IS 'Seller ID extracted from sellers.json for fast lookup';
COMMENT ON COLUMN sellers_json_seller_lookup.domain IS 'Domain name in lowercase using TEXT type with functional indexes for case-insensitive matching';
COMMENT ON COLUMN sellers_json_seller_lookup.seller_data IS 'Complete seller object from sellers.json stored as JSONB';