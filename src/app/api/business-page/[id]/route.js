import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function validCoord(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la === 0 && lo === 0) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { latitude: la, longitude: lo };
}

/**
 * GET /api/business-page/[id]
 * Public endpoint – fetch full business details for the public-facing page.
 * [id] is the business_info.id (UUID).
 */
export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    // Validate UUID format
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRe.test(id)) {
      return NextResponse.json({ error: 'Invalid business ID' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch business info with related data
    const { data: biz, error } = await supabase
      .from('business_info')
      .select(`
        id, business_category, professional_type, service_mode, onboarding_completed,
        shop_salon_info ( business_name, address, city, phone, latitude, longitude, business_hours ),
        mobile_service_info ( business_name, address, city, phone, latitude, longitude, business_hours, service_area, travel_radius_km, cities_covered, travel_fee ),
        business_card_settings ( settings ),
        business_services ( id, name, description, duration_minutes, price, currency, is_active )
      `)
      .eq('id', id)
      .eq('onboarding_completed', true)
      .in('business_category', ['salon_owner', 'mobile_service'])
      .single();

    if (error || !biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const settings = biz.business_card_settings?.settings || {};
    if (!settings.pageEnabled) {
      return NextResponse.json({ error: 'Business page is not active' }, { status: 404 });
    }

    const details = biz.shop_salon_info || biz.mobile_service_info || {};
    const services = (biz.business_services || []).filter(s => s.is_active);

    // Fetch schedule exceptions for availability info
    const { data: exceptions } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .eq('business_info_id', biz.id);

    const response = {
      id: biz.id,
      businessCategory: biz.business_category,
      professionalType: biz.professional_type,
      serviceMode: biz.service_mode || 'booking',
      businessName: settings.businessName || details.business_name || '',
      address: details.address || '',
      city: details.city || '',
      phone: details.phone || null,
      latitude: validCoord(details.latitude, details.longitude)?.latitude ?? null,
      longitude: validCoord(details.latitude, details.longitude)?.longitude ?? null,
      businessHours: details.business_hours || [],
      // Card display settings
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
      // Mobile service specific
      serviceArea: details.service_area || null,
      travelRadiusKm: details.travel_radius_km || null,
      citiesCovered: details.cities_covered || [],
      travelFee: details.travel_fee || 0,
      // Services
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        durationMinutes: s.duration_minutes,
        price: s.price,
        currency: s.currency || 'MAD',
      })),
      // Schedule exceptions (for availability UI)
      exceptions: (exceptions || []).map(ex => ({
        id: ex.id,
        title: ex.title,
        type: ex.type,
        date: ex.date,
        endDate: ex.end_date,
        startTime: ex.start_time,
        endTime: ex.end_time,
        isFullDay: ex.is_full_day,
        recurring: ex.recurring,
        recurringDay: ex.recurring_day,
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('[business-page GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
