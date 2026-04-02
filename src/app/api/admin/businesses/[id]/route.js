import { requireAdmin } from '@/lib/admin';
import { apiError, apiData } from '@/lib/api-response';

/**
 * GET /api/admin/businesses/[id]
 * Return full detail for a single business account (by users.id).
 */
export async function GET(_request, { params }) {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase } = result;

  const { id } = await params;

  // Fetch the user + nested business data
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id, email, username, account_status, created_at,
      user_profile ( first_name, last_name, phone, city, profile_image_url ),
      business_info (
        id, business_category, professional_type, onboarding_completed,
        shop_salon_info ( business_name, address, city, phone, latitude, longitude, business_hours ),
        mobile_service_info ( business_name, address, city, phone, latitude, longitude, service_area, travel_radius_km, business_hours ),
        job_seeker_info ( years_of_experience, has_certificate, preferred_city, bio ),
        business_card_settings ( settings ),
        business_services ( id, name, description, duration_minutes, price, currency, is_active )
      )
    `)
    .eq('id', id)
    .eq('role', 'business')
    .single();

  if (error || !user) {
    return apiError('Business not found', 404);
  }

  const businessInfoId = user.business_info?.id;
  let appointments = [];
  let scheduleExceptions = [];
  let appointmentStats = { total: 0, confirmed: 0, completed: 0, cancelled: 0, pending: 0 };

  if (businessInfoId) {
    // Fetch appointments
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, client_name, client_phone, service, price, start_time, end_time, status, created_at')
      .eq('business_info_id', businessInfoId)
      .order('start_time', { ascending: false })
      .limit(50);
    appointments = appts || [];

    // Fetch schedule exceptions
    const { data: exceptions } = await supabase
      .from('schedule_exceptions')
      .select('id, title, type, date, end_date, start_time, end_time, is_full_day, recurring, recurring_day, notes')
      .eq('business_info_id', businessInfoId)
      .order('date', { ascending: false });
    scheduleExceptions = exceptions || [];

    // Appointment stats
    const statuses = ['confirmed', 'completed', 'cancelled', 'pending'];
    const counts = await Promise.all(
      statuses.map(async (s) => {
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('business_info_id', businessInfoId)
          .eq('status', s);
        return count || 0;
      })
    );
    appointmentStats = {
      total: counts.reduce((a, b) => a + b, 0),
      confirmed: counts[0],
      completed: counts[1],
      cancelled: counts[2],
      pending: counts[3],
    };
  }

  return apiData({
    business: user,
    appointments,
    scheduleExceptions,
    appointmentStats,
  });
}
