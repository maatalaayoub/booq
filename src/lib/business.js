// ─── BUSINESS CATEGORY → TABLE NAME MAPPING ────────────────────────────────

/**
 * Maps business_category values to their category-specific Supabase table names.
 */
export const CATEGORY_TABLE_MAP = {
  business_owner: 'shop_salon_info',
  mobile_service: 'mobile_service_info',
  job_seeker: 'job_seeker_info',
};

/**
 * Get the category-specific table name for a business category.
 * @param {string} category - business_category value
 * @returns {string | null} table name or null if unknown category
 */
export function getCategoryTableName(category) {
  return CATEGORY_TABLE_MAP[category] || null;
}

// ─── SHARED BUSINESS CONTEXT LOOKUP ─────────────────────────────────────────

/**
 * Look up the business context for a given authenticated user.
 * Returns the core fields every business route needs.
 *
 * @param {object} supabase - Supabase client
 * @param {string} authId  - Auth user ID
 * @returns {Promise<{userId, businessInfoId, category, professionalType} | null>}
 *          null when user is not found, not a business user, or has no business_info.
 */
export async function getBusinessContext(supabase, authId) {
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('supabase_auth_id', authId)
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
