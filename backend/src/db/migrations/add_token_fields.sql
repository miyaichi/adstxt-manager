-- Add new token fields to requests table
ALTER TABLE requests ADD COLUMN publisher_token TEXT;
ALTER TABLE requests ADD COLUMN requester_token TEXT;

-- Update comment to reflect the new structure
COMMENT ON TABLE requests IS 'Stores ads.txt change requests from requesters to publishers with role-specific tokens';