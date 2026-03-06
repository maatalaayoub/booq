import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

/**
 * GET /api/admin/businesses
 * List all business accounts with their info, public page settings, and services.
 * Supports ?search= and ?category= filters.
 */
export async function GET(request) {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase } = result;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const category = searchParams.get('category');

  // Get all business users joined with business_info
  let query = supabase
    .from('users')
    .select(`
      id, email, username, account_status, created_at,
      user_profile ( first_name, last_name, phone, city, profile_image_url ),
      business_info (
        id, business_category, professional_type, onboarding_completed,
        shop_salon_info ( business_name, address, city, phone ),
        mobile_service_info ( business_name, address, city, phone ),
        business_card_settings ( settings )
      )
    `)
    .eq('role', 'business')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
  }

  const { data: businesses, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Post-filter by category if needed (nested filtering not supported)
  let filtered = businesses || [];
  if (category) {
    filtered = filtered.filter(b => b.business_info?.business_category === category);
  }

  return NextResponse.json({ businesses: filtered });
}
