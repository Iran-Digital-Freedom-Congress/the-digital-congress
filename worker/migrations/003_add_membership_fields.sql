ALTER TABLE signups ADD COLUMN membership_type TEXT NOT NULL DEFAULT 'observer';
ALTER TABLE signups ADD COLUMN first_name TEXT;
ALTER TABLE signups ADD COLUMN last_name TEXT;
