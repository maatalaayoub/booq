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
      console.log('[business/onboarding] Bearer token verification failed:', err.message);
    }
  }
  return null;
}

// Helper to get category-specific data
async function getCategoryData(supabase, businessInfoId, category) {
  if (!businessInfoId || !category) return null;
  
  const tableMap = {
    'salon_owner': 'shop_salon_info',
    'mobile_service': 'mobile_service_info',
    'job_seeker': 'job_seeker_info'
  };
  
  const tableName = tableMap[category];
  if (!tableName) return null;
  
  const { data } = await supabase
    .from(tableName)
    .select('*')
    .eq('business_info_id', businessInfoId)
    .single();
  
  return data;
}

// GET - Check onboarding status and get data
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'business') {
      return NextResponse.json({ error: 'Not a business user' }, { status: 403 });
    }

    // Get business info
    const { data: businessInfo } = await supabase
      .from('business_info')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get category-specific data if business info exists
    let categoryData = null;
    let businessHours = [];
    
    if (businessInfo?.id && businessInfo?.business_category) {
      categoryData = await getCategoryData(supabase, businessInfo.id, businessInfo.business_category);
      
      // Extract business hours from category data
      if (categoryData?.business_hours) {
        businessHours = categoryData.business_hours;
      }
    }

    return NextResponse.json({
      onboardingCompleted: businessInfo?.onboarding_completed || false,
      businessInfo: businessInfo || null,
      businessCategory: businessInfo?.business_category || null,
      categoryData: categoryData || null,
      businessHours: businessHours,
    });
  } catch (error) {
    console.error('[onboarding GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save onboarding data
export async function POST(request) {
  console.log('[onboarding POST] ====== START ======');
  
  try {
    const userId = await getUserId(request);
    console.log('[onboarding POST] Clerk userId:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('[onboarding POST] Request body:', body);
    const { 
      businessCategory, 
      professionalType,
      serviceCategoryId,
      specialtyId,
      workLocation, 
      businessHours, 
      yearsOfExperience,
      hasCertificate,
      // Shop/salon & mobile service shared
      businessName,
      address,
      city,
      phone,
      latitude,
      longitude,
      // Mobile service specific
      serviceArea,
      travelRadiusKm,
      // Job seeker specific
      preferredCity,
      bio,
      completeOnboarding 
    } = body;

    // Validate required fields
    if (!professionalType) {
      console.error('[onboarding POST] Missing professionalType');
      return NextResponse.json({ error: 'Professional type is required' }, { status: 400 });
    }

    if (!businessCategory) {
      console.error('[onboarding POST] Missing businessCategory');
      return NextResponse.json({ error: 'Business category is required' }, { status: 400 });
    }

    // Validate professional type against DB if possible, fallback to known types
    if (specialtyId) {
      // If specialtyId is provided, we trust it was selected from DB
      console.log('[onboarding POST] specialtyId provided, skipping hardcoded validation');
    } else {
      const validProfessionalTypes = ['barber', 'hairdresser', 'makeup', 'nails', 'massage'];
      if (!validProfessionalTypes.includes(professionalType)) {
        console.error('[onboarding POST] Invalid professionalType:', professionalType);
        return NextResponse.json({ 
          error: 'Invalid professional type',
          validTypes: validProfessionalTypes 
        }, { status: 400 });
      }
    }

    const validBusinessCategories = ['salon_owner', 'mobile_service', 'job_seeker'];
    if (!validBusinessCategories.includes(businessCategory)) {
      console.error('[onboarding POST] Invalid businessCategory:', businessCategory);
      return NextResponse.json({ 
        error: 'Invalid business category',
        validCategories: validBusinessCategories 
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('clerk_id', userId)
      .single();

    console.log('[onboarding POST] User lookup:', { user, userError });

    if (userError || !user) {
      console.error('[onboarding POST] User not found:', userError);
      return NextResponse.json({ error: 'User not found', details: userError?.message }, { status: 404 });
    }

    if (user.role !== 'business') {
      console.error('[onboarding POST] User role is not business:', user.role);
      return NextResponse.json({ error: 'Not a business user', role: user.role }, { status: 403 });
    }

    // Step 1: Upsert business_info (base table)
    const businessInfoData = {
      user_id: user.id,
      business_category: businessCategory,
      professional_type: professionalType,
      onboarding_completed: completeOnboarding || false,
    };

    // Only include service_category_id/specialty_id if provided (columns may not exist in older DBs)
    if (serviceCategoryId) businessInfoData.service_category_id = serviceCategoryId;
    if (specialtyId) businessInfoData.specialty_id = specialtyId;

    console.log('[onboarding POST] Upserting business_info:', businessInfoData);
    
    const { data: businessInfoResult, error: infoError } = await supabase
      .from('business_info')
      .upsert(businessInfoData, { onConflict: 'user_id' })
      .select()
      .single();

    if (infoError) {
      console.error('[onboarding POST] Business info error:', infoError);
      return NextResponse.json({ 
        error: 'Failed to save business info',
        details: infoError.message,
      }, { status: 500 });
    }

    console.log('[onboarding POST] Business info saved:', businessInfoResult);
    const businessInfoId = businessInfoResult.id;

    // Step 2: Upsert category-specific data
    let categoryResult = null;
    let categoryError = null;

    if (businessCategory === 'salon_owner') {
      // Salon owner data
      const shopSalonData = {
        business_info_id: businessInfoId,
        business_name: businessName || null,
        address: address || null,
        city: city || null,
        phone: phone || null,
        latitude: latitude || null,
        longitude: longitude || null,
        work_location: workLocation || null,
        business_hours: businessHours || [],
      };

      console.log('[onboarding POST] Upserting shop_salon_info:', shopSalonData);
      
      const { data, error } = await supabase
        .from('shop_salon_info')
        .upsert(shopSalonData, { onConflict: 'business_info_id' })
        .select();
      
      categoryResult = data;
      categoryError = error;

    } else if (businessCategory === 'mobile_service') {
      // Mobile service provider data
      const mobileServiceData = {
        business_info_id: businessInfoId,
        business_name: businessName || null,
        address: address || null,
        city: city || null,
        phone: phone || null,
        latitude: latitude || null,
        longitude: longitude || null,
        service_area: serviceArea || null,
        travel_radius_km: travelRadiusKm || null,
        work_location: workLocation || null,
        business_hours: businessHours || [],
      };

      console.log('[onboarding POST] Upserting mobile_service_info:', mobileServiceData);
      
      const { data, error } = await supabase
        .from('mobile_service_info')
        .upsert(mobileServiceData, { onConflict: 'business_info_id' })
        .select();
      
      categoryResult = data;
      categoryError = error;

    } else if (businessCategory === 'job_seeker') {
      // Job seeker data
      const jobSeekerData = {
        business_info_id: businessInfoId,
        years_of_experience: yearsOfExperience || null,
        has_certificate: hasCertificate || false,
        preferred_city: preferredCity || [],
        bio: bio || null,
      };

      console.log('[onboarding POST] Upserting job_seeker_info:', jobSeekerData);
      
      const { data, error } = await supabase
        .from('job_seeker_info')
        .upsert(jobSeekerData, { onConflict: 'business_info_id' })
        .select();
      
      categoryResult = data;
      categoryError = error;
    }

    if (categoryError) {
      console.error('[onboarding POST] Category data error:', categoryError);
      return NextResponse.json({ 
        error: 'Failed to save category data',
        details: categoryError.message,
      }, { status: 500 });
    }

    console.log('[onboarding POST] Category data saved:', categoryResult);
    
    return NextResponse.json({ 
      success: true, 
      businessInfo: businessInfoResult,
      categoryData: categoryResult 
    });
  } catch (error) {
    console.error('[onboarding POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
