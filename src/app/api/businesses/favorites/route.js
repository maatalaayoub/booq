import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/businesses/favorites
 * Fetch businesses by an array of IDs (for the favorites page).
 * Body: { ids: string[] }
 */
export async function POST(request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ businesses: [] });
    }

    // Validate UUID format for each id
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validIds = ids.filter(id => uuidRe.test(id));

    if (validIds.length === 0) {
      return NextResponse.json({ businesses: [] });
    }

    const supabase = createServerSupabaseClient();

    const { data: businesses, error } = await supabase
      .from('business_info')
      .select(`
        id, business_category, professional_type, service_mode,
        shop_salon_info ( business_name, address, city, phone, latitude, longitude ),
        mobile_service_info ( business_name, address, city, phone, latitude, longitude ),
        business_card_settings ( settings ),
        business_services ( id, name, price, currency, is_active )
      `)
      .eq('onboarding_completed', true)
      .in('id', validIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = (businesses || [])
      .filter(b => {
        const settings = b.business_card_settings?.settings;
        return settings && settings.pageEnabled === true;
      })
      .map(biz => {
        const details = biz.shop_salon_info || biz.mobile_service_info;
        const settings = biz.business_card_settings?.settings || {};
        const services = (biz.business_services || []).filter(s => s.is_active);

        return {
          id: biz.id,
          businessCategory: biz.business_category,
          professionalType: biz.professional_type,
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
          latitude: details?.latitude || null,
          longitude: details?.longitude || null,
          totalServices: services.length,
          services: services.slice(0, 3).map(s => ({
            name: s.name,
            price: s.price,
            currency: s.currency,
          })),
        };
      });

    return NextResponse.json({ businesses: results });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
