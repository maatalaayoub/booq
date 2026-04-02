import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizePhone } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { getCategoryTableName, getBusinessContext } from '@/lib/business';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

// Helper: validate appointment time against working hours and schedule exceptions
async function validateAgainstSchedule(supabase, businessInfoId, startTimeISO, endTimeISO) {
  const startDate = new Date(startTimeISO);
  const endDate = new Date(endTimeISO);
  const dayOfWeek = startDate.getUTCDay(); // 0=Sunday
  const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const startHHMM = `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`;
  const endHHMM = `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`;

  // Get business category to determine the correct table
  const { data: businessInfo } = await supabase
    .from('business_info')
    .select('business_category')
    .eq('id', businessInfoId)
    .single();

  if (!businessInfo) return { code: 'NO_BUSINESS', message: 'Business info not found' };

  const tableName = getCategoryTableName(businessInfo.business_category);

  let businessHours = [];
  if (tableName) {
    const { data: catData } = await supabase
      .from(tableName)
      .select('business_hours')
      .eq('business_info_id', businessInfoId)
      .single();
    businessHours = catData?.business_hours || [];
  }

  // 1. Check working hours for the day
  if (businessHours.length > 0) {
    const daySchedule = businessHours.find(h => h.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isOpen) {
      return { code: 'CLOSED_DAY', message: 'This day is not a working day' };
    }
    // Check if appointment is within working hours
    if (startHHMM < daySchedule.openTime || endHHMM > daySchedule.closeTime) {
      return { code: 'OUTSIDE_HOURS', message: `Appointment must be between ${daySchedule.openTime} and ${daySchedule.closeTime}` };
    }
  }

  // 2. Check schedule exceptions for that date
  const { data: exceptions } = await supabase
    .from('schedule_exceptions')
    .select('*')
    .eq('business_info_id', businessInfoId);

  if (exceptions && exceptions.length > 0) {
    for (const ex of exceptions) {
      // Check recurring exceptions (e.g. every Monday break)
      if (ex.recurring && ex.recurring_day === dayOfWeek) {
        if (ex.is_full_day) {
          return { code: 'EXCEPTION_FULLDAY', message: `This day is blocked: ${ex.title}` };
        }
        if (ex.start_time && ex.end_time) {
          const exStart = ex.start_time.substring(0, 5);
          const exEnd = ex.end_time.substring(0, 5);
          if (startHHMM < exEnd && endHHMM > exStart) {
            return { code: 'EXCEPTION_TIME', message: `Time conflicts with: ${ex.title} (${exStart}–${exEnd})` };
          }
        }
        continue;
      }

      // Check date-based exceptions
      const exDate = ex.date; // YYYY-MM-DD
      const exEndDate = ex.end_date || exDate;
      if (dateStr >= exDate && dateStr <= exEndDate) {
        if (ex.is_full_day) {
          return { code: 'EXCEPTION_FULLDAY', message: `This day is blocked: ${ex.title}` };
        }
        if (ex.start_time && ex.end_time) {
          const exStart = ex.start_time.substring(0, 5);
          const exEnd = ex.end_time.substring(0, 5);
          if (startHHMM < exEnd && endHHMM > exStart) {
            return { code: 'EXCEPTION_TIME', message: `Time conflicts with: ${ex.title} (${exStart}–${exEnd})` };
          }
        }
      }
    }
  }

  return null; // No conflicts
}

// ─── GET: Fetch all appointments for the business ───────────
export async function GET(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) {
      // No business profile yet — return empty list instead of 404
      return apiData({ appointments: [] });
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_info_id', ctx.businessInfoId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[appointments GET] Error:', error);
      return apiError('Failed to fetch appointments');
    }

    return apiData({ appointments });
  } catch (err) {
    console.error('[appointments GET] Unexpected error:', err);
    return apiError('Internal server error');
  }
}

