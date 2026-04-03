// ─── BUSINESS REPOSITORY ────────────────────────────────────────────────
// Reusable data-access functions for business-related tables.

import { getCategoryTableName } from '@/lib/business';

/**
 * Get full business context: user → business_info → category table name.
 * @returns {{ userId, businessInfoId, category, professionalType } | null}
 */
export async function getBusinessContext(supabase, clerkId) {
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();

  if (!user || user.role !== 'business') return null;

  const { data: businessInfo } = await supabase
    .from('business_info')
    .select('id, business_category, professional_type')
    .eq('user_id', user.id)
    .single();

  if (!businessInfo) return null;

  return {
    userId: user.id,
    businessInfoId: businessInfo.id,
    category: businessInfo.business_category,
    professionalType: businessInfo.professional_type,
  };
}

/**
 * Find business_info by its ID.
 */
export async function findBusinessById(supabase, businessId, columns = 'id, business_category, professional_type, service_mode') {
  const { data, error } = await supabase
    .from('business_info')
    .select(columns)
    .eq('id', businessId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Fetch business hours from the category-specific table.
 */
export async function getBusinessHours(supabase, businessInfoId, businessCategory) {
  const tableName = getCategoryTableName(businessCategory);
  if (!tableName) return [];

  const { data } = await supabase
    .from(tableName)
    .select('business_hours')
    .eq('business_info_id', businessInfoId)
    .single();

  return data?.business_hours || [];
}

/**
 * Update business hours in the category-specific table.
 */
export async function updateBusinessHours(supabase, businessInfoId, category, businessHours) {
  const tableName = getCategoryTableName(category);
  if (!tableName) throw new Error('No table for this category');

  const { error } = await supabase
    .from(tableName)
    .update({ business_hours: businessHours })
    .eq('business_info_id', businessInfoId);

  if (error) throw error;
}

/**
 * Fetch category-specific data (shop_salon_info, mobile_service_info, etc.).
 */
export async function getCategoryData(supabase, businessInfoId, category, columns = '*') {
  const tableName = getCategoryTableName(category);
  if (!tableName) return null;

  const { data } = await supabase
    .from(tableName)
    .select(columns)
    .eq('business_info_id', businessInfoId)
    .single();

  return data || null;
}

/**
 * Update category-specific table data.
 */
export async function updateCategoryData(supabase, businessInfoId, category, updateData) {
  const tableName = getCategoryTableName(category);
  if (!tableName) throw new Error('No table for this category');

  const { error } = await supabase
    .from(tableName)
    .update(updateData)
    .eq('business_info_id', businessInfoId);

  if (error) throw error;
}

/**
 * Fetch public-facing business card settings.
 */
export async function getBusinessCardSettings(supabase, businessInfoId) {
  const { data, error } = await supabase
    .from('business_card_settings')
    .select('settings')
    .eq('business_info_id', businessInfoId)
    .single();

  if (error && error.code !== 'PGRST116' && error.code !== '42P01') throw error;
  return data?.settings || null;
}

/**
 * Upsert business card settings.
 */
export async function upsertBusinessCardSettings(supabase, businessInfoId, settings) {
  const { error } = await supabase
    .from('business_card_settings')
    .upsert(
      { business_info_id: businessInfoId, settings, updated_at: new Date().toISOString() },
      { onConflict: 'business_info_id' }
    );

  if (error && error.code !== '42P01') throw error;
  return { error };
}
