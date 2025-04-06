// Request Models
export interface Request {
  id: string;
  publisher_email: string;
  requester_email: string;
  requester_name: string;
  publisher_name?: string;
  publisher_domain?: string;
  status: 'pending' | 'approved' | 'rejected' | 'updated';
  token?: string; // Legacy token
  publisher_token?: string; // Publisher-specific token
  requester_token?: string; // Requester-specific token
  created_at: string;
  updated_at: string;
}

export interface CreateRequestData {
  publisher_email: string;
  requester_email: string;
  requester_name: string;
  publisher_name?: string;
  publisher_domain?: string;
  adsTxtFile?: File;
  records?: AdsTxtRecord[];
}

export interface RequestResponse {
  request_id: string;
  token?: string; // Legacy token
  publisher_token?: string; // Publisher-specific token
  requester_token?: string; // Requester-specific token
}

export interface RequestWithRecords {
  request: Request;
  records: AdsTxtRecord[];
  role?: 'publisher' | 'requester'; // User's role for this request
}

// Message Models
export interface Message {
  id: string;
  request_id: string;
  sender_email: string;
  content: string;
  created_at: string;
}

export interface CreateMessageData {
  request_id: string;
  sender_email: string;
  content: string;
  token: string;
}

// Ads.txt Models
export interface AdsTxtRecord {
  id: string;
  request_id: string;
  domain: string;
  account_id: string;
  account_type: string;
  certification_authority_id?: string;
  relationship: 'DIRECT' | 'RESELLER';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CreateAdsTxtRecordData {
  domain: string;
  account_id: string;
  account_type: string;
  certification_authority_id?: string;
  relationship?: 'DIRECT' | 'RESELLER';
}

export type Severity = 'error' | 'warning' | 'info';

export interface ParsedAdsTxtRecord {
  domain: string;
  account_id: string;
  account_type: string;
  certification_authority_id?: string;
  relationship: 'DIRECT' | 'RESELLER';
  line_number: number;
  raw_line: string;
  is_valid: boolean;
  error?: string; // Legacy field
  has_warning?: boolean;
  warning?: string; // Legacy field
  warning_params?: Record<string, any>; // Parameters for warning/error message
  validation_key?: string; // New field: key identifying the validation issue
  severity?: Severity; // New field: importance level of the validation issue
  duplicate_domain?: string; // Domain where the duplicate was found (for backward compatibility)
  all_warnings?: Array<{ key: string; params?: Record<string, any>; severity?: Severity }>; // Multiple warnings with params
  validation_results?: any; // Detailed validation results from sellers.json check
  validation_error?: string; // Error during sellers.json validation
}

export interface ProcessAdsTxtResponse {
  records: ParsedAdsTxtRecord[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
}

export interface AdsTxtCacheResponse {
  domain: string;
  content: string | null;
  url: string | null;
  status: 'success' | 'error' | 'not_found' | 'invalid_format';
  status_code: number | null;
  error_message: string | null;
  cached: boolean;
  updated_at: string;
}

export interface OptimizeAdsTxtResponse {
  optimized_content: string;
}

// Sellers.json Models
export interface SellersJsonSeller {
  seller_id: string;
  name?: string;
  domain?: string;
  seller_type: 'PUBLISHER' | 'INTERMEDIARY' | 'BOTH' | string;
  is_confidential?: boolean;
  comment?: string;
  ext?: any;
  [key: string]: any;
}

export interface SellersJsonMetadata {
  contact_email?: string;
  contact_address?: string;
  version?: string;
  identifiers?: Array<{
    name: string;
    value: string;
    [key: string]: any;
  }>;
  seller_count: number;
  ext?: any;
}

export interface SellersJsonCacheInfo {
  is_cached: boolean;
  last_updated?: string;
  status?: string;
  expires_at?: string;
}

export interface SellersJsonSellerResponse {
  domain: string;
  seller: SellersJsonSeller | null;
  found: boolean;
  key?: string; // エラーキー
  params?: Record<string, any>; // エラーパラメータ
  metadata: SellersJsonMetadata;
  cache: SellersJsonCacheInfo;
}

export interface SellersJsonMetadataResponse {
  domain: string;
  metadata: SellersJsonMetadata;
  cache: SellersJsonCacheInfo;
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    key?: string;
    params?: Record<string, any>;
    stack?: string;
  };
}
