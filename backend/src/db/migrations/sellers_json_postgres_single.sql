-- Migration for single domain to JSONB format

-- Create function to migrate a single domain
CREATE OR REPLACE FUNCTION migrate_single_domain_to_jsonb(target_domain TEXT) RETURNS void AS $$
DECLARE
  seller_records RECORD;
  sellers_array JSONB := '[]'::JSONB;
  json_content JSONB;
BEGIN
  -- Reset the sellers array
  sellers_array := '[]'::JSONB;
  
  -- Get all sellers for this domain and build a JSON array
  FOR seller_records IN 
    SELECT 
      seller_id, 
      name, 
      seller_type, 
      (domain_match::int = 1) AS domain_match, 
      (is_confidential::int = 1) AS is_confidential
    FROM 
      sellers_json_cache 
    WHERE 
      domain = target_domain
  LOOP
    -- Add seller to array
    sellers_array := sellers_array || jsonb_build_object(
      'seller_id', seller_records.seller_id,
      'name', seller_records.name,
      'domain', target_domain,
      'seller_type', seller_records.seller_type,
      'domain_match', seller_records.domain_match,
      'is_confidential', seller_records.is_confidential
    );
  END LOOP;
  
  -- Build the complete JSON structure
  json_content := jsonb_build_object('sellers', sellers_array);
  
  -- Insert into JSONB table
  INSERT INTO sellers_json_cache_jsonb (
    id, domain, content, status, status_code, error_message, created_at, updated_at
  ) 
  VALUES (
    gen_random_uuid(), 
    target_domain, 
    json_content, 
    'success', 
    200, 
    NULL, 
    NOW()::TEXT, 
    NOW()::TEXT
  )
  ON CONFLICT (domain) 
  DO UPDATE SET 
    content = json_content,
    updated_at = NOW()::TEXT;
    
  RAISE NOTICE 'Migrated data for domain: %', target_domain;
END;
$$ LANGUAGE plpgsql;