// ─── SERVICE REPOSITORY ─────────────────────────────────────────────────
// Reusable data-access functions for business_services.

/**
 * Fetch all services for a business.
 */
export async function findServicesByBusiness(supabase, businessInfoId) {
  const { data, error } = await supabase
    .from('business_services')
    .select('*')
    .eq('business_info_id', businessInfoId)
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === '42P01') return []; // table doesn't exist yet
    throw error;
  }
  return data || [];
}

/**
 * Find specific services by IDs scoped to a business.
 */
export async function findServicesByIds(supabase, businessInfoId, serviceIds) {
  const { data, error } = await supabase
    .from('business_services')
    .select('id, name, duration_minutes, price, currency, is_active')
    .eq('business_info_id', businessInfoId)
    .eq('is_active', true)
    .in('id', serviceIds);

  if (error) throw error;
  return data || [];
}

/**
 * Create a business service.
 */
export async function createService(supabase, serviceData) {
  const { data, error } = await supabase
    .from('business_services')
    .insert(serviceData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a service scoped to a business.
 */
export async function updateService(supabase, serviceId, businessInfoId, updateData) {
  const { data, error } = await supabase
    .from('business_services')
    .update(updateData)
    .eq('id', serviceId)
    .eq('business_info_id', businessInfoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a service scoped to a business.
 */
export async function deleteService(supabase, serviceId, businessInfoId) {
  const { error } = await supabase
    .from('business_services')
    .delete()
    .eq('id', serviceId)
    .eq('business_info_id', businessInfoId);

  if (error) throw error;
}
