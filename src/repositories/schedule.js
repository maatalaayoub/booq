// ─── SCHEDULE REPOSITORY ────────────────────────────────────────────────
// Reusable data-access functions for schedule exceptions.

/**
 * Fetch all schedule exceptions for a business.
 */
export async function findExceptionsByBusiness(supabase, businessInfoId) {
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select('*')
    .eq('business_info_id', businessInfoId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a schedule exception.
 */
export async function createException(supabase, exceptionData) {
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .insert(exceptionData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a schedule exception scoped to a business.
 */
export async function updateException(supabase, exceptionId, businessInfoId, updateData) {
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .update(updateData)
    .eq('id', exceptionId)
    .eq('business_info_id', businessInfoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a schedule exception scoped to a business.
 */
export async function deleteException(supabase, exceptionId, businessInfoId) {
  const { error } = await supabase
    .from('schedule_exceptions')
    .delete()
    .eq('id', exceptionId)
    .eq('business_info_id', businessInfoId);

  if (error) throw error;
}
