-- Migration: Drop clerk_id column from users table
-- Clerk auth has been fully replaced by Supabase Auth.
-- All queries now use supabase_auth_id. The clerk_id column is no longer needed.

DROP INDEX IF EXISTS idx_users_clerk_id;
ALTER TABLE users DROP COLUMN IF EXISTS clerk_id;
