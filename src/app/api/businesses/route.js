import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validCoord } from '@/lib/sanitize';
import { apiError, apiData } from '@/lib/api-response';

/**
 * GET /api/businesses
 * Fetch active businesses grouped by professional_type for the home page.
 * Only returns businesses with onboarding completed and public page enabled.
 * Supports optional ?category= filter (professional_type).
 */
export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Fetch businesses that completed onboarding (business_owner or mobile_service only)
    let query = supabase
      .from('business_info')
      .select(`
        id, business_category, professional_type, service_mode,
        shop_salon_info ( business_name, address, city, phone, latitude, longitude ),
        mobile_service_info ( business_name, address, city, phone, latitude, longitude ),
        business_card_settings ( settings ),
        business_services ( id, name, price, currency, is_active )
      `)
      .eq('onboarding_completed', true)
      .in('business_category', ['business_owner', 'mobile_service']);

    if (category) {
      query = query.eq('professional_type', category);
    }

    const { data: businesses, error } = await query;

    if (error) {
      return apiError(error.message);
    }

    // Filter to only businesses with public page enabled (or no settings row yet = default enabled)
    const activeBiz = (businesses || []).filter(b => {
      const settings = b.business_card_settings?.settings;
      // If no settings row exists, default to showing the business
      if (!b.business_card_settings) return true;
      return settings && settings.pageEnabled === true;
    });

    // Build response grouped by professional_type
    const grouped = {};
    for (const biz of activeBiz) {
      const type = biz.professional_type;
      if (!grouped[type]) grouped[type] = [];

      const details = biz.shop_salon_info || biz.mobile_service_info;
      const settings = biz.business_card_settings?.settings || {};
      const services = (biz.business_services || []).filter(s => s.is_active);

      grouped[type].push({
        id: biz.id,
        businessCategory: biz.business_category,
        professionalType: type,
        serviceMode: biz.service_mode || null,
        businessName: settings.businessName || details?.business_name || '',
        city: details?.city || '',
        avatarUrl: settings.avatarUrl || null,
        coverGallery: settings.coverGallery || [],
        accentColor: settings.accentColor || 'slate',
        showProfile: settings.showProfile !== false,
        showLocation: settings.showLocation !== false,
        showRating: settings.showRating !== false,
        showResponseTime: settings.showResponseTime || false,
        showServices: settings.showServices !== false,
        showPrices: settings.showPrices !== false,
        showCoverPhoto: settings.showCoverPhoto !== false,
        showCallButton: settings.showCallButton || false,
        showMessageButton: settings.showMessageButton || false,
        showBookingButton: biz.service_mode === 'walkin' ? false : settings.showBookingButton !== false,
        showGetDirections: biz.service_mode === 'walkin' ? true : (settings.showGetDirections || false),
        phone: details?.phone || null,
        latitude: validCoord(details?.latitude, details?.longitude)?.latitude ?? null,
        longitude: validCoord(details?.latitude, details?.longitude)?.longitude ?? null,
        totalServices: services.length,
        services: services.slice(0, 3).map(s => ({
          name: s.name,
          price: s.price,
          currency: s.currency,
        })),
      });
    }

    return apiData({ businesses: grouped });
  } catch (err) {
    return apiError('Internal server error');
  }
}
