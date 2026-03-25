import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function validCoord(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la === 0 && lo === 0) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { latitude: la, longitude: lo };
}

async function getUserId(request) {
  const { userId } = await auth();
  if (userId) return userId;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { verifyToken } = await import('@clerk/backend');
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      if (payload?.sub) return payload.sub;
    } catch (err) {
      console.log('[business/service-area] Bearer token verification failed:', err.message);
    }
  }
  return null;
}

async function getMobileServiceContext(supabase, clerkUserId) {
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkUserId)
    .single();

  if (userError || !userData) {
    return { error: 'User not found', status: 404 };
  }
  if (userData.role !== 'business') {
    return { error: 'Not a business user', status: 403 };
  }

  const { data: businessInfo, error: biError } = await supabase
    .from('business_info')
    .select('id, business_category')
    .eq('user_id', userData.id)
    .single();

  if (biError || !businessInfo) {
    return { error: 'Business info not found', status: 404 };
  }
  if (businessInfo.business_category !== 'mobile_service') {
    return { error: 'Service area is only available for mobile service providers', status: 403 };
  }

  const { data: mobileInfo } = await supabase
    .from('mobile_service_info')
    .select('*')
    .eq('business_info_id', businessInfo.id)
    .single();

  return { userData, businessInfo, mobileInfo };
}

// GET - Fetch service area data
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getMobileServiceContext(supabase, userId);

    if (ctx.error) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { mobileInfo } = ctx;

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update service area data
export async function PUT(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { baseLocation, city, serviceRadius, citiesCovered, travelFee, latitude, longitude } = body;

    // Validate serviceRadius
    if (serviceRadius != null && (typeof serviceRadius !== 'number' || serviceRadius < 0 || serviceRadius > 500)) {
      return NextResponse.json({ error: 'Invalid service radius' }, { status: 400 });
    }

    // Validate travelFee
    if (travelFee != null && (typeof travelFee !== 'number' || travelFee < 0)) {
      return NextResponse.json({ error: 'Invalid travel fee' }, { status: 400 });
    }

    // Validate citiesCovered
    if (citiesCovered != null && !Array.isArray(citiesCovered)) {
      return NextResponse.json({ error: 'Cities covered must be an array' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getMobileServiceContext(supabase, userId);

    if (ctx.error) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { businessInfo } = ctx;

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
      .eq('business_info_id', businessInfo.id);

    if (updateError) {
      console.error('[service-area PUT] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update service area' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[service-area PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
