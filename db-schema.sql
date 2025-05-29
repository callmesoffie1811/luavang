-- Add google_id column to users table
ALTER TABLE users ADD COLUMN google_id TEXT;

-- Create index for faster lookup
CREATE INDEX idx_google_id ON users(google_id);
