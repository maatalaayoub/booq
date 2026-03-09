import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Helper: get userId either from session or Bearer token
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
      console.log('[business/details] Bearer token verification failed:', err.message);
    }
  }
  return null;
}

// Helper: get business context (business_info + category-specific table)
async function getBusinessContext(supabase, clerkUserId) {
  // Get user from users table
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

  // Get business_info
  const { data: businessInfo, error: biError } = await supabase
    .from('business_info')
    .select('*')
    .eq('user_id', userData.id)
    .single();

  if (biError || !businessInfo) {
    return { error: 'Business info not found', status: 404 };
  }

  // Get category-specific data
  const tableMap = {
    'salon_owner': 'shop_salon_info',
    'mobile_service': 'mobile_service_info',
  };
  const tableName = tableMap[businessInfo.business_category];
  
  let categoryData = null;
  if (tableName) {
    const { data } = await supabase
      .from(tableName)
      .select('*')
      .eq('business_info_id', businessInfo.id)
      .single();
    categoryData = data;
  }

  return {
    userData,
    businessInfo,
    categoryData,
    tableName,
  };
}

// GET - Fetch business details
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, userId);

    if (ctx.error) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { businessInfo, categoryData } = ctx;

    return NextResponse.json({
      businessCategory: businessInfo.business_category,
      professionalType: businessInfo.professional_type,
      businessName: categoryData?.business_name || '',
      address: categoryData?.address || '',
      city: categoryData?.city || '',
      phone: categoryData?.phone || '',
      workLocation: categoryData?.work_location || 'my_place',
      serviceArea: categoryData?.service_area || '',
      travelRadiusKm: categoryData?.travel_radius_km || '',
      latitude: categoryData?.latitude || null,
      longitude: categoryData?.longitude || null,
    });
  } catch (error) {
    console.error('[business/details GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update business details
export async function PUT(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      businessName,
      address,
      city,
      phone,
      professionalType,
      workLocation,
      serviceArea,
      travelRadiusKm,
      latitude,
      longitude,
    } = body;

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, userId);

    if (ctx.error) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status });
    }

    const { businessInfo, tableName } = ctx;

    // Update business_info (professional_type)
    if (professionalType) {
      const { error: biUpdateError } = await supabase
        .from('business_info')
        .update({ professional_type: professionalType })
        .eq('id', businessInfo.id);

      if (biUpdateError) {
        console.error('[business/details PUT] Error updating business_info:', biUpdateError);
      }
    }

    // Update category-specific table
    if (tableName) {
      const updateData = {
        business_name: businessName || null,
        address: address || null,
        city: city || null,
        phone: phone || null,
        work_location: workLocation || 'my_place',
        latitude: latitude || null,
        longitude: longitude || null,
      };

      // Add mobile-service specific fields
      if (businessInfo.business_category === 'mobile_service') {
        updateData.service_area = serviceArea || null;
        updateData.travel_radius_km = travelRadiusKm ? parseInt(travelRadiusKm) : null;
      }

      const { error: catUpdateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('business_info_id', businessInfo.id);

      if (catUpdateError) {
        console.error('[business/details PUT] Error updating category table:', catUpdateError);
        return NextResponse.json({ error: 'Failed to update business details' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[business/details PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
