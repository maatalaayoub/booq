-- ============================================
-- RLS MIGRATION: clerk_id → supabase_auth_id
-- ============================================
-- With Supabase Auth, auth.uid() returns the supabase_auth_id UUID.
-- All RLS policies that matched `u.clerk_id = auth.uid()::text`
-- must now match `u.supabase_auth_id = auth.uid()`.
--
-- This migration also adds the supabase_auth_id column if missing
-- and creates an index for efficient RLS sub-queries.
-- ============================================

BEGIN;

-- ─── 1. Add supabase_auth_id column (idempotent) ───────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS supabase_auth_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_supabase_auth_id
  ON users(supabase_auth_id);

-- ─── 2. SCHEDULE EXCEPTIONS ────────────────────────────────
DROP POLICY IF EXISTS "Schedule exceptions viewable by owner" ON schedule_exceptions;
CREATE POLICY "Schedule exceptions viewable by owner"
  ON schedule_exceptions FOR ALL
  USING (
    business_info_id IN (
      SELECT bi.id FROM business_info bi
      JOIN users u ON u.id = bi.user_id
      WHERE u.supabase_auth_id = auth.uid()
    )
  );

-- ─── 3. APPOINTMENTS ───────────────────────────────────────
DROP POLICY IF EXISTS "Appointments viewable by owner" ON appointments;
CREATE POLICY "Appointments viewable by owner"
  ON appointments FOR ALL
  USING (
    business_info_id IN (
      SELECT bi.id FROM business_info bi
      JOIN users u ON u.id = bi.user_id
      WHERE u.supabase_auth_id = auth.uid()
    )
  );

-- ─── 4. BUSINESS CARD SETTINGS ─────────────────────────────
DROP POLICY IF EXISTS "owner can select own card settings" ON business_card_settings;
CREATE POLICY "owner can select own card settings"
  ON business_card_settings
  FOR SELECT
  TO authenticated
  USING (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.supabase_auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner can insert own card settings" ON business_card_settings;
CREATE POLICY "owner can insert own card settings"
  ON business_card_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.supabase_auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner can update own card settings" ON business_card_settings;
CREATE POLICY "owner can update own card settings"
  ON business_card_settings
  FOR UPDATE
  TO authenticated
  USING (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.supabase_auth_id = auth.uid()
    )
  )
  WITH CHECK (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.supabase_auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner can delete own card settings" ON business_card_settings;
CREATE POLICY "owner can delete own card settings"
  ON business_card_settings
  FOR DELETE
  TO authenticated
  USING (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.supabase_auth_id = auth.uid()
    )
  );

-- ─── 5. USERS TABLE: allow users to read their own row ─────
-- The existing "Users can view own data" is USING(true) which is fine
-- for public profiles. Optionally add a policy for self-identification:
-- (Not required if service-role handles all writes)

COMMIT;
