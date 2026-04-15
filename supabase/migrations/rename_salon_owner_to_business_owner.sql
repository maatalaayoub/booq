-- Migration: Rename salon_owner to business_owner
-- Date: 2026-04-05

-- Step 1: Drop old CHECK constraint first
ALTER TABLE business_info
  DROP CONSTRAINT IF EXISTS business_info_business_category_check;

-- Step 2: Update existing data
UPDATE business_info
SET business_category = 'business_owner'
WHERE business_category = 'salon_owner';

-- Step 3: Add new CHECK constraint
ALTER TABLE business_info
  ADD CONSTRAINT business_info_business_category_check
  CHECK (business_category IN ('business_owner', 'mobile_service', 'job_seeker'));

-- Step 4: Add new service categories
INSERT INTO service_categories (name, slug, description, icon, display_order) VALUES
  ('Sports & Recreation', 'sports_recreation', 'Football fields, sports facilities, and recreational venues', 'Trophy', 3),
  ('Restaurants & Hospitality', 'restaurants_hospitality', 'Restaurants, cafes, and hospitality venues', 'UtensilsCrossed', 4),
  ('Car & Vehicle Repair', 'automotive_vehicles', 'Car wash services, mechanical maintenance, and inspection centers', 'Car', 5),
  ('Men''s Barbering', 'mens_barbering', 'Men''s haircuts, beard trims, shaves, and grooming services', 'Scissors', 8)
ON CONFLICT (slug) DO NOTHING;
