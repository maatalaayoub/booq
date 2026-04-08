-- Site Access Gate: access codes + attempt logging
-- Run this migration against your Supabase database

-- Table: site_access (stores access codes)
CREATE TABLE IF NOT EXISTS site_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: access_attempts (logs every gate attempt)
CREATE TABLE IF NOT EXISTS access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for rate-limiting queries (by IP + time)
CREATE INDEX IF NOT EXISTS idx_access_attempts_ip_created
  ON access_attempts (ip, created_at DESC);

-- Index for active code lookups
CREATE INDEX IF NOT EXISTS idx_site_access_active
  ON site_access (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE site_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_attempts ENABLE ROW LEVEL SECURITY;

-- No public access — only service role key can read/write these tables
-- (No RLS policies = deny all for anon/authenticated roles)

-- Insert a default access code (change this!)
-- INSERT INTO site_access (code, is_active, expires_at)
-- VALUES ('your-secret-code', true, null);
