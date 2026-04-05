-- Booka.ma Database Schema
-- Run this in your Supabase SQL Editor
-- Last updated: February 2026

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  username TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('user', 'business')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data"
  ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert users" ON users;
DROP POLICY IF EXISTS "Allow insert for service role" ON users;
DROP POLICY IF EXISTS "Allow user inserts" ON users;
-- No INSERT policy for anon: all writes go through service-role API routes

DROP POLICY IF EXISTS "Allow update users" ON users;
DROP POLICY IF EXISTS "Allow update for service role" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
-- No UPDATE policy for anon: all writes go through service-role API routes

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TABLE IF EXISTS business_profile CASCADE;

-- ============================================
-- USER PROFILE (all users - business and regular)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profile (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  bio TEXT,
  birthday DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_to_say')),
  profile_image_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profile;
CREATE POLICY "Users can view own profile"
  ON user_profile FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert user profile" ON user_profile;
-- No INSERT policy for anon: all writes go through service-role API routes

DROP POLICY IF EXISTS "Allow update user profile" ON user_profile;
-- No UPDATE policy for anon: all writes go through service-role API routes

DROP TRIGGER IF EXISTS update_user_profile_updated_at ON user_profile;
CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SERVICE CATEGORIES & SPECIALTIES
-- ============================================
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS specialties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  custom_icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialties_category ON specialties(service_category_id);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service categories viewable by everyone" ON service_categories;
CREATE POLICY "Service categories viewable by everyone"
  ON service_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Specialties viewable by everyone" ON specialties;
CREATE POLICY "Specialties viewable by everyone"
  ON specialties FOR SELECT USING (true);

-- Seed initial service categories
INSERT INTO service_categories (name, slug, description, icon, display_order) VALUES
  ('Beauty & Personal Care', 'beauty_personal_care', 'Hair, makeup, nails, and personal grooming services', 'Sparkles', 1),
  ('Health & Medical', 'health_medical', 'Health, wellness, and medical services', 'Heart', 2),
  ('Sports & Recreation', 'sports_recreation', 'Football fields, sports facilities, and recreational venues', 'Trophy', 3),
  ('Restaurants & Hospitality', 'restaurants_hospitality', 'Restaurants, cafes, and hospitality venues', 'UtensilsCrossed', 4),
  ('Automotive & Vehicles', 'automotive_vehicles', 'Car wash services, mechanical maintenance, and inspection centers', 'Car', 5)
ON CONFLICT (slug) DO NOTHING;

-- Seed specialties for Beauty & Personal Care
INSERT INTO specialties (service_category_id, name, slug, description, icon, custom_icon, display_order)
SELECT sc.id, s.name, s.slug, s.description, s.icon, s.custom_icon, s.display_order
FROM service_categories sc
CROSS JOIN (VALUES
  ('Barber', 'barber', 'Specializing in men''s haircuts, beard trims, and grooming.', NULL, '/images/icons-barber.png', 1),
  ('Hairdresser', 'hairdresser', 'Expert in all types of hair styling and treatments.', NULL, '/images/icons-hairdresser.png', 2),
  ('Makeup', 'makeup', 'Professional makeup artist for all occasions.', NULL, '/images/icon-makeup.png', 3),
  ('Nails', 'nails', 'Manicure, pedicure, and nail art services.', NULL, '/images/icon-nails.png', 4),
  ('Massage', 'massage', 'Relaxation and therapeutic massage treatments.', NULL, '/images/icon-massage.png', 5)
) AS s(name, slug, description, icon, custom_icon, display_order)
WHERE sc.slug = 'beauty_personal_care'
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- BUSINESS INFO (onboarding data)
-- ============================================
CREATE TABLE IF NOT EXISTS business_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  business_category TEXT NOT NULL CHECK (business_category IN ('business_owner', 'mobile_service', 'job_seeker')),
  professional_type TEXT NOT NULL CHECK (professional_type IN ('barber', 'hairdresser', 'makeup', 'nails', 'massage')),
  service_category_id UUID REFERENCES service_categories(id),
  specialty_id UUID REFERENCES specialties(id),
  service_mode TEXT CHECK (service_mode IN ('booking', 'walkin', 'both')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_info_user_id ON business_info(user_id);
CREATE INDEX IF NOT EXISTS idx_business_info_category ON business_info(business_category);
CREATE INDEX IF NOT EXISTS idx_business_info_service_category ON business_info(service_category_id);
CREATE INDEX IF NOT EXISTS idx_business_info_specialty ON business_info(specialty_id);

ALTER TABLE business_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business info viewable by everyone" ON business_info;
CREATE POLICY "Business info viewable by everyone"
  ON business_info FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert business info" ON business_info;
-- No INSERT policy for anon: all writes go through service-role API routes

DROP POLICY IF EXISTS "Allow update business info" ON business_info;
-- No UPDATE policy for anon: all writes go through service-role API routes

DROP TRIGGER IF EXISTS update_business_info_updated_at ON business_info;
CREATE TRIGGER update_business_info_updated_at
  BEFORE UPDATE ON business_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SHOP/SALON INFO (for business_owner category)
-- ============================================
CREATE TABLE IF NOT EXISTS shop_salon_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  work_location TEXT CHECK (work_location IN ('my_place', 'client_location', 'both')),
  business_hours JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_salon_info_business_info_id ON shop_salon_info(business_info_id);

ALTER TABLE shop_salon_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop salon info viewable by everyone" ON shop_salon_info;
CREATE POLICY "Shop salon info viewable by everyone"
  ON shop_salon_info FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert shop salon info" ON shop_salon_info;
-- No INSERT policy for anon: all writes go through service-role API routes

DROP POLICY IF EXISTS "Allow update shop salon info" ON shop_salon_info;
-- No UPDATE policy for anon: all writes go through service-role API routes

DROP TRIGGER IF EXISTS update_shop_salon_info_updated_at ON shop_salon_info;
CREATE TRIGGER update_shop_salon_info_updated_at
  BEFORE UPDATE ON shop_salon_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MOBILE SERVICE INFO (for mobile_service category)
-- ============================================
CREATE TABLE IF NOT EXISTS mobile_service_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  service_area TEXT,
  travel_radius_km INTEGER,
  cities_covered JSONB DEFAULT '[]'::jsonb,
  travel_fee NUMERIC(10,2) DEFAULT 0,
  work_location TEXT CHECK (work_location IN ('my_place', 'client_location', 'both')),
  business_hours JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_service_info_business_info_id ON mobile_service_info(business_info_id);

ALTER TABLE mobile_service_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mobile service info viewable by everyone" ON mobile_service_info;
CREATE POLICY "Mobile service info viewable by everyone"
  ON mobile_service_info FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert mobile service info" ON mobile_service_info;
-- No INSERT policy for anon: all writes go through service-role API routes

DROP POLICY IF EXISTS "Allow update mobile service info" ON mobile_service_info;
-- No UPDATE policy for anon: all writes go through service-role API routes

DROP TRIGGER IF EXISTS update_mobile_service_info_updated_at ON mobile_service_info;
CREATE TRIGGER update_mobile_service_info_updated_at
  BEFORE UPDATE ON mobile_service_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- JOB SEEKER INFO (for job_seeker category)
-- ============================================
CREATE TABLE IF NOT EXISTS job_seeker_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE UNIQUE,
  years_of_experience TEXT CHECK (years_of_experience IN ('less_than_1', '1_to_3', '3_to_5', '5_to_10', 'more_than_10')),
  has_certificate BOOLEAN DEFAULT false,
  preferred_city TEXT[] DEFAULT '{}',
  resume_url TEXT,
  bio TEXT,
  education TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_seeker_info_business_info_id ON job_seeker_info(business_info_id);

ALTER TABLE job_seeker_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Job seeker info viewable by everyone" ON job_seeker_info;
CREATE POLICY "Job seeker info viewable by everyone"
  ON job_seeker_info FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert job seeker info" ON job_seeker_info;
-- No INSERT policy for anon: all writes go through service-role API routes

DROP POLICY IF EXISTS "Allow update job seeker info" ON job_seeker_info;
-- No UPDATE policy for anon: all writes go through service-role API routes

DROP TRIGGER IF EXISTS update_job_seeker_info_updated_at ON job_seeker_info;
CREATE TRIGGER update_job_seeker_info_updated_at
  BEFORE UPDATE ON job_seeker_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Generate unique username from name
-- ============================================
CREATE OR REPLACE FUNCTION generate_username(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  base_username := LOWER(COALESCE(first_name, '') || COALESCE(last_name, ''));
  base_username := REGEXP_REPLACE(base_username, '[^a-z0-9]', '', 'g');
  IF base_username = '' THEN
    base_username := 'user';
  END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  RETURN final_username;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';


-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Stores user roles and basic info synced from Clerk
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  username TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('user', 'business')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by clerk_id
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();



-- ============================================
-- USER PROFILE (all users - business and regular)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profile (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  bio TEXT,
  birthday DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_to_say')),
  profile_image_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profile;
CREATE POLICY "Users can view own profile"
  ON user_profile FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert user profile" ON user_profile;
-- No INSERT policy for anon: all writes go through service-role API routes

DROP POLICY IF EXISTS "Allow update user profile" ON user_profile;
-- No UPDATE policy for anon: all writes go through service-role API routes

DROP TRIGGER IF EXISTS update_user_profile_updated_at ON user_profile;
CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- BUSINESS INFO (base onboarding data - common to all business types)
-- ============================================
CREATE TABLE IF NOT EXISTS business_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  business_category TEXT NOT NULL CHECK (business_category IN ('business_owner', 'mobile_service', 'job_seeker')),
  professional_type TEXT NOT NULL CHECK (professional_type IN ('barber', 'hairdresser', 'makeup', 'nails', 'massage')),
  service_category_id UUID REFERENCES service_categories(id),
  specialty_id UUID REFERENCES specialties(id),
  service_mode TEXT CHECK (service_mode IN ('booking', 'walkin', 'both')),
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_info_user_id ON business_info(user_id);
CREATE INDEX IF NOT EXISTS idx_business_info_category ON business_info(business_category);
CREATE INDEX IF NOT EXISTS idx_business_info_service_category ON business_info(service_category_id);
CREATE INDEX IF NOT EXISTS idx_business_info_specialty ON business_info(specialty_id);

ALTER TABLE business_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business info viewable by everyone" ON business_info;
CREATE POLICY "Business info viewable by everyone"
  ON business_info FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_business_info_updated_at ON business_info;
CREATE TRIGGER update_business_info_updated_at
  BEFORE UPDATE ON business_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SHOP/SALON INFO (for business_owner category)
-- ============================================
-- Physical location business owners
CREATE TABLE IF NOT EXISTS shop_salon_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  work_location TEXT CHECK (work_location IN ('my_place', 'client_location', 'both')),
  business_hours JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- business_hours JSONB format example:
-- [
--   {"dayOfWeek": 0, "isOpen": false, "openTime": null, "closeTime": null},
--   {"dayOfWeek": 1, "isOpen": true, "openTime": "10:00", "closeTime": "19:00"},
--   ...
-- ]

CREATE INDEX IF NOT EXISTS idx_shop_salon_info_business_info_id ON shop_salon_info(business_info_id);

ALTER TABLE shop_salon_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop salon info viewable by everyone" ON shop_salon_info;
CREATE POLICY "Shop salon info viewable by everyone"
  ON shop_salon_info FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_shop_salon_info_updated_at ON shop_salon_info;
CREATE TRIGGER update_shop_salon_info_updated_at
  BEFORE UPDATE ON shop_salon_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MOBILE SERVICE INFO (for mobile_service category)
-- ============================================
-- Mobile service providers who travel to clients
CREATE TABLE IF NOT EXISTS mobile_service_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  service_area TEXT,
  travel_radius_km INTEGER,
  cities_covered JSONB DEFAULT '[]'::jsonb,
  travel_fee NUMERIC(10,2) DEFAULT 0,
  work_location TEXT CHECK (work_location IN ('my_place', 'client_location', 'both')),
  business_hours JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobile_service_info_business_info_id ON mobile_service_info(business_info_id);

ALTER TABLE mobile_service_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mobile service info viewable by everyone" ON mobile_service_info;
CREATE POLICY "Mobile service info viewable by everyone"
  ON mobile_service_info FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_mobile_service_info_updated_at ON mobile_service_info;
CREATE TRIGGER update_mobile_service_info_updated_at
  BEFORE UPDATE ON mobile_service_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- JOB SEEKER INFO (for job_seeker category)
-- ============================================
-- Job seekers looking for employment
CREATE TABLE IF NOT EXISTS job_seeker_info (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE UNIQUE,
  years_of_experience TEXT CHECK (years_of_experience IN ('less_than_1', '1_to_3', '3_to_5', '5_to_10', 'more_than_10')),
  has_certificate BOOLEAN DEFAULT false,
  preferred_city TEXT[] DEFAULT '{}',
  resume_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_seeker_info_business_info_id ON job_seeker_info(business_info_id);

ALTER TABLE job_seeker_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Job seeker info viewable by everyone" ON job_seeker_info;
CREATE POLICY "Job seeker info viewable by everyone"
  ON job_seeker_info FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_job_seeker_info_updated_at ON job_seeker_info;
CREATE TRIGGER update_job_seeker_info_updated_at
  BEFORE UPDATE ON job_seeker_info
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION SCRIPT (run this if updating existing database)
-- ============================================
-- Uncomment and run these if you're updating an existing database:

-- -- Update role constraint from 'barber' to 'business'
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'business'));
-- UPDATE users SET role = 'business' WHERE role = 'barber';

-- -- Add first_name and last_name columns to users table
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- ============================================
-- MIGRATION: From single business_info to separate tables
-- ============================================
-- If you have existing data in business_info with work_location, business_hours, etc.
-- Run these to migrate to the new structure:

-- -- Step 1: Create the new tables (already done if you ran the schema above)

-- -- Step 2: Migrate business_owner data
-- INSERT INTO shop_salon_info (business_info_id, work_location, business_hours)
-- SELECT id, work_location, business_hours
-- FROM business_info
-- WHERE business_category = 'business_owner';

-- -- Step 3: Migrate mobile_service data
-- INSERT INTO mobile_service_info (business_info_id, work_location, business_hours)
-- SELECT id, work_location, business_hours
-- FROM business_info
-- WHERE business_category = 'mobile_service';

-- -- Step 4: Migrate job_seeker data
-- INSERT INTO job_seeker_info (business_info_id, years_of_experience, has_certificate)
-- SELECT id, years_of_experience, has_certificate
-- FROM business_info
-- WHERE business_category = 'job_seeker';

-- -- Step 5: Drop old columns from business_info (optional - do after verifying migration)
-- ALTER TABLE business_info DROP COLUMN IF EXISTS work_location;
-- ALTER TABLE business_info DROP COLUMN IF EXISTS business_hours;
-- ALTER TABLE business_info DROP COLUMN IF EXISTS years_of_experience;
-- ALTER TABLE business_info DROP COLUMN IF EXISTS has_certificate;

-- ============================================
-- MIGRATION: Add new columns for user profile
-- ============================================
-- Run these if you already have the tables and need to add the new columns:

-- Add username to users table
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
-- CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add birthday and gender to user_profile table
-- ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS birthday DATE;
-- ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'prefer_not_to_say'));

-- ============================================
-- FUNCTION: Generate unique username from name
-- ============================================
CREATE OR REPLACE FUNCTION generate_username(first_name TEXT, last_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base username from first_name and last_name
  base_username := LOWER(COALESCE(first_name, '') || COALESCE(last_name, ''));
  -- Remove spaces and special characters
  base_username := REGEXP_REPLACE(base_username, '[^a-z0-9]', '', 'g');
  
  -- If empty, use 'user' as default
  IF base_username = '' THEN
    base_username := 'user';
  END IF;
  
  -- Try base username first
  final_username := base_username;
  
    RETURN final_username;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ============================================
-- MIGRATIONS (idempotent column additions)
-- ============================================
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS cover_image_position INTEGER DEFAULT 50;

-- Add latitude/longitude to shop_salon_info
ALTER TABLE shop_salon_info ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE shop_salon_info ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add business details and coordinates to mobile_service_info
ALTER TABLE mobile_service_info ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE mobile_service_info ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE mobile_service_info ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE mobile_service_info ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE mobile_service_info ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE mobile_service_info ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Migrate preferred_city from TEXT to TEXT[] (array)
ALTER TABLE job_seeker_info ALTER COLUMN preferred_city TYPE TEXT[] USING CASE WHEN preferred_city IS NULL THEN '{}' ELSE ARRAY[preferred_city] END;
ALTER TABLE job_seeker_info ALTER COLUMN preferred_city SET DEFAULT '{}';

-- ============================================
-- SCHEDULE EXCEPTIONS (breaks, closures, holidays, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('break', 'lunch_break', 'closure', 'holiday', 'vacation', 'other')),
  date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_full_day BOOLEAN DEFAULT false,
  recurring BOOLEAN DEFAULT false,
  recurring_day INTEGER CHECK (recurring_day >= 0 AND recurring_day <= 6),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_business_info_id ON schedule_exceptions(business_info_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON schedule_exceptions(date);

ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Schedule exceptions viewable by owner" ON schedule_exceptions;
CREATE POLICY "Schedule exceptions viewable by owner"
  ON schedule_exceptions FOR ALL
  USING (
    business_info_id IN (
      SELECT bi.id FROM business_info bi
      JOIN users u ON u.id = bi.user_id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

DROP TRIGGER IF EXISTS update_schedule_exceptions_updated_at ON schedule_exceptions;
CREATE TRIGGER update_schedule_exceptions_updated_at
  BEFORE UPDATE ON schedule_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE NOT NULL,
  clerk_id TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_address TEXT,
  service TEXT NOT NULL,
  price NUMERIC(10,2),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'completed', 'cancelled')),
  notes TEXT,
  previous_start_time TIMESTAMP WITH TIME ZONE,
  previous_end_time TIMESTAMP WITH TIME ZONE,
  rescheduled_by TEXT CHECK (rescheduled_by IN ('client', 'business')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_business_info_id ON appointments(business_info_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_clerk_id ON appointments(clerk_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Appointments viewable by owner" ON appointments;
CREATE POLICY "Appointments viewable by owner"
  ON appointments FOR ALL
  USING (
    business_info_id IN (
      SELECT bi.id FROM business_info bi
      JOIN users u ON u.id = bi.user_id
      WHERE u.clerk_id = auth.uid()::text
    )
  );

-- Service role key bypasses RLS entirely; no blanket policy needed
DROP POLICY IF EXISTS "Allow all for service role" ON appointments;

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- BUSINESS SERVICES & PRICES
-- ============================================
CREATE TABLE IF NOT EXISTS business_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'MAD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_services_business_info_id ON business_services(business_info_id);
CREATE INDEX IF NOT EXISTS idx_business_services_is_active ON business_services(is_active);

ALTER TABLE business_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business services viewable by owner" ON business_services;
DROP POLICY IF EXISTS "Business services are publicly readable" ON business_services;
CREATE POLICY "Business services are publicly readable"
  ON business_services FOR SELECT
  USING (true);

DROP TRIGGER IF EXISTS update_business_services_updated_at ON business_services;
CREATE TRIGGER update_business_services_updated_at
  BEFORE UPDATE ON business_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migration: remove category column from business_services
ALTER TABLE business_services DROP COLUMN IF EXISTS category;

-- â”€â”€â”€ BUSINESS PUBLIC PAGE SETTINGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Stores per-business card configuration as a single JSONB document.
-- One row per business_info record (enforced by the UNIQUE constraint).
-- All mutations go through the service-role API route, so RLS uses the
-- authenticated user's relationship to business_info for security.

DROP TABLE IF EXISTS business_card_settings CASCADE;

-- Expected settings JSONB structure:
-- {
--   "pageEnabled": boolean,
--   "showProfile": boolean,
--   "businessName": string,
--   "showCoverPhoto": boolean,
--   "showServices": boolean,
--   "showPrices": boolean,
--   "showLocation": boolean,
--   "showRating": boolean,
--   "showResponseTime": boolean,
--   "accentColor": string (slate|amber|rose|teal|violet|blue),
--   "coverGallery": array of image URLs,
--   "avatarUrl": string or null
-- }
CREATE TABLE business_card_settings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_info_id  UUID        NOT NULL
                                  REFERENCES business_info(id)
                                  ON DELETE CASCADE
                                  ON UPDATE CASCADE,
  settings          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_bcs_business_info UNIQUE (business_info_id),
  -- Ensure settings is a JSON object, not an array or scalar
  CONSTRAINT chk_bcs_settings_is_object CHECK (jsonb_typeof(settings) = 'object')
);

-- Fast look-up by business
CREATE INDEX idx_bcs_business_info_id
  ON business_card_settings (business_info_id);

-- Auto-update updated_at on every write
CREATE TRIGGER trg_bcs_updated_at
  BEFORE UPDATE ON business_card_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- â”€â”€ Row Level Security â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE business_card_settings ENABLE ROW LEVEL SECURITY;

-- Service-role key (used by API routes) bypasses RLS entirely.
-- Authenticated users may only touch the row that belongs to their own
-- business_info record (looked up through the users table).

CREATE POLICY "owner can select own card settings"
  ON business_card_settings
  FOR SELECT
  TO authenticated
  USING (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "owner can insert own card settings"
  ON business_card_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "owner can update own card settings"
  ON business_card_settings
  FOR UPDATE
  TO authenticated
  USING (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.clerk_id = auth.uid()::text
    )
  )
  WITH CHECK (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.clerk_id = auth.uid()::text
    )
  );

CREATE POLICY "owner can delete own card settings"
  ON business_card_settings
  FOR DELETE
  TO authenticated
  USING (
    business_info_id IN (
      SELECT bi.id
      FROM   business_info bi
      JOIN   users u ON u.id = bi.user_id
      WHERE  u.clerk_id = auth.uid()::text
    )
  );

-- ============================================
-- MIGRATION: Allow 'admin' role
-- ============================================
-- The users table role CHECK constraint needs to include 'admin'.
-- Admins are ONLY created via direct DB insert â€” never through the app.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'business', 'admin'));

-- Add account_status column so admins can suspend / restrict accounts
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'
  CHECK (account_status IN ('active', 'suspended', 'restricted'));

-- ============================================
-- VERIFICATION REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE NOT NULL,

  -- Document URLs (stored in Supabase Storage)
  identity_document_url TEXT,
  business_document_url TEXT,

  -- Document types (what kind of document was attached)
  identity_document_type TEXT,
  business_document_type TEXT,

  -- Per-document status
  identity_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (identity_status IN ('pending', 'verified', 'rejected')),
  business_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (business_status IN ('pending', 'verified', 'rejected')),

  -- Review metadata
  identity_reviewed_by UUID REFERENCES users(id),
  business_reviewed_by UUID REFERENCES users(id),
  identity_reviewed_at TIMESTAMPTZ,
  business_reviewed_at TIMESTAMPTZ,
  identity_rejection_reason TEXT,
  business_rejection_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vr_user_id ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vr_business_info_id ON verification_requests(business_info_id);
CREATE INDEX IF NOT EXISTS idx_vr_identity_status ON verification_requests(identity_status);
CREATE INDEX IF NOT EXISTS idx_vr_business_status ON verification_requests(business_status);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- All verification access goes through service-role API routes only
DROP POLICY IF EXISTS "Owner can view own verification" ON verification_requests;
DROP POLICY IF EXISTS "Allow insert verification" ON verification_requests;
DROP POLICY IF EXISTS "Allow update verification" ON verification_requests;
-- No permissive policies: sensitive data protected at database level

DROP TRIGGER IF EXISTS update_verification_requests_updated_at ON verification_requests;
CREATE TRIGGER update_verification_requests_updated_at
  BEFORE UPDATE ON verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ADMIN ACTIONS LOG (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_actions_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,                -- e.g. 'approve_identity','reject_business','suspend_user','delete_user'
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aal_admin_user_id ON admin_actions_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_aal_target_user_id ON admin_actions_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_aal_action_type ON admin_actions_log(action_type);

ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;

-- All admin log access goes through service-role API routes only
DROP POLICY IF EXISTS "Admin log read all" ON admin_actions_log;
DROP POLICY IF EXISTS "Admin log insert" ON admin_actions_log;
-- No permissive policies: audit trail protected at database level

-- ============================================
-- JOB APPLICATIONS (job seekers applying to businesses)
-- ============================================
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  applicant_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  business_info_id UUID REFERENCES business_info(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'interview', 'accepted', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(applicant_id, business_info_id)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_business ON job_applications(business_info_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- All job application access goes through service-role API routes only
DROP POLICY IF EXISTS "Job applications viewable by all" ON job_applications;
DROP POLICY IF EXISTS "Job applications insert" ON job_applications;
DROP POLICY IF EXISTS "Job applications update" ON job_applications;
DROP POLICY IF EXISTS "Job applications delete" ON job_applications;
-- No permissive policies: private data protected at database level

DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION: Service Categories & Specialties
-- ============================================
-- Run this if updating an existing database that doesn't have these tables yet.

-- 1. Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service categories viewable by everyone" ON service_categories;
CREATE POLICY "Service categories viewable by everyone"
  ON service_categories FOR SELECT USING (true);

-- 2. Create specialties table
CREATE TABLE IF NOT EXISTS specialties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_category_id UUID REFERENCES service_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  custom_icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialties_category ON specialties(service_category_id);

ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Specialties viewable by everyone" ON specialties;
CREATE POLICY "Specialties viewable by everyone"
  ON specialties FOR SELECT USING (true);

-- 3. Add new columns to business_info
ALTER TABLE business_info
  ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES service_categories(id),
  ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES specialties(id);

CREATE INDEX IF NOT EXISTS idx_business_info_service_category ON business_info(service_category_id);
CREATE INDEX IF NOT EXISTS idx_business_info_specialty ON business_info(specialty_id);

-- 4. Seed service categories
INSERT INTO service_categories (name, slug, description, icon, display_order) VALUES
  ('Beauty & Personal Care', 'beauty_personal_care', 'Hair, makeup, nails, and personal grooming services', 'Sparkles', 1),
  ('Health & Medical', 'health_medical', 'Health, wellness, and medical services', 'Heart', 2),
  ('Sports & Recreation', 'sports_recreation', 'Football fields, sports facilities, and recreational venues', 'Trophy', 3),
  ('Restaurants & Hospitality', 'restaurants_hospitality', 'Restaurants, cafes, and hospitality venues', 'UtensilsCrossed', 4),
  ('Automotive & Vehicles', 'automotive_vehicles', 'Car wash services, mechanical maintenance, and inspection centers', 'Car', 5)
ON CONFLICT (slug) DO NOTHING;

-- 5. Seed specialties for Beauty & Personal Care
INSERT INTO specialties (service_category_id, name, slug, description, icon, custom_icon, display_order)
SELECT sc.id, s.name, s.slug, s.description, s.icon, s.custom_icon, s.display_order
FROM service_categories sc
CROSS JOIN (VALUES
  ('Barber', 'barber', 'Specializing in men''s haircuts, beard trims, and grooming.', NULL, '/images/icons-barber.png', 1),
  ('Hairdresser', 'hairdresser', 'Expert in all types of hair styling and treatments.', NULL, '/images/icons-hairdresser.png', 2),
  ('Makeup', 'makeup', 'Professional makeup artist for all occasions.', NULL, '/images/icon-makeup.png', 3),
  ('Nails', 'nails', 'Manicure, pedicure, and nail art services.', NULL, '/images/icon-nails.png', 4),
  ('Massage', 'massage', 'Relaxation and therapeutic massage treatments.', NULL, '/images/icon-massage.png', 5)
) AS s(name, slug, description, icon, custom_icon, display_order)
WHERE sc.slug = 'beauty_personal_care'
ON CONFLICT (slug) DO NOTHING;


-- ============================================
-- MIGRATION: Add service_mode to business_info
-- ============================================
-- Run this if updating an existing database:
ALTER TABLE business_info
  ADD COLUMN IF NOT EXISTS service_mode TEXT CHECK (service_mode IN ('booking', 'walkin', 'both'));
