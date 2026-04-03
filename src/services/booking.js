import { getCategoryTableName } from '@/lib/business';

// ── Helpers ────────────────────────────────────────────────────

/** Convert a Date to "HH:MM" using UTC hours/minutes. */
export function toHHMM(date) {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

/** Convert "HH:MM" to total minutes since midnight. */
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// ── Business Hours ─────────────────────────────────────────────

/**
 * Fetch business_hours array for a business.
 * @returns {Array} business_hours entries (may be empty).
 */
export async function getBusinessHours(supabase, businessId, businessCategory) {
  const tableName = getCategoryTableName(businessCategory);
  if (!tableName) return [];
  const { data } = await supabase
    .from(tableName)
    .select('business_hours')
    .eq('business_info_id', businessId)
    .single();
  return data?.business_hours || [];
}

/**
 * Check if a business is open on a given day and return the schedule.
 * @param {Array} businessHours - the business_hours array
 * @param {number} dayOfWeek - 0=Sunday … 6=Saturday
 * @returns {{ isOpen: boolean, openTime?: string, closeTime?: string }}
 */
export function getDaySchedule(businessHours, dayOfWeek) {
  const day = businessHours.find(h => h.dayOfWeek === dayOfWeek);
  if (!day || !day.isOpen || !day.openTime || !day.closeTime) {
    return { isOpen: false };
  }
  return { isOpen: true, openTime: day.openTime, closeTime: day.closeTime };
}

// ── Schedule Exceptions ────────────────────────────────────────

/**
 * Check schedule exceptions for a specific date. Returns:
 *  - { closed: true, message } if a full-day exception blocks the date
 *  - { closed: false, blockedRanges: [{start,end}] } otherwise
 */
export async function checkExceptions(supabase, businessId, dateStr, dayOfWeek) {
  const { data: exceptions } = await supabase
    .from('schedule_exceptions')
    .select('*')
    .eq('business_info_id', businessId);

  const blockedRanges = [];

  for (const ex of (exceptions || [])) {
    // Recurring exceptions (e.g. every Monday break)
    if (ex.recurring && ex.recurring_day === dayOfWeek) {
      if (ex.is_full_day) {
        return { closed: true, message: `Closed: ${ex.title}` };
      }
      if (ex.start_time && ex.end_time) {
        blockedRanges.push({ start: ex.start_time.substring(0, 5), end: ex.end_time.substring(0, 5) });
      }
      continue;
    }

    // Date-based exceptions
    const exDate = ex.date;
    const exEndDate = ex.end_date || exDate;
    if (dateStr >= exDate && dateStr <= exEndDate) {
      if (ex.is_full_day) {
        return { closed: true, message: `Closed: ${ex.title}` };
      }
      if (ex.start_time && ex.end_time) {
        blockedRanges.push({ start: ex.start_time.substring(0, 5), end: ex.end_time.substring(0, 5) });
      }
    }
  }

  return { closed: false, blockedRanges };
}

/**
 * Check if a specific time range conflicts with any exception.
 * Returns an error object { code, message } or null if no conflict.
 */
export function checkTimeAgainstExceptions(blockedRanges, startHHMM, endHHMM) {
  for (const range of blockedRanges) {
    if (startHHMM < range.end && endHHMM > range.start) {
      return { code: 'EXCEPTION_TIME', message: `Time conflicts with blocked range ${range.start}–${range.end}` };
    }
  }
  return null;
}

// ── Schedule Validation (combined) ──────────────────────────────

/**
 * Validate that an appointment time is within business hours and doesn't
 * conflict with schedule exceptions.
 * @returns {{ code, message } | null} error object or null if valid.
 */
export async function validateAgainstSchedule(supabase, businessId, startTimeISO, endTimeISO) {
  const startDate = new Date(startTimeISO);
  const endDate = new Date(endTimeISO);
  const dayOfWeek = startDate.getUTCDay();
  const dateStr = startDate.toISOString().split('T')[0];
  const startHHMM = toHHMM(startDate);
  const endHHMM = toHHMM(endDate);

  // Get business category
  const { data: businessInfo } = await supabase
    .from('business_info')
    .select('business_category')
    .eq('id', businessId)
    .single();

  if (!businessInfo) return { code: 'NO_BUSINESS', message: 'Business info not found' };

  // Check working hours
  const businessHours = await getBusinessHours(supabase, businessId, businessInfo.business_category);
  if (businessHours.length > 0) {
    const daySchedule = getDaySchedule(businessHours, dayOfWeek);
    if (!daySchedule.isOpen) {
      return { code: 'CLOSED_DAY', message: 'This day is not a working day' };
    }
    if (startHHMM < daySchedule.openTime || endHHMM > daySchedule.closeTime) {
      return { code: 'OUTSIDE_HOURS', message: `Appointment must be between ${daySchedule.openTime} and ${daySchedule.closeTime}` };
    }
  }

  // Check exceptions
  const exResult = await checkExceptions(supabase, businessId, dateStr, dayOfWeek);
  if (exResult.closed) {
    return { code: 'EXCEPTION_FULLDAY', message: exResult.message };
  }
  return checkTimeAgainstExceptions(exResult.blockedRanges, startHHMM, endHHMM);
}

// ── Conflict Detection ──────────────────────────────────────────

/**
 * Check for overlapping confirmed appointments at a business.
 * Only confirmed appointments block — pending ones do not.
 * @param {string|null} excludeId - appointment ID to exclude (for edits)
 * @returns {Array} conflicting appointment rows (empty = no conflicts).
 */
export async function checkBusinessConflicts(supabase, businessId, startISO, endISO, excludeId = null) {
  let query = supabase
    .from('appointments')
    .select('id')
    .eq('business_info_id', businessId)
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
 * @returns {{ conflict: boolean, status?: string, time?: string }}
 */
export async function checkUserConflicts(supabase, clerkId, businessId, startISO, endISO, excludeId = null) {
  let query = supabase
    .from('appointments')
    .select('id, status, start_time')
    .eq('clerk_id', clerkId)
    .eq('business_info_id', businessId)
    .eq('status', 'confirmed')
    .lt('start_time', endISO)
    .gt('end_time', startISO);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  if (!data || data.length === 0) return { conflict: false };

  const existing = data[0];
  const time = new Date(existing.start_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  return { conflict: true, status: existing.status, time };
}

/**
 * Check if a user has overlapping confirmed bookings at OTHER businesses.
 * @returns {{ conflict: boolean, startTime?: string, endTime?: string }}
 */
export async function checkCrossBusinessConflicts(supabase, clerkId, businessId, startISO, endISO) {
  const { data } = await supabase
    .from('appointments')
    .select('id, start_time, end_time, service, business_info_id')
    .eq('clerk_id', clerkId)
    .neq('business_info_id', businessId)
    .eq('status', 'confirmed')
    .lt('start_time', endISO)
    .gt('end_time', startISO);

  if (!data || data.length === 0) return { conflict: false };

  const c = data[0];
  return {
    conflict: true,
    startTime: new Date(c.start_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }),
    endTime: new Date(c.end_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }),
  };
}

// ── Slot Generation ─────────────────────────────────────────────

/**
 * Generate available time slots for a given date.
 * @param {object} params
 * @param {string} params.openTime - "HH:MM"
 * @param {string} params.closeTime - "HH:MM"
 * @param {number} params.duration - slot duration in minutes
 * @param {Array} params.blockedRanges - [{start,end}] from exceptions + appointments
 * @param {string} params.dateStr - "YYYY-MM-DD"
 * @param {number} [params.interval=15] - slot interval in minutes
 * @returns {Array} slots: [{start, end, available}]
 */
export function generateTimeSlots({ openTime, closeTime, duration, blockedRanges, dateStr, interval = 15 }) {
  const openMinutes = toMinutes(openTime);
  const closeMinutes = toMinutes(closeTime);

  // If today, don't show past slots (add 30-min buffer)
  const now = new Date();
  let minStartMinutes = 0;
  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  if (dateStr === todayStr) {
    minStartMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 30;
  }

  const slots = [];
  for (let start = openMinutes; start + duration <= closeMinutes; start += interval) {
    if (start < minStartMinutes) continue;

    const end = start + duration;
    const startHHMM = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    const endHHMM = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;

    const isBlocked = blockedRanges.some(block => startHHMM < block.end && endHHMM > block.start);

    slots.push({ start: startHHMM, end: endHHMM, available: !isBlocked });
  }

  return slots;
}

// ── User Bookings ──────────────────────────────────────────────

/**
 * Fetch a user's existing bookings at a specific business on a given date.
 * Used to show the user which slots they've already booked.
 */
export async function getUserBookingsForDate(supabase, clerkId, businessId, dateStr) {
  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd = `${dateStr}T23:59:59.999Z`;

  const { data } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('clerk_id', clerkId)
    .eq('business_info_id', businessId)
    .in('status', ['pending', 'confirmed'])
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd);

  return (data || []).map(apt => ({
    start: toHHMM(new Date(apt.start_time)),
    end: toHHMM(new Date(apt.end_time)),
    status: apt.status,
  }));
}

/**
 * Fetch a user's confirmed bookings at OTHER businesses on a given date.
 * Used to show cross-business conflicts.
 */
export async function getCrossBusinessBookingsForDate(supabase, clerkId, businessId, dateStr) {
  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd = `${dateStr}T23:59:59.999Z`;

  const { data } = await supabase
    .from('appointments')
    .select('start_time, end_time, status')
    .eq('clerk_id', clerkId)
    .neq('business_info_id', businessId)
    .eq('status', 'confirmed')
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd);

  return (data || []).map(apt => ({
    start: toHHMM(new Date(apt.start_time)),
    end: toHHMM(new Date(apt.end_time)),
    status: 'confirmed',
    crossBusiness: true,
  }));
}
