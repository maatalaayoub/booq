-- ============================================
-- RLS SECURITY HARDENING MIGRATION
-- ============================================
-- Run this against an existing database to fix overly permissive RLS policies.
--
-- ARCHITECTURE CONTEXT:
-- All app operations go through Next.js API routes using the Supabase
-- service-role key, which bypasses RLS entirely. The anon key
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY) is exposed in the browser and can be
-- extracted by anyone.
--
-- THREAT MODEL:
-- An attacker extracts the anon key from the browser and makes direct
-- Supabase REST API calls. Without proper RLS, they can read, insert,
-- update, or delete ANY data in the database.
--
-- STRATEGY:
-- 1. Public-read tables (business listings, profiles, services):
--    Keep SELECT USING(true), remove all INSERT/UPDATE/DELETE policies
-- 2. Private tables (appointments, schedule, verification, admin logs):
--    Remove ALL permissive policies — service role handles everything
-- 3. Reference tables (categories, specialties):
--    SELECT-only — already correct, no changes needed
-- ============================================

BEGIN;

-- ─── USERS ──────────────────────────────────────────────────
-- Public: usernames, roles visible for profile/listing pages
-- Private: email (but no column-level RLS in Supabase)
-- Fix: Remove INSERT and UPDATE policies
DROP POLICY IF EXISTS "Allow insert users" ON users;
DROP POLICY IF EXISTS "Allow update users" ON users;
-- SELECT policy "Users can view own data" remains (public read)

-- ─── USER PROFILE ───────────────────────────────────────────
-- Public: name, avatar, bio for profile display
-- Fix: Remove INSERT and UPDATE policies
DROP POLICY IF EXISTS "Allow insert user profile" ON user_profile;
DROP POLICY IF EXISTS "Allow update user profile" ON user_profile;
-- SELECT policy "Users can view own profile" remains (public read)

-- ─── BUSINESS INFO ──────────────────────────────────────────
-- Public: business listings are browsable by all users
-- Fix: Remove INSERT and UPDATE policies
DROP POLICY IF EXISTS "Allow insert business info" ON business_info;
DROP POLICY IF EXISTS "Allow update business info" ON business_info;
-- SELECT policy "Business info viewable by everyone" remains

-- ─── SHOP/SALON INFO ────────────────────────────────────────
-- Public: salon details visible on business listing pages
-- Fix: Remove INSERT and UPDATE policies
DROP POLICY IF EXISTS "Allow insert shop salon info" ON shop_salon_info;
DROP POLICY IF EXISTS "Allow update shop salon info" ON shop_salon_info;
-- SELECT policy "Shop salon info viewable by everyone" remains

-- ─── MOBILE SERVICE INFO ────────────────────────────────────
-- Public: mobile service details visible on listing pages
-- Fix: Remove INSERT and UPDATE policies
DROP POLICY IF EXISTS "Allow insert mobile service info" ON mobile_service_info;
DROP POLICY IF EXISTS "Allow update mobile service info" ON mobile_service_info;
-- SELECT policy "Mobile service info viewable by everyone" remains

-- ─── JOB SEEKER INFO ────────────────────────────────────────
-- Public: job seeker profiles visible on listing pages
-- Fix: Remove INSERT and UPDATE policies
DROP POLICY IF EXISTS "Allow insert job seeker info" ON job_seeker_info;
DROP POLICY IF EXISTS "Allow update job seeker info" ON job_seeker_info;
-- SELECT policy "Job seeker info viewable by everyone" remains

-- ─── APPOINTMENTS ───────────────────────────────────────────
-- Private: booking data belongs to the business owner only
-- Fix: Remove the dangerous "Allow all for service role" blanket policy
-- (service role bypasses RLS — that policy was redundant AND opened
--  the table to everyone including anonymous users)
DROP POLICY IF EXISTS "Allow all for service role" ON appointments;
-- "Appointments viewable by owner" remains (uses auth.uid(), denies anon)

-- ─── BUSINESS SERVICES ──────────────────────────────────────
-- Public: service listings browsable by clients
-- Fix: Replace FOR ALL USING(true) with SELECT-only
DROP POLICY IF EXISTS "Business services viewable by owner" ON business_services;
DROP POLICY IF EXISTS "Business services are publicly readable" ON business_services;
CREATE POLICY "Business services are publicly readable"
  ON business_services FOR SELECT
  USING (true);

-- ─── VERIFICATION REQUESTS ──────────────────────────────────
-- Sensitive: identity documents, verification status
-- Fix: Remove all permissive policies — service role handles access
DROP POLICY IF EXISTS "Owner can view own verification" ON verification_requests;
DROP POLICY IF EXISTS "Allow insert verification" ON verification_requests;
DROP POLICY IF EXISTS "Allow update verification" ON verification_requests;

-- ─── ADMIN ACTIONS LOG ──────────────────────────────────────
-- Sensitive: audit trail of admin operations
-- Fix: Remove all permissive policies — service role handles access
DROP POLICY IF EXISTS "Admin log read all" ON admin_actions_log;
DROP POLICY IF EXISTS "Admin log insert" ON admin_actions_log;

-- ─── JOB APPLICATIONS ──────────────────────────────────────
-- Private: applications between job seekers and businesses
-- Fix: Remove all permissive policies — service role handles access
DROP POLICY IF EXISTS "Job applications viewable by all" ON job_applications;
DROP POLICY IF EXISTS "Job applications insert" ON job_applications;
DROP POLICY IF EXISTS "Job applications update" ON job_applications;
DROP POLICY IF EXISTS "Job applications delete" ON job_applications;

-- ─── SCHEDULE EXCEPTIONS ────────────────────────────────────
-- Already secured: ownership check via auth.uid() denies anon access
-- No changes needed

-- ─── SERVICE CATEGORIES & SPECIALTIES ───────────────────────
-- Already secured: SELECT-only policies, no write policies
-- No changes needed

-- ─── BUSINESS CARD SETTINGS ────────────────────────────────
-- Already secured: properly scoped to authenticated role with ownership checks
-- No changes needed

COMMIT;

-- ============================================
-- VERIFICATION: Run this to confirm no open write policies remain
-- ============================================
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
