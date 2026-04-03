import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizePhone } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { getBusinessContext } from '@/lib/business';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';
import { parseBody, parseQuery } from '@/lib/validate';
import { createAppointmentSchema, updateAppointmentSchema, deleteAppointmentSchema } from '@/schemas/appointment';
import { validateAgainstSchedule, checkBusinessConflicts } from '@/services/booking';

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
    const { error: validationError, data: validated } = parseBody(createAppointmentSchema, body);
    if (validationError) return validationError;

    const cleanClientName = sanitizeText(validated.client_name);
    const cleanPhone = validated.client_phone ? sanitizePhone(validated.client_phone) : null;
    const cleanAddress = validated.client_address ? sanitizeText(validated.client_address) : null;
    const cleanService = sanitizeText(validated.service);
    const cleanNotes = validated.notes ? sanitizeText(validated.notes) : null;

    // ── Validate against working hours and schedule exceptions ──
    const scheduleError = await validateAgainstSchedule(supabase, businessInfoId, validated.start_time, validated.end_time);
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
        price: validated.price ?? null,
        start_time: validated.start_time,
        end_time: validated.end_time,
        status: validated.status,
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
    const { error: validationError, data: validated } = parseBody(updateAppointmentSchema, body);
    if (validationError) return validationError;

    const { id, ...updateFields } = validated;

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
      const conflicts = await checkBusinessConflicts(supabase, businessInfoId, sanitizedFields.start_time, sanitizedFields.end_time, id);

      if (conflicts.length > 0) {
        return apiData({
          error: 'This time overlaps with a confirmed appointment. Please choose a different time.',
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
    const { error: validationError, data: validated } = parseQuery(deleteAppointmentSchema, searchParams);
    if (validationError) return validationError;
    const { id } = validated;

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
