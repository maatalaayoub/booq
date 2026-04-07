import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizePhone } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { getBusinessContext } from '@/lib/business';
import { apiError, apiSuccess, apiData, validationResponse } from '@/lib/api-response';
import { parseBody, parseQuery } from '@/lib/validate';
import { createAppointmentSchema, updateAppointmentSchema, deleteAppointmentSchema } from '@/schemas/appointment';
import { findAppointmentsByBusiness, deleteAppointmentByBusiness } from '@/repositories/appointment';
import { findTeamMembers } from '@/repositories/team';
import { createBusinessAppointment, updateBusinessAppointment, ServiceError } from '@/services/bookingService';

// ─── GET: Fetch all appointments for the business ───────────
export async function GET(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) {
      return apiData({ appointments: [] });
    }

    // If this business has a team, only show the owner's own appointments
    const members = await findTeamMembers(supabase, ctx.businessInfoId);
    const hasTeam = members.length > 1;
    const appointments = await findAppointmentsByBusiness(
      supabase,
      ctx.businessInfoId,
      hasTeam ? ctx.userId : null
    );
    return apiData({ appointments });
  } catch (err) {
    console.error('[appointments GET] Unexpected error:', err);
    return apiError('Internal server error');
  }
}

// ─── POST: Create a new appointment ─────────────────────────
export async function POST(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) {
      return apiError('Business not found', 404);
    }

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(createAppointmentSchema, body);
    if (validationError) return validationResponse(validationError);

    const appointment = await createBusinessAppointment(supabase, {
      businessInfoId: ctx.businessInfoId,
      appointmentData: {
        client_name: sanitizeText(validated.client_name),
        client_phone: validated.client_phone ? sanitizePhone(validated.client_phone) : null,
        client_address: validated.client_address ? sanitizeText(validated.client_address) : null,
        service: sanitizeText(validated.service),
        price: validated.price ?? null,
        start_time: validated.start_time,
        end_time: validated.end_time,
        status: validated.status,
        notes: validated.notes ? sanitizeText(validated.notes) : null,
        assigned_worker_id: validated.assigned_worker_id ?? null,
      },
    });

    return apiData({ appointment }, 201);
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiData({ error: err.message, code: err.code }, err.status);
    }
    console.error('[appointments POST] Unexpected error:', err);
    return apiError('Internal server error');
  }
}

// ─── PUT: Update an existing appointment ────────────────────
export async function PUT(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) {
      return apiError('Business not found', 404);
    }

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(updateAppointmentSchema, body);
    if (validationError) return validationResponse(validationError);

    const { id, ...updateFields } = validated;

    // Sanitize text fields
    const sanitizedFields = { ...updateFields };
    if (sanitizedFields.client_name) sanitizedFields.client_name = sanitizeText(sanitizedFields.client_name);
    if (sanitizedFields.client_phone) sanitizedFields.client_phone = sanitizePhone(sanitizedFields.client_phone);
    if (sanitizedFields.client_address) sanitizedFields.client_address = sanitizeText(sanitizedFields.client_address);
    if (sanitizedFields.service) sanitizedFields.service = sanitizeText(sanitizedFields.service);
    if (sanitizedFields.notes) sanitizedFields.notes = sanitizeText(sanitizedFields.notes);

    const { appointment, overlappingPending } = await updateBusinessAppointment(supabase, {
      businessInfoId: ctx.businessInfoId,
      appointmentId: id,
      updateFields: sanitizedFields,
    });

    const response = { appointment };
    if (overlappingPending && overlappingPending.length > 0) {
      response.overlappingPending = overlappingPending;
    }

    return apiData(response);
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiData({ error: err.message, code: err.code }, err.status);
    }
    if (err?.code === 'PGRST116') {
      return apiError('Appointment not found', 404);
    }
    console.error('[appointments PUT] Unexpected error:', err);
    return apiError('Internal server error');
  }
}

// ─── DELETE: Remove an appointment ──────────────────────────
export async function DELETE(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) {
      return apiError('Business not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const { error: validationError, data: validated } = parseQuery(deleteAppointmentSchema, searchParams);
    if (validationError) return validationResponse(validationError);

    await deleteAppointmentByBusiness(supabase, validated.id, ctx.businessInfoId);

    return apiSuccess();
  } catch (err) {
    console.error('[appointments DELETE] Unexpected error:', err);
    return apiError('Internal server error');
  }
}
