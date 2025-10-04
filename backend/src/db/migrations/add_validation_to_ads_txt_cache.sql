-- Migration to add validation result caching to ads_txt_cache table
-- This optimization stores pre-computed validation results to avoid
-- re-validating ads.txt content on every request

-- Add validated_records column to store the validation results as JSON
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'ads_txt_cache' AND column_name = 'validated_records'
    ) THEN
        ALTER TABLE ads_txt_cache ADD COLUMN validated_records JSONB;
    END IF;
END$$;

-- Add validation_completed_at column to track when validation was performed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'ads_txt_cache' AND column_name = 'validation_completed_at'
    ) THEN
        ALTER TABLE ads_txt_cache ADD COLUMN validation_completed_at TIMESTAMP;
    END IF;
END$$;

-- Create an index on validation_completed_at for faster queries
CREATE INDEX IF NOT EXISTS idx_ads_txt_cache_validation_completed
ON ads_txt_cache (validation_completed_at);

-- Add a comment to document the purpose of these columns
COMMENT ON COLUMN ads_txt_cache.validated_records IS
'JSON array of ParsedAdsTxtEntry objects with validation results from sellers.json cross-check';

COMMENT ON COLUMN ads_txt_cache.validation_completed_at IS
'Timestamp when the validation was last completed for this cache entry';
