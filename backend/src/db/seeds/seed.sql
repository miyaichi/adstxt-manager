-- Seed data for testing and development

-- Sample Requests
INSERT INTO requests (
  id, 
  publisher_email, 
  requester_email, 
  requester_name, 
  status, 
  ads_txt_content, 
  token, 
  created_at, 
  updated_at
) VALUES (
  '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  'publisher@example.com',
  'advertiser@partner.com',
  'John Smith',
  'pending',
  'google.com, pub-1234567890, DIRECT
adnetwork.com, abcd1234, RESELLER, f08c47fec0942fa0',
  'test-token-1',
  '2023-01-01T12:00:00.000Z',
  '2023-01-01T12:00:00.000Z'
),
(
  '2c9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bbd',
  'publisher@example.com',
  'agency@adcompany.com',
  'Jane Doe',
  'approved',
  'google.com, pub-1234567890, DIRECT
adnetwork.com, abcd1234, RESELLER, f08c47fec0942fa0
newpartner.com, xyz9876, DIRECT',
  'test-token-2',
  '2023-01-02T12:00:00.000Z',
  '2023-01-02T13:30:00.000Z'
);

-- Sample Messages
INSERT INTO messages (
  id,
  request_id,
  sender_email,
  content,
  created_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  'advertiser@partner.com',
  'Hello, I would like to add our company to your ads.txt file.',
  '2023-01-01T12:05:00.000Z'
),
(
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  'publisher@example.com',
  'Could you provide more information about your company?',
  '2023-01-01T14:10:00.000Z'
),
(
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  '2c9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bbd',
  'agency@adcompany.com',
  'Please add our new partner to your ads.txt file.',
  '2023-01-02T12:05:00.000Z'
);

-- Sample Ads.txt Records
INSERT INTO ads_txt_records (
  id,
  domain,
  account_id,
  account_type,
  relationship,
  certification_authority_id,
  publisher_id,
  created_at,
  updated_at
) VALUES (
  'd4e5f6a7-b8c9-0123-def4-56789abcdef0',
  'google.com',
  'pub-1234567890',
  'google',
  'DIRECT',
  NULL,
  NULL,
  '2023-01-01T12:00:00.000Z',
  '2023-01-01T12:00:00.000Z'
),
(
  'e5f6a7b8-c9d0-1234-ef56-789abcdef012',
  'adnetwork.com',
  'abcd1234',
  'adexchange',
  'RESELLER',
  'f08c47fec0942fa0',
  NULL,
  '2023-01-01T12:00:00.000Z',
  '2023-01-01T12:00:00.000Z'
);