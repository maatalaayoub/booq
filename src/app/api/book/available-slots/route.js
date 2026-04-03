import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData } from '@/lib/api-response';
import { parseQuery } from '@/lib/validate';
import { availableSlotsSchema } from '@/schemas/booking';
import {
  getBusinessHours,
  getDaySchedule,
  checkExceptions,
  generateTimeSlots,
  toHHMM,
  getUserBookingsForDate,
  getCrossBusinessBookingsForDate,
} from '@/services/booking';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const { error: validationError, data: validated } = parseQuery(availableSlotsSchema, searchParams);
    if (validationError) return validationError;

    const { businessId, date: dateStr, duration } = validated;

    // Don't allow booking in the past
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const requestedDate = new Date(dateStr + 'T00:00:00Z');
    if (requestedDate < today) {
      return apiData({ slots: [], message: 'Cannot book in the past' });
    }

    const supabase = createServerSupabaseClient();

    // Get business info
    const { data: bizInfo } = await supabase
      .from('business_info')
      .select('id, business_category')
      .eq('id', businessId)
      .single();

    if (!bizInfo) {
      return apiError('Business not found', 404);
    }

    // Get business hours and check day schedule
    const businessHours = await getBusinessHours(supabase, businessId, bizInfo.business_category);
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const schedule = getDaySchedule(businessHours, dayOfWeek);

    if (!schedule.isOpen) {
      return apiData({ slots: [], closed: true, message: 'Business is closed on this day' });
    }

    const { openTime, closeTime } = schedule;

    // Check schedule exceptions
    const exResult = await checkExceptions(supabase, businessId, dateStr, dayOfWeek);
    if (exResult.closed) {
      return apiData({ slots: [], closed: true, message: exResult.message });
    }

    // Get existing confirmed appointments as blocked ranges
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('business_info_id', businessId)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd);

    const appointmentRanges = (appointments || []).map(apt => ({
      start: toHHMM(new Date(apt.start_time)),
      end: toHHMM(new Date(apt.end_time)),
    }));

    const allBlocked = [...exResult.blockedRanges, ...appointmentRanges];

    console.log('[available-slots]', { duration, blockedCount: allBlocked.length, allBlocked, appointmentCount: (appointments || []).length });

    // Generate slots
    const slots = generateTimeSlots({ openTime, closeTime, duration, blockedRanges: allBlocked, dateStr });

    // Fetch user bookings if authenticated
    let userBookings = [];
    let crossBusinessBookings = [];
    try {
      const clerkId = await getUserId(request);
      if (clerkId) {
        userBookings = await getUserBookingsForDate(supabase, clerkId, businessId, dateStr);
        crossBusinessBookings = await getCrossBusinessBookingsForDate(supabase, clerkId, businessId, dateStr);
      }
    } catch (_) {
      // Auth not available — public access, skip user bookings
    }

    return apiData({ 
      slots, 
      closed: false, 
      openTime, 
      closeTime,
      date: dateStr,
      userBookings,
      crossBusinessBookings,
    });
  } catch (err) {
    console.error('[available-slots GET]', err);
    return apiError('Internal server error');
  }
}
