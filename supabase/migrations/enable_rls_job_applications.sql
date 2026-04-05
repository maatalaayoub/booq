-- Enable RLS on job_applications table
-- All access goes through Next.js API routes using service-role key (bypasses RLS).
-- This prevents direct access via the anon key exposed in the browser.

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies to lock down the table
DROP POLICY IF EXISTS "Job applications viewable by all" ON job_applications;
DROP POLICY IF EXISTS "Job applications insert" ON job_applications;
DROP POLICY IF EXISTS "Job applications update" ON job_applications;
DROP POLICY IF EXISTS "Job applications delete" ON job_applications;
