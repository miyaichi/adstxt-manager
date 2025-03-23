-- Alter requests table to add publisher_name and publisher_domain columns

-- Add missing columns
ALTER TABLE requests ADD COLUMN publisher_name TEXT;
ALTER TABLE requests ADD COLUMN publisher_domain TEXT;

-- Check if status values need to be updated
UPDATE requests SET status = 'updated' WHERE status = 'completed';