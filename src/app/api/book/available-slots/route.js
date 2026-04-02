import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCategoryTableName } from '@/lib/business';
import { apiError, apiData } from '@/lib/api-response';

/**
 * GET /api/book/available-slots?businessId=UUID&date=YYYY-MM-DD&duration=30
 * Public endpoint – returns available time slots for a business on a given date.
 * Checks working hours, schedule exceptions, and existing appointments.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const dateStr = searchParams.get('date');
    const duration = parseInt(searchParams.get('duration') || '30', 10);

    // Validate inputs
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!businessId || !uuidRe.test(businessId)) {
      return apiError('Invalid businessId', 400);
    }
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return apiError('Invalid date format (YYYY-MM-DD)', 400);
    }
    if (isNaN(duration) || duration < 5 || duration > 480) {
      return apiError('Invalid duration', 400);
    }

    // Don't allow booking in the past
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const requestedDate = new Date(dateStr + 'T00:00:00Z');
    if (requestedDate < today) {
      return apiData({ slots: [], message: 'Cannot book in the past' });
    }

    const supabase = createServerSupabaseClient();

    // Get business info to determine the category table
    const { data: bizInfo } = await supabase
      .from('business_info')
      .select('id, business_category')
      .eq('id', businessId)
      .single();

    if (!bizInfo) {
      return apiError('Business not found', 404);
    }

    // Get business hours
    const tableName = getCategoryTableName(bizInfo.business_category);
    let businessHours = [];

    if (tableName) {
      const { data } = await supabase
        .from(tableName)
        .select('business_hours')
        .eq('business_info_id', businessId)
        .single();
      businessHours = data?.business_hours || [];
    }

    // Get the day of week for the requested date (0 = Sunday)
    // Parse from dateStr directly to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();

    // Check if business is open this day
    const daySchedule = businessHours.find(h => h.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isOpen || !daySchedule.openTime || !daySchedule.closeTime) {
      return apiData({ slots: [], closed: true, message: 'Business is closed on this day' });
    }

    const openTime = daySchedule.openTime; // "09:00"
    const closeTime = daySchedule.closeTime; // "19:00"

    // Get schedule exceptions for this date
    const { data: exceptions } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .eq('business_info_id', businessId);

    // Build blocked time ranges
    const blockedRanges = [];

    for (const ex of (exceptions || [])) {
      // Recurring exception (e.g. every Monday break)
      if (ex.recurring && ex.recurring_day === dayOfWeek) {
        if (ex.is_full_day) {
          return apiData({ slots: [], closed: true, message: `Closed: ${ex.title}` });
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
          return apiData({ slots: [], closed: true, message: `Closed: ${ex.title}` });
        }
        if (ex.start_time && ex.end_time) {
          blockedRanges.push({ start: ex.start_time.substring(0, 5), end: ex.end_time.substring(0, 5) });
        }
      }
    }

    // Get existing confirmed appointments for this date (only confirmed blocks slots for other users)
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    const { data: appointments } = await supabase
      .from('appointments')
      .select('start_time, end_time, status')
      .eq('business_info_id', businessId)
      .eq('status', 'confirmed')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd);

    // Convert appointments to blocked HH:MM ranges (use UTC to match stored times)
    const appointmentRanges = (appointments || []).map(apt => {
      const s = new Date(apt.start_time);
      const e = new Date(apt.end_time);
      return {
        start: `${String(s.getUTCHours()).padStart(2, '0')}:${String(s.getUTCMinutes()).padStart(2, '0')}`,
        end: `${String(e.getUTCHours()).padStart(2, '0')}:${String(e.getUTCMinutes()).padStart(2, '0')}`,
      };
    });

    const allBlocked = [...blockedRanges, ...appointmentRanges];

    // Generate 15-min interval slots between open and close
    const SLOT_INTERVAL = 15; // generate a slot every 15 minutes
    const slots = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    // If today, don't show past slots (add 30-min buffer)
    const now = new Date();
    let minStartMinutes = 0;
    if (dateStr === `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`) {
      minStartMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 30;
    }

    for (let start = openMinutes; start + duration <= closeMinutes; start += SLOT_INTERVAL) {
      if (start < minStartMinutes) continue;

      const end = start + duration;
      const startHHMM = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
      const endHHMM = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;

      // Check if this slot overlaps with any blocked range
      const isBlocked = allBlocked.some(block => startHHMM < block.end && endHHMM > block.start);

      slots.push({
        start: startHHMM,
        end: endHHMM,
        available: !isBlocked,
      });
    }

    // Check if the user is authenticated and fetch their existing bookings
    let userBookings = [];
    let crossBusinessBookings = [];
    try {
      const clerkId = await getUserId(request);
      if (clerkId) {
        const { data: myBookings } = await supabase
          .from('appointments')
          .select('start_time, end_time, status')
          .eq('clerk_id', clerkId)
          .eq('business_info_id', businessId)
          .in('status', ['pending', 'confirmed'])
          .gte('start_time', dayStart)
          .lte('start_time', dayEnd);

        userBookings = (myBookings || []).map(apt => {
          const s = new Date(apt.start_time);
          const e = new Date(apt.end_time);
          return {
            start: `${String(s.getUTCHours()).padStart(2, '0')}:${String(s.getUTCMinutes()).padStart(2, '0')}`,
            end: `${String(e.getUTCHours()).padStart(2, '0')}:${String(e.getUTCMinutes()).padStart(2, '0')}`,
            status: apt.status,
          };
        });

        // Fetch confirmed bookings at OTHER businesses (cross-business conflicts)
        const { data: crossBookings } = await supabase
          .from('appointments')
          .select('start_time, end_time, status')
          .eq('clerk_id', clerkId)
          .neq('business_info_id', businessId)
          .eq('status', 'confirmed')
          .gte('start_time', dayStart)
          .lte('start_time', dayEnd);

        crossBusinessBookings = (crossBookings || []).map(apt => {
          const s = new Date(apt.start_time);
          const e = new Date(apt.end_time);
          return {
            start: `${String(s.getUTCHours()).padStart(2, '0')}:${String(s.getUTCMinutes()).padStart(2, '0')}`,
            end: `${String(e.getUTCHours()).padStart(2, '0')}:${String(e.getUTCMinutes()).padStart(2, '0')}`,
            status: 'confirmed',
            crossBusiness: true,
          };
        });
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
