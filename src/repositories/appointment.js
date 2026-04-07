// ─── APPOINTMENT REPOSITORY ─────────────────────────────────────────────
// Reusable data-access functions for the `appointments` table.

/**
 * Fetch appointments for a business, ordered by start time.
 * When ownerUserId is provided, only returns appointments assigned to that
 * user or unassigned (assigned_worker_id is null).
 */
export async function findAppointmentsByBusiness(supabase, businessInfoId, ownerUserId) {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      assigned_worker:users!appointments_assigned_worker_id_fkey (
        id, username,
        user_profile ( first_name, last_name )
      )
    `)
    .eq('business_info_id', businessInfoId);

  if (ownerUserId) {
    query = query.or(`assigned_worker_id.is.null,assigned_worker_id.eq.${ownerUserId}`);
  }

  const { data, error } = await query.order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch appointments assigned to a specific worker within a business.
 */
export async function findAppointmentsForWorker(supabase, businessInfoId, workerUserId) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('business_info_id', businessInfoId)
    .eq('assigned_worker_id', workerUserId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch appointments for a user (via auth_id) with joined business details.
 */
export async function findAppointmentsByUser(supabase, authId) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, service, price, start_time, end_time, status, notes, client_name,
      business_info_id,
      business_info (
        id,
        business_category,
        professional_type,
        shop_salon_info ( business_name, phone, address, latitude, longitude ),
        mobile_service_info ( business_name, phone, address, latitude, longitude ),
        business_card_settings ( settings )
      )
    `)
    .eq('auth_id', authId)
    .order('start_time', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Find a single appointment by ID owned by a specific user (auth_id).
 */
export async function findUserAppointment(supabase, appointmentId, authId) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('auth_id', authId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Create a new appointment.
 */
export async function createAppointment(supabase, appointmentData) {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an appointment scoped to a business.
 */
export async function updateAppointmentByBusiness(supabase, appointmentId, businessInfoId, updateFields) {
  const { data, error } = await supabase
    .from('appointments')
    .update(updateFields)
    .eq('id', appointmentId)
    .eq('business_info_id', businessInfoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an appointment scoped to a user.
 */
export async function updateAppointmentByUser(supabase, appointmentId, authId, updateFields) {
  const { data, error } = await supabase
    .from('appointments')
    .update(updateFields)
    .eq('id', appointmentId)
    .eq('auth_id', authId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an appointment scoped to a business.
 */
export async function deleteAppointmentByBusiness(supabase, appointmentId, businessInfoId) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId)
    .eq('business_info_id', businessInfoId);

  if (error) throw error;
}

/**
 * Cancel an appointment (set status = 'cancelled') scoped to a user.
 */
export async function cancelAppointmentByUser(supabase, appointmentId, authId) {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .eq('auth_id', authId);

  if (error) throw error;
}

/**
 * Check for overlapping confirmed appointments at a business.
 * Only confirmed appointments block new bookings — pending ones do not.
 * @param {string|null} excludeId - appointment ID to exclude (for edits).
 * @returns {Array} conflicting appointment rows (empty = no conflicts).
 */
export async function findConflictingAppointments(supabase, businessInfoId, startISO, endISO, excludeId = null) {
  let query = supabase
    .from('appointments')
    .select('id')
    .eq('business_info_id', businessInfoId)
    .eq('status', 'confirmed')
    .lt('start_time', endISO)
    .gt('end_time', startISO);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Check if a user has overlapping confirmed bookings at the same business.
 */
export async function findUserConflicts(supabase, authId, businessInfoId, startISO, endISO, excludeId = null) {
  let query = supabase
    .from('appointments')
    .select('id, status, start_time')
    .eq('auth_id', authId)
    .eq('business_info_id', businessInfoId)
    .eq('status', 'confirmed')
    .lt('start_time', endISO)
    .gt('end_time', startISO);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Check if a user has overlapping confirmed bookings at OTHER businesses.
 */
export async function findCrossBusinessConflicts(supabase, authId, businessInfoId, startISO, endISO) {
  const { data } = await supabase
    .from('appointments')
    .select('id, start_time, end_time, service, business_info_id')
    .eq('auth_id', authId)
    .neq('business_info_id', businessInfoId)
    .eq('status', 'confirmed')
    .lt('start_time', endISO)
    .gt('end_time', startISO);

  return data || [];
}

/**
 * Fetch appointments in a time range for a business (e.g. for available slots).
 */
export async function findAppointmentsInRange(supabase, businessInfoId, startISO, endISO, statuses = ['confirmed']) {
  const { data } = await supabase
    .from('appointments')
    .select('start_time, end_time, assigned_worker_id, status')
    .eq('business_info_id', businessInfoId)
    .in('status', statuses)
    .gte('start_time', startISO)
    .lte('start_time', endISO);

  return data || [];
}

/**
 * Find pending appointments that overlap with a given time range.
 * Used when confirming an appointment to detect conflicts that need attention.
 * @param {string|null} excludeId - the appointment being confirmed (exclude it).
 */
export async function findOverlappingPendingAppointments(supabase, businessInfoId, startISO, endISO, excludeId = null) {
  let query = supabase
    .from('appointments')
    .select('id, client_name, service, start_time, end_time, status, auth_id')
    .eq('business_info_id', businessInfoId)
    .eq('status', 'pending')
    .lt('start_time', endISO)
    .gt('end_time', startISO);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return data || [];
}

/**
 * Fetch a user's bookings at a specific business on a given date.
 */
export async function findUserBookingsForDate(supabase, authId, businessInfoId, dateStr) {
  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd = `${dateStr}T23:59:59.999Z`;

  const { data } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('auth_id', authId)
    .eq('business_info_id', businessInfoId)
    .in('status', ['pending', 'confirmed'])
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd);

  return data || [];
}

/**
 * Fetch a user's confirmed bookings at OTHER businesses on a given date.
 */
export async function findCrossBusinessBookingsForDate(supabase, authId, businessInfoId, dateStr) {
  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd = `${dateStr}T23:59:59.999Z`;

  const { data } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('auth_id', authId)
    .neq('business_info_id', businessInfoId)
    .eq('status', 'confirmed')
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd);

  return data || [];
}
