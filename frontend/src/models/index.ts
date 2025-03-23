// Request Models
export interface Request {
  id: string;
  publisher_email: string;
  requester_email: string;
  requester_name: string;
  publisher_name?: string;
  publisher_domain?: string;
  status: 'pending' | 'approved' | 'rejected' | 'updated';
  token: string;
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
  token: string;
}

export interface RequestWithRecords {
  request: Request;
  records: AdsTxtRecord[];
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

export interface ParsedAdsTxtRecord {
  domain: string;
  account_id: string;
  account_type: string;
  certification_authority_id?: string;
  relationship: 'DIRECT' | 'RESELLER';
  line_number: number;
  raw_line: string;
  is_valid: boolean;
  error?: string;
}

export interface ProcessAdsTxtResponse {
  records: ParsedAdsTxtRecord[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
}

// API Response Wrappers
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    stack?: string;
  };
}
