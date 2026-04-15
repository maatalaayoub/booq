import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData, validationResponse } from '@/lib/api-response';
import { parseBody } from '@/lib/validate';
import { createBookingSchema } from '@/schemas/booking';
import { createBooking, ServiceError } from '@/services/bookingService';

export async function POST(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) {
      return apiError('Please sign in to book an appointment', 401);
    }

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(createBookingSchema, body);
    if (validationError) return validationResponse(validationError);

    const { businessId, date, startTime, clientName, clientPhone, notes, assignedWorkerId, duration } = validated;
    const serviceIds = validated.serviceIds && validated.serviceIds.length > 0
      ? validated.serviceIds
      : validated.serviceId ? [validated.serviceId] : [];

    const supabase = createServerSupabaseClient();

    const appointment = await createBooking(supabase, {
      authId, businessId, serviceIds, date, startTime, clientName, clientPhone, notes, assignedWorkerId, duration,
    });

    return apiData({
      success: true,
      appointment: {
        id: appointment.id,
        service: appointment.service,
        price: appointment.price,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        status: appointment.status,
      },
    }, 201);
  } catch (err) {
    if (err instanceof ServiceError) {
      if (err.code === 'CROSS_BUSINESS_CONFLICT') {
        return apiData({ error: err.message, code: err.code }, err.status);
      }
      return apiError(err.message, err.status);
    }
    console.error('[book/create POST]', err);
    return apiError('Internal server error');
  }
}
