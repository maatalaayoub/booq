import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText, sanitizePhone, validCoord } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { getCategoryTableName, getBusinessContext } from '@/lib/business';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

// Extend base context with full business_info, category data, and specialty names
async function getDetailedBusinessContext(supabase, authUserId) {
  const base = await getBusinessContext(supabase, authUserId);
  if (!base) return { error: 'Business not found', status: 404 };

  // Fetch full business_info row
  const { data: businessInfo } = await supabase
    .from('business_info')
    .select('*')
    .eq('id', base.businessInfoId)
    .single();

  // Get category-specific data
  const tableName = getCategoryTableName(base.category);
  let categoryData = null;
  if (tableName) {
    const { data } = await supabase
      .from(tableName)
      .select('*')
      .eq('business_info_id', base.businessInfoId)
      .single();
    categoryData = data;
  }

  // Get specialty and service category names
  let specialtyName = null;
  let serviceCategoryName = null;
  if (businessInfo?.specialty_id) {
    const { data: specialty } = await supabase
      .from('specialties')
      .select('name, service_category_id, service_categories(name)')
      .eq('id', businessInfo.specialty_id)
      .single();
    if (specialty) {
      specialtyName = specialty.name;
      serviceCategoryName = specialty.service_categories?.name || null;
    }
  }

  return {
    ...base,
    businessInfo,
    categoryData,
    tableName,
    specialtyName,
    serviceCategoryName,
  };
}

// GET - Fetch business details
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();
    const ctx = await getDetailedBusinessContext(supabase, userId);

    if (ctx.error) {
      return apiError(ctx.error, ctx.status);
    }

    const { businessInfo, categoryData, specialtyName, serviceCategoryName } = ctx;

    return apiData({
      businessCategory: businessInfo.business_category,
      professionalType: businessInfo.professional_type,
      specialtyName: specialtyName || '',
      serviceCategoryName: serviceCategoryName || '',
      businessName: categoryData?.business_name || '',
      address: categoryData?.address || '',
      city: categoryData?.city || '',
      phone: categoryData?.phone || '',
      workLocation: categoryData?.work_location || 'my_place',
      serviceArea: categoryData?.service_area || '',
      travelRadiusKm: categoryData?.travel_radius_km || '',
      latitude: validCoord(categoryData?.latitude, categoryData?.longitude)?.latitude ?? null,
      longitude: validCoord(categoryData?.latitude, categoryData?.longitude)?.longitude ?? null,
    });
  } catch (error) {
    console.error('[business/details GET] Error:', error);
    return apiError('Internal server error');
  }
}

// PUT - Update business details
export async function PUT(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
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

    // Sanitize all text inputs
    const cleanBusinessName = sanitizeText(businessName);
    const cleanAddress = sanitizeText(address);
    const cleanCity = sanitizeText(city);
    const cleanPhone = sanitizePhone(phone);
    const cleanServiceArea = sanitizeText(serviceArea);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, userId);

    if (!ctx) {
      return apiError('Business not found', 404);
    }

    const tableName = getCategoryTableName(ctx.category);

    // Update business_info (professional_type)
    if (professionalType) {
      const { error: biUpdateError } = await supabase
        .from('business_info')
        .update({ professional_type: professionalType })
        .eq('id', ctx.businessInfoId);

      if (biUpdateError) {
        console.error('[business/details PUT] Error updating business_info:', biUpdateError);
      }
    }

    // Update category-specific table
    if (tableName) {
      const updateData = {
        business_name: cleanBusinessName || null,
        address: cleanAddress || null,
        city: cleanCity || null,
        phone: cleanPhone || null,
        work_location: workLocation || 'my_place',
        latitude: validCoord(latitude, longitude)?.latitude ?? null,
        longitude: validCoord(latitude, longitude)?.longitude ?? null,
      };

      // Add mobile-service specific fields
      if (ctx.category === 'mobile_service') {
        updateData.service_area = cleanServiceArea || null;
        updateData.travel_radius_km = travelRadiusKm ? parseInt(travelRadiusKm) : null;
      }

      const { error: catUpdateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('business_info_id', ctx.businessInfoId);

      if (catUpdateError) {
        console.error('[business/details PUT] Error updating category table:', catUpdateError);
        return apiError('Failed to update business details');
      }
    }

    return apiSuccess();
  } catch (error) {
    console.error('[business/details PUT] Error:', error);
    return apiError('Internal server error');
  }
}