// ─── POST: Create a new appointment ─────────────────────────
export async function POST(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) {
      return apiError('Business not found', 404);
    }
    const businessInfoId = ctx.businessInfoId;

    const body = await request.json();
    const { client_name, client_phone, client_address, service, price, start_time, end_time, status, notes } = body;

    const cleanClientName = sanitizeText(client_name);
    const cleanPhone = client_phone ? sanitizePhone(client_phone) : null;
    const cleanAddress = client_address ? sanitizeText(client_address) : null;
    const cleanService = sanitizeText(service);
    const cleanNotes = notes ? sanitizeText(notes) : null;

    if (!cleanClientName || !cleanService || !start_time || !end_time) {
      return apiError('Missing required fields: client_name, service, start_time, end_time', 400);
    }

    // ── Validate against working hours and schedule exceptions ──
    const scheduleError = await validateAgainstSchedule(supabase, businessInfoId, start_time, end_time);
    if (scheduleError) {
      return apiData({ error: scheduleError.message, code: scheduleError.code }, 400);
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        business_info_id: businessInfoId,
        client_name: cleanClientName,
        client_phone: cleanPhone,
        client_address: cleanAddress,
        service: cleanService,
        price: price ? parseFloat(price) : null,
        start_time,
        end_time,
        status: status || 'confirmed',
        notes: cleanNotes,
      })
      .select()
      .single();

    if (error) {
      console.error('[appointments POST] Supabase error:', error);
      return apiError(error.message || 'Failed to create appointment', 500, error);
    }

    return apiData({ appointment }, 201);
  } catch (err) {
    console.error('[appointments POST] Unexpected error:', err);
    return apiError('Internal server error');
  }
}

// ─── PUT: Update an existing appointment ────────────────────
export async function PUT(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) {
      return apiError('Business not found', 404);
    }
    const businessInfoId = ctx.businessInfoId;

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return apiError('Missing appointment id', 400);
    }

    // Sanitize text fields in update
    const sanitizedFields = { ...updateFields };
    if (sanitizedFields.client_name) sanitizedFields.client_name = sanitizeText(sanitizedFields.client_name);
    if (sanitizedFields.client_phone) sanitizedFields.client_phone = sanitizePhone(sanitizedFields.client_phone);
    if (sanitizedFields.client_address) sanitizedFields.client_address = sanitizeText(sanitizedFields.client_address);
    if (sanitizedFields.service) sanitizedFields.service = sanitizeText(sanitizedFields.service);
    if (sanitizedFields.notes) sanitizedFields.notes = sanitizeText(sanitizedFields.notes);

    // If time is being changed, validate against schedule and check for overlapping appointments
    if (sanitizedFields.start_time && sanitizedFields.end_time) {
      const scheduleError = await validateAgainstSchedule(supabase, businessInfoId, sanitizedFields.start_time, sanitizedFields.end_time);
      if (scheduleError) {
        return apiData({ error: scheduleError.message, code: scheduleError.code }, 400);
      }

      // Check for overlapping confirmed appointments (exclude the appointment being updated)
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, client_name, service')
        .eq('business_info_id', businessInfoId)
        .eq('status', 'confirmed')
        .neq('id', id)
        .lt('start_time', sanitizedFields.end_time)
        .gt('end_time', sanitizedFields.start_time);

      if (conflicts && conflicts.length > 0) {
        const conflictTime = new Date(conflicts[0].start_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
        return apiData({
          error: `This time overlaps with a confirmed appointment at ${conflictTime} (${conflicts[0].client_name} - ${conflicts[0].service}). Please choose a different time.`,
          code: 'APPOINTMENT_CONFLICT',
        }, 409);
      }
    }

    // Only allow updating own appointments
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(sanitizedFields)
      .eq('id', id)
      .eq('business_info_id', businessInfoId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiError('Appointment not found', 404);
      }
      console.error('[appointments PUT] Error:', error);
      return apiError('Failed to update appointment');
    }

    return apiData({ appointment });
  } catch (err) {
    console.error('[appointments PUT] Unexpected error:', err);
    return apiError('Internal server error');
  }
}

// ─── DELETE: Remove an appointment ──────────────────────────
export async function DELETE(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) {
      return apiError('Business not found', 404);
    }
    const businessInfoId = ctx.businessInfoId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Missing appointment id', 400);
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('business_info_id', businessInfoId);

    if (error) {
      console.error('[appointments DELETE] Error:', error);
      return apiError('Failed to delete appointment');
    }

    return apiSuccess();
  } catch (err) {
    console.error('[appointments DELETE] Unexpected error:', err);
    return apiError('Internal server error');
  }
}
