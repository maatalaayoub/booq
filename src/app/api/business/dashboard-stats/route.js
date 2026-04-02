import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth';
import { getBusinessContext } from '@/lib/business';
import { apiError, apiData } from '@/lib/api-response';

export async function GET(request) {
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
    const category = ctx.category;

    // ── Today's bookings ────────────────────────────────
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const { count: todayBookings } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_info_id', businessInfoId)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .neq('status', 'cancelled');

    // ── This week's revenue (completed appointments) ────
    const weekStart = new Date();
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date();
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const { data: weekAppointments } = await supabase
      .from('appointments')
      .select('price')
      .eq('business_info_id', businessInfoId)
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString())
      .in('status', ['completed', 'confirmed']);

    const weeklyRevenue = (weekAppointments || []).reduce(
      (sum, a) => sum + (parseFloat(a.price) || 0),
      0
    );

    // ── Upcoming bookings (next 30 days) ───────────────
    const nowDate = new Date();
    nowDate.setUTCHours(0, 0, 0, 0);
    const monthAhead = new Date(nowDate);
    monthAhead.setUTCDate(monthAhead.getUTCDate() + 29);
    monthAhead.setUTCHours(23, 59, 59, 999);
    const { data: upcomingBookings } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_info_id', businessInfoId)
      .gte('start_time', nowDate.toISOString())
      .lte('start_time', monthAhead.toISOString())
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });

    // ── Category-specific stats ─────────────────────────
    let categoryStats = {};

    if (category === 'mobile_service') {
      // Service area: count of cities covered
      const { data: mobileInfo } = await supabase
        .from('mobile_service_info')
        .select('cities_covered, travel_fee')
        .eq('business_info_id', businessInfoId)
        .single();

      const citiesCovered = Array.isArray(mobileInfo?.cities_covered)
        ? mobileInfo.cities_covered.length
        : 0;

      // Travel earnings: sum of travel_fee from completed/confirmed appointments
      // We approximate by counting appointments * travel_fee
      const { count: completedCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('business_info_id', businessInfoId)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .in('status', ['completed', 'confirmed']);

      const travelFee = parseFloat(mobileInfo?.travel_fee) || 0;
      const travelEarnings = (completedCount || 0) * travelFee;

      categoryStats = {
        serviceArea: citiesCovered,
        travelEarnings,
        travelFee,
      };
    } else {
      // salon_owner: total unique clients + rating
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('client_phone')
        .eq('business_info_id', businessInfoId)
        .neq('status', 'cancelled');

      const uniqueClients = new Set(
        (allAppointments || [])
          .map((a) => a.client_phone)
          .filter(Boolean)
      ).size;

      // Rating: check business_card_settings for rating data
      const { data: cardSettings } = await supabase
        .from('business_card_settings')
        .select('settings')
        .eq('business_info_id', businessInfoId)
        .single();

      const rating = cardSettings?.settings?.rating || null;

      categoryStats = {
        totalClients: uniqueClients,
        rating,
      };
    }

    return apiData({
      todayBookings: todayBookings || 0,
      weeklyRevenue,
      upcomingBookings: upcomingBookings || [],
      category,
      ...categoryStats,
    });
  } catch (err) {
    console.error('[dashboard-stats] Error:', err);
    return apiError('Internal server error');
  }
}
