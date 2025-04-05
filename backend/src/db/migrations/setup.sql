-- Initial schema for Ads.txt Manager

-- Drop tables if they exist to reset database schema
DROP TABLE IF EXISTS ads_txt_records;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS requests;

-- Create requests table
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  publisher_email TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  publisher_name TEXT,
  publisher_domain TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'updated')) NOT NULL DEFAULT 'pending',
  ads_txt_content TEXT,
  token TEXT UNIQUE NOT NULL,
  publisher_token TEXT UNIQUE,
  requester_token TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Create ads_txt_records table
CREATE TABLE ads_txt_records (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_type TEXT NOT NULL,
  relationship TEXT CHECK(relationship IN ('DIRECT', 'RESELLER')) NOT NULL,
  certification_authority_id TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_requests_publisher_email ON requests (publisher_email);
CREATE INDEX idx_requests_requester_email ON requests (requester_email);
CREATE INDEX idx_requests_status ON requests (status);
CREATE INDEX idx_messages_request_id ON messages (request_id);
CREATE INDEX idx_ads_txt_records_request_id ON ads_txt_records (request_id);
CREATE INDEX idx_ads_txt_records_domain ON ads_txt_records (domain);