import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, apiData, validationResponse } from '@/lib/api-response';
import { parseBody, parseQuery } from '@/lib/validate';
import { editBookingSchema, cancelBookingSchema } from '@/schemas/booking';
import { findAppointmentsByUser } from '@/repositories/appointment';
import { editBooking, cancelBooking, ServiceError } from '@/services/bookingService';

/**
 * GET /api/bookings
 * Fetch all appointments for the currently signed-in user.
 */
export async function GET(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const appointments = await findAppointmentsByUser(supabase, clerkId);

    const results = appointments.map(apt => {
      const biz = apt.business_info;
      const details = biz?.shop_salon_info || biz?.mobile_service_info;
      const settings = biz?.business_card_settings?.settings || {};

      return {
        id: apt.id,
        service: apt.service,
        price: apt.price,
        startTime: apt.start_time,
        endTime: apt.end_time,
        status: apt.status,
        notes: apt.notes,
        clientName: apt.client_name,
        businessId: apt.business_info_id,
        businessName: settings.businessName || details?.business_name || '',
        businessPhone: details?.phone || null,
        businessAddress: details?.address || null,
        latitude: details?.latitude || null,
        longitude: details?.longitude || null,
        avatarUrl: settings.avatarUrl || null,
        accentColor: settings.accentColor || 'slate',
        professionalType: biz?.professional_type || '',
      };
    });

    return apiData({ bookings: results });
  } catch (err) {
    return apiError('Internal server error');
  }
}

/**
 * PATCH /api/bookings
 * Edit an appointment (user-side).
 */
export async function PATCH(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(editBookingSchema, body);
    if (validationError) return validationResponse(validationError);

    const supabase = createServerSupabaseClient();
    const updated = await editBooking(supabase, { clerkId, ...validated });

    return apiSuccess({ appointment: updated });
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiError(err.message, err.status);
    }
    console.error('[bookings PATCH] Error:', err);
    return apiError('Internal server error');
  }
}

/**
 * DELETE /api/bookings?id=UUID
 * Cancel an appointment (user-side).
 */
export async function DELETE(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const { error: validationError, data: validated } = parseQuery(cancelBookingSchema, searchParams);
    if (validationError) return validationResponse(validationError);

    const supabase = createServerSupabaseClient();
    await cancelBooking(supabase, { clerkId, appointmentId: validated.id });

    return apiSuccess();
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiError(err.message, err.status);
    }
    console.error('[bookings DELETE] Error:', err);
    return apiError('Internal server error');
  }
}
