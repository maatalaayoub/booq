import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizePhone } from '@/lib/sanitize';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';
import { parseBody } from '@/lib/validate';
import { createBookingSchema } from '@/schemas/booking';
import {
  getBusinessHours,
  getDaySchedule,
  checkExceptions,
  checkTimeAgainstExceptions,
  checkBusinessConflicts,
  checkUserConflicts,
  checkCrossBusinessConflicts,
  toHHMM,
} from '@/services/booking';

export async function POST(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Please sign in to book an appointment', 401);
    }

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(createBookingSchema, body);
    if (validationError) return validationError;

    const { businessId, date, startTime, clientName, clientPhone, notes } = validated;

    // Support both single serviceId and multiple serviceIds
    const resolvedIds = validated.serviceIds && validated.serviceIds.length > 0
      ? validated.serviceIds
      : [validated.serviceId];

    const supabase = createServerSupabaseClient();

    // Verify business exists and is active
    const { data: bizInfo } = await supabase
      .from('business_info')
      .select('id, business_category, service_mode')
      .eq('id', businessId)
      .eq('onboarding_completed', true)
      .single();

    if (!bizInfo) {
      return apiError('Business not found', 404);
    }

    if (bizInfo.service_mode === 'walkin') {
      return apiError('This business only accepts walk-in customers', 400);
    }

    // Get service details (all selected)
    const { data: services } = await supabase
      .from('business_services')
      .select('id, name, duration_minutes, price, currency, is_active')
      .in('id', resolvedIds)
      .eq('business_info_id', businessId);

    if (!services || services.length !== resolvedIds.length || services.some(s => !s.is_active)) {
      return apiError('One or more services not found or inactive', 404);
    }

    // Compute combined duration and total price
    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalPrice = services.reduce((sum, s) => sum + (s.price || 0), 0);
    const combinedName = services.map(s => s.name).join(' + ');

    // Calculate start and end times (force UTC to avoid timezone drift)
    const [startH, startM] = startTime.split(':').map(Number);
    const startDate = new Date(`${date}T${startTime}:00Z`);
    const endDate = new Date(startDate.getTime() + totalDuration * 60 * 1000);
    const endHHMM = `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`;

    // Don't allow booking in the past
    if (startDate < new Date()) {
      return apiError('Cannot book in the past', 400);
    }

    // Check business hours
    const businessHours = await getBusinessHours(supabase, businessId, bizInfo.business_category);
    const dayOfWeek = startDate.getUTCDay();
    const schedule = getDaySchedule(businessHours, dayOfWeek);
    if (!schedule.isOpen) {
      return apiError('Business is closed on this day', 400);
    }
    if (startTime < schedule.openTime || endHHMM > schedule.closeTime) {
      return apiError(`Appointment must be between ${schedule.openTime} and ${schedule.closeTime}`, 400);
    }

    // Check schedule exceptions
    const exResult = await checkExceptions(supabase, businessId, date, dayOfWeek);
    if (exResult.closed) {
      return apiError(exResult.message, 400);
    }
    const exConflict = checkTimeAgainstExceptions(exResult.blockedRanges, startTime, endHHMM);
    if (exConflict) {
      return apiError(exConflict.message, 400);
    }

    // Check for conflicting appointments (atomic check to prevent double-booking)
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const conflicts = await checkBusinessConflicts(supabase, businessId, startISO, endISO);
    if (conflicts.length > 0) {
      return apiError('This time slot is no longer available. Please choose another time.', 409);
    }

    // Check if this user already has a pending or confirmed booking that overlaps (same business)
    const userConflict = await checkUserConflicts(supabase, clerkId, businessId, startISO, endISO);
    if (userConflict.conflict) {
      return apiError(
        `You already have a ${userConflict.status} booking at ${userConflict.time}. You cannot book the same time slot twice.`,
        409
      );
    }

    // Check if this user has a confirmed booking at a DIFFERENT business that overlaps
    const crossConflict = await checkCrossBusinessConflicts(supabase, clerkId, businessId, startISO, endISO);
    if (crossConflict.conflict) {
      return apiData({
        error: `You already have a confirmed booking from ${crossConflict.startTime} to ${crossConflict.endTime} with another provider. Please choose a different time.`,
        code: 'CROSS_BUSINESS_CONFLICT',
      }, 409);
    }

    // Get the booking user's info
    const { data: bookingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    // Create the appointment
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        business_info_id: businessId,
        clerk_id: clerkId,
        client_name: sanitizeText(clientName),
        client_phone: clientPhone ? sanitizePhone(clientPhone) : null,
        service: combinedName,
        price: totalPrice,
        start_time: startISO,
        end_time: endISO,
        status: 'pending',
        notes: notes ? sanitizeText(notes) : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[book/create] Insert error:', insertError);
      return apiError('Failed to create booking');
    }

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
    console.error('[book/create POST]', err);
    return apiError('Internal server error');
  }
}
