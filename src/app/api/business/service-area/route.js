import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validCoord } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { getBusinessContext } from '@/lib/business';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

// GET - Fetch service area data
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, userId);

    if (!ctx) {
      return apiError('Business not found', 404);
    }
    if (ctx.category !== 'mobile_service') {
      return apiError('Service area is only available for mobile service providers', 403);
    }

    const { data: mobileInfo } = await supabase
      .from('mobile_service_info')
      .select('*')
      .eq('business_info_id', ctx.businessInfoId)
      .single();

    return apiData({
      baseLocation: mobileInfo?.address || '',
      city: mobileInfo?.city || '',
      serviceRadius: mobileInfo?.travel_radius_km || null,
      citiesCovered: mobileInfo?.cities_covered || [],
      travelFee: mobileInfo?.travel_fee != null ? Number(mobileInfo.travel_fee) : 0,
      latitude: validCoord(mobileInfo?.latitude, mobileInfo?.longitude)?.latitude ?? null,
      longitude: validCoord(mobileInfo?.latitude, mobileInfo?.longitude)?.longitude ?? null,
    });
  } catch (error) {
    console.error('[service-area GET] Error:', error);
    return apiError('Internal server error');
  }
}

// PUT - Update service area data
export async function PUT(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { baseLocation, city, serviceRadius, citiesCovered, travelFee, latitude, longitude } = body;

    // Validate serviceRadius
    if (serviceRadius != null && (typeof serviceRadius !== 'number' || serviceRadius < 0 || serviceRadius > 500)) {
      return apiError('Invalid service radius', 400);
    }

    // Validate travelFee
    if (travelFee != null && (typeof travelFee !== 'number' || travelFee < 0)) {
      return apiError('Invalid travel fee', 400);
    }

    // Validate citiesCovered
    if (citiesCovered != null && !Array.isArray(citiesCovered)) {
      return apiError('Cities covered must be an array', 400);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, userId);

    if (!ctx) {
      return apiError('Business not found', 404);
    }
    if (ctx.category !== 'mobile_service') {
      return apiError('Service area is only available for mobile service providers', 403);
    }

    const updateData = {
      address: baseLocation || null,
      city: city || null,
      travel_radius_km: serviceRadius != null ? serviceRadius : null,
      cities_covered: citiesCovered || [],
      travel_fee: travelFee != null ? travelFee : 0,
      latitude: validCoord(latitude, longitude)?.latitude ?? null,
      longitude: validCoord(latitude, longitude)?.longitude ?? null,
    };

    const { error: updateError } = await supabase
      .from('mobile_service_info')
      .update(updateData)
      .eq('business_info_id', ctx.businessInfoId);

    if (updateError) {
      console.error('[service-area PUT] Update error:', updateError);
      return apiError('Failed to update service area');
    }

    return apiSuccess();
  } catch (error) {
    console.error('[service-area PUT] Error:', error);
    return apiError('Internal server error');
  }
}
