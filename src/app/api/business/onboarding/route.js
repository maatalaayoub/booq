import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizePhone, validCoord } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { getCategoryTableName } from '@/lib/business';
import { apiError, apiSuccess, apiData, validationResponse } from '@/lib/api-response';
import { parseBody } from '@/lib/validate';
import { onboardingSchema } from '@/schemas/onboarding';

// Helper to get category-specific data
async function getCategoryData(supabase, businessInfoId, category) {
  if (!businessInfoId || !category) return null;
  
  const tableName = getCategoryTableName(category);
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
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('supabase_auth_id', userId)
      .single();

    if (userError || !user) {
      return apiError('User not found', 404);
    }

    if (user.role !== 'business') {
      return apiError('Not a business user', 403);
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
    let serviceCategorySlug = null;
    
    if (businessInfo?.id && businessInfo?.business_category) {
      categoryData = await getCategoryData(supabase, businessInfo.id, businessInfo.business_category);
      
      // Extract business hours from category data
      if (categoryData?.business_hours) {
        businessHours = categoryData.business_hours;
      }
    }

    // Fetch service category slug
    if (businessInfo?.service_category_id) {
      const { data: sc } = await supabase
        .from('service_categories')
        .select('slug')
        .eq('id', businessInfo.service_category_id)
        .single();
      serviceCategorySlug = sc?.slug || null;
    }

    return apiData({
      onboardingCompleted: businessInfo?.onboarding_completed || false,
      businessInfo: businessInfo || null,
      businessCategory: businessInfo?.business_category || null,
      serviceCategorySlug,
      categoryData: categoryData || null,
      businessHours: businessHours,
    });
  } catch (error) {
    console.error('[onboarding GET] Error:', error);
    return apiError('Internal server error');
  }
}

// POST - Save onboarding data
export async function POST(request) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(onboardingSchema, body);
    if (validationError) return validationResponse(validationError);

    const { 
      businessCategory, 
      professionalType,
      serviceCategoryId,
      specialtyId,
      serviceMode,
      workLocation, 
      businessHours, 
      yearsOfExperience,
      hasCertificate,
      businessName,
      address,
      city,
      phone,
      latitude,
      longitude,
      serviceArea,
      travelRadiusKm,
      preferredCity,
      bio,
      completeOnboarding,
      services,
    } = validated;

    const supabase = createServerSupabaseClient();

    // Get user from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('supabase_auth_id', userId)
      .single();

    if (userError || !user) {
      console.error('[onboarding POST] User not found:', userError);
      return apiError('User not found', 404, userError?.message);
    }

    if (user.role !== 'business') {
      console.error('[onboarding POST] User role is not business:', user.role);
      return apiData({ error: 'Not a business user', role: user.role }, 403);
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
    if (serviceMode) businessInfoData.service_mode = serviceMode;

    const { data: businessInfoResult, error: infoError } = await supabase
      .from('business_info')
      .upsert(businessInfoData, { onConflict: 'user_id' })
      .select()
      .single();

    if (infoError) {
      console.error('[onboarding POST] Business info error:', infoError);
      return apiError('Failed to save business info', 500, infoError.message);
    }

    const businessInfoId = businessInfoResult.id;

    // Step 2: Upsert category-specific data
    let categoryResult = null;
    let categoryError = null;

    if (businessCategory === 'business_owner') {
      // Business owner data
      const shopSalonData = {
        business_info_id: businessInfoId,
        business_name: sanitizeText(businessName) || null,
        address: sanitizeText(address) || null,
        city: sanitizeText(city) || null,
        phone: sanitizePhone(phone) || null,
        latitude: validCoord(latitude, longitude)?.latitude ?? null,
        longitude: validCoord(latitude, longitude)?.longitude ?? null,
        work_location: workLocation || null,
        business_hours: businessHours || [],
      };

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
        business_name: sanitizeText(businessName) || null,
        address: sanitizeText(address) || null,
        city: sanitizeText(city) || null,
        phone: sanitizePhone(phone) || null,
        latitude: validCoord(latitude, longitude)?.latitude ?? null,
        longitude: validCoord(latitude, longitude)?.longitude ?? null,
        service_area: sanitizeText(serviceArea) || null,
        travel_radius_km: travelRadiusKm || null,
        work_location: workLocation || null,
        business_hours: businessHours || [],
      };

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

      const { data, error } = await supabase
        .from('job_seeker_info')
        .upsert(jobSeekerData, { onConflict: 'business_info_id' })
        .select();
      
      categoryResult = data;
      categoryError = error;
    }

    if (categoryError) {
      console.error('[onboarding POST] Category data error:', categoryError);
      return apiError('Failed to save category data', 500, categoryError.message);
    }

    // Step 3: Create default business_card_settings with pageEnabled so the business shows on the home page
    if (completeOnboarding && (businessCategory === 'business_owner' || businessCategory === 'mobile_service')) {
      const defaultSettings = {
        pageEnabled: true,
        showProfile: true,
        businessName: sanitizeText(businessName) || '',
        showCoverPhoto: true,
        showServices: true,
        showPrices: true,
        showLocation: true,
        showRating: true,
        showResponseTime: true,
        showBookingButton: serviceMode === 'walkin' ? false : true,
        showGetDirections: serviceMode === 'walkin' ? true : false,
        showCallButton: false,
        showMessageButton: false,
        accentColor: 'slate',
        coverGallery: [],
        avatarUrl: null,
      };

      const { error: settingsError } = await supabase
        .from('business_card_settings')
        .upsert({
          business_info_id: businessInfoId,
          settings: defaultSettings,
        }, { onConflict: 'business_info_id' });

      if (settingsError) {
        console.error('[onboarding POST] Card settings error:', settingsError);
        // Non-blocking: settings can be configured later from the dashboard
      }
    }

    // Step 4: Insert services if provided
    if (services && services.length > 0) {
      const serviceRows = services.map(s => ({
        business_info_id: businessInfoId,
        name: sanitizeText(s.name),
        description: null,
        duration_minutes: s.duration_minutes,
        price: s.price,
        currency: s.currency || 'MAD',
        is_active: s.is_active !== false,
      }));

      const { error: servicesError } = await supabase
        .from('business_services')
        .insert(serviceRows);

      if (servicesError) {
        console.error('[onboarding POST] Services insert error:', servicesError);
        // Non-blocking: services can be added later from the dashboard
      }
    }

    return apiSuccess({ 
      businessInfo: businessInfoResult,
      categoryData: categoryResult 
    });
  } catch (error) {
    console.error('[onboarding POST] Error:', error);
    return apiError('Internal server error');
  }
}
