import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData } from '@/lib/api-response';

// GET - Fetch all applications for the current job seeker
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return apiError('User not found', 404);
    }

    const { data: applications, error } = await supabase
      .from('job_applications')
      .select(`
        id, status, cover_letter, notes, created_at, updated_at,
        business_info_id,
        business_info (
          id, professional_type, business_category,
          shop_salon_info ( business_name, city ),
          mobile_service_info ( business_name, city ),
          user_profile:users!business_info_user_id_fkey ( 
            user_profile ( first_name, last_name, profile_image_url )
          )
        )
      `)
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[applications] GET error:', error);
      // Fallback: simpler query without deep joins
      const { data: simpleApps, error: simpleError } = await supabase
        .from('job_applications')
        .select('id, status, cover_letter, notes, created_at, updated_at, business_info_id')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (simpleError) {
        return apiError('Failed to fetch applications');
      }

      // Enrich with business info
      const enriched = [];
      for (const app of simpleApps || []) {
        const { data: bi } = await supabase
          .from('business_info')
          .select('id, professional_type, business_category, user_id')
          .eq('id', app.business_info_id)
          .single();

        let businessName = null;
        let businessCity = null;
        let ownerName = null;
        let ownerImage = null;

        if (bi) {
          if (bi.business_category === 'salon_owner') {
            const { data: shop } = await supabase
              .from('shop_salon_info')
              .select('business_name, city')
              .eq('business_info_id', bi.id)
              .single();
            businessName = shop?.business_name;
            businessCity = shop?.city;
          } else if (bi.business_category === 'mobile_service') {
            const { data: mobile } = await supabase
              .from('mobile_service_info')
              .select('business_name, city')
              .eq('business_info_id', bi.id)
              .single();
            businessName = mobile?.business_name;
            businessCity = mobile?.city;
          }

          const { data: profile } = await supabase
            .from('user_profile')
            .select('first_name, last_name, profile_image_url')
            .eq('user_id', bi.user_id)
            .single();

          ownerName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null;
          ownerImage = profile?.profile_image_url;
        }

        enriched.push({
          ...app,
          businessName: businessName || 'Unknown Business',
          businessCity: businessCity || null,
          professionalType: bi?.professional_type || null,
          businessCategory: bi?.business_category || null,
          ownerName,
          ownerImage,
        });
      }

      return apiData(enriched);
    }

    // Format the joined data
    const formatted = (applications || []).map((app) => {
      const bi = app.business_info;
      const shop = bi?.shop_salon_info;
      const mobile = bi?.mobile_service_info;
      const ownerProfile = bi?.user_profile?.user_profile;

      return {
        id: app.id,
        status: app.status,
        coverLetter: app.cover_letter,
        notes: app.notes,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
        businessInfoId: app.business_info_id,
        businessName: shop?.business_name || mobile?.business_name || 'Unknown Business',
        businessCity: shop?.city || mobile?.city || null,
        professionalType: bi?.professional_type || null,
        businessCategory: bi?.business_category || null,
        ownerName: ownerProfile ? `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() : null,
        ownerImage: ownerProfile?.profile_image_url || null,
      };
    });

    return apiData(formatted);
  } catch (error) {
    console.error('[applications] GET error:', error);
    return apiError('Internal server error');
  }
}

// POST - Create a new application
export async function POST(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { businessInfoId, coverLetter } = body;

    if (!businessInfoId) {
      return apiError('Business info ID is required', 400);
    }

    const supabase = createServerSupabaseClient();

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (!user) {
      return apiError('User not found', 404);
    }

    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        applicant_id: user.id,
        business_info_id: businessInfoId,
        cover_letter: coverLetter || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return apiError('You have already applied to this business', 409);
      }
      console.error('[applications] POST error:', error);
      return apiError('Failed to create application');
    }

    return apiData(data);
  } catch (error) {
    console.error('[applications] POST error:', error);
    return apiError('Internal server error');
  }
}
