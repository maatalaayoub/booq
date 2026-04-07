-- Migration: Rename clerk_id → auth_id on appointments table
-- This removes the last Clerk naming dependency from the database.

-- 1. Rename the column
ALTER TABLE appointments RENAME COLUMN clerk_id TO auth_id;

-- 2. Rename the index
DROP INDEX IF EXISTS idx_appointments_clerk_id;
CREATE INDEX IF NOT EXISTS idx_appointments_auth_id ON appointments(auth_id);

-- 3. Update RLS policies that reference clerk_id (if any)
-- The current appointments RLS policy uses business_info_id → users join,
-- so no policy changes needed for the column rename.
