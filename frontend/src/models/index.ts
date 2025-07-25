// Request Models
export interface RecordSummary {
  id: string;
  domain: string;
  account_id: string;
  relationship: 'DIRECT' | 'RESELLER';
  status: 'pending' | 'approved' | 'rejected';
  has_warning?: boolean;
  validation_key?: string;
  severity?: string;
}

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
  records_count?: number;
  validation_stats?: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
  records_summary?: RecordSummary[];
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
  sender_email?: string; // Optional now, as it will be determined by the backend based on token
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
  // Add warning-related fields
  is_valid?: boolean; // Whether the record is valid (used by AdsTxtRecordItem)
  has_warning?: boolean; // Whether the record has warnings
  warning?: string; // Legacy warning message
  validation_key?: string; // Validation key for identifying the issue type
  severity?: Severity; // Severity level of the warning
  warning_params?: Record<string, any>; // Parameters for the warning message
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
  original_length?: number;
  optimized_length?: number;
  optimization_level?: 'level1' | 'level2';
  categories?: {
    other: number;
    confidential: number;
    missing_seller_id: number;
    no_seller_json: number;
  };
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

// OpenSincera Models
export interface PublisherMetadata {
  publisherId: string;
  publisherName: string;
  publisherDomain: string;
  status: 'active' | 'inactive' | 'suspended';
  lastUpdated: string;
  contactEmail?: string;
  categories?: string[];
  verificationStatus: 'verified' | 'pending' | 'unverified';
  metadata?: Record<string, any>;
}

export interface GetPublisherMetadataRequest {
  publisherId?: string;
  publisherDomain?: string;
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
}

export interface GetPublisherMetadataResponse {
  publishers: PublisherMetadata[];
  totalCount: number;
  hasMore: boolean;
}

export interface OpenSinceraApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  // メール検証に関する追加プロパティ
  needsVerification?: boolean;
  i18nKey?: string;
  error?: {
    message: string;
    key?: string;
    params?: Record<string, any>;
    stack?: string;
  };
}
