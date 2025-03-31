-- Create a view that emulates the structure expected by the controller
CREATE OR REPLACE VIEW sellers_json_view AS
WITH domain_summary AS (
  SELECT 
    domain,
    MAX(updated_at) as updated_at,
    MAX(created_at) as created_at
  FROM 
    sellers_json_cache
  GROUP BY 
    domain
)
SELECT 
  gen_random_uuid() as id,
  ds.domain,
  '{"sellers":[' || 
  string_agg(
    json_build_object(
      'seller_id', sjc.seller_id,
      'name', sjc.name,
      'domain', sjc.domain,
      'seller_type', sjc.seller_type,
      'domain_match', (sjc.domain_match::int = 1),
      'is_confidential', (sjc.is_confidential::int = 1)
    )::text, 
    ','
  ) || 
  ']}' as content,
  'success' as status,
  200 as status_code,
  NULL as error_message,
  ds.created_at,
  ds.updated_at
FROM 
  sellers_json_cache sjc
JOIN 
  domain_summary ds ON sjc.domain = ds.domain
GROUP BY 
  ds.domain, ds.updated_at, ds.created_at;