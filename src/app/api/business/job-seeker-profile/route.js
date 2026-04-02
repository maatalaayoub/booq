import { getUserId, getInternalUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

// GET - Fetch job seeker profile (combines user_profile + job_seeker_info)
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();

    // Get internal user
    const internalId = await getInternalUserId(supabase, userId);
    if (!internalId) {
      return apiError('User not found', 404);
    }

    // Fetch user_profile
    const { data: profile } = await supabase
      .from('user_profile')
      .select('first_name, last_name, phone, city, bio, profile_image_url')
      .eq('user_id', internalId)
      .single();

    // Fetch business_info to get the business_info id
    const { data: businessInfo } = await supabase
      .from('business_info')
      .select('id, professional_type')
      .eq('user_id', internalId)
      .single();

    let jobSeekerInfo = null;
    if (businessInfo) {
      const { data } = await supabase
        .from('job_seeker_info')
        .select('years_of_experience, has_certificate, preferred_city, resume_url, bio, education, skills')
        .eq('business_info_id', businessInfo.id)
        .single();
      jobSeekerInfo = data;
    }

    return apiData({
      firstName: profile?.first_name || null,
      lastName: profile?.last_name || null,
      phone: profile?.phone || null,
      city: profile?.city || null,
      profileImageUrl: profile?.profile_image_url || null,
      professionalType: businessInfo?.professional_type || null,
      yearsOfExperience: jobSeekerInfo?.years_of_experience || null,
      hasCertificate: jobSeekerInfo?.has_certificate || false,
      preferredCity: jobSeekerInfo?.preferred_city || [],
      resumeUrl: jobSeekerInfo?.resume_url || null,
      bio: jobSeekerInfo?.bio || profile?.bio || null,
      education: jobSeekerInfo?.education || null,
      skills: jobSeekerInfo?.skills || [],
    });
  } catch (error) {
    console.error('[job-seeker-profile] GET error:', error);
    return apiError('Internal server error');
  }
}

// PUT - Update job seeker profile
export async function PUT(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const {
      firstName, lastName, phone, city,
      yearsOfExperience, hasCertificate, preferredCity,
      profileImageUrl,
      bio, education, skills,
    } = body;

    const supabase = createServerSupabaseClient();

    // Get internal user
    const internalId = await getInternalUserId(supabase, userId);
    if (!internalId) {
      return apiError('User not found', 404);
    }

    // Update user_profile
    const { data: existingProfile } = await supabase
      .from('user_profile')
      .select('id')
      .eq('user_id', internalId)
      .maybeSingle();

    const profileData = {
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      city: city || null,
      profile_image_url: profileImageUrl || null,
    };

    if (existingProfile) {
      await supabase
        .from('user_profile')
        .update(profileData)
        .eq('user_id', internalId);
    } else {
      await supabase
        .from('user_profile')
        .insert({ user_id: internalId, ...profileData });
    }

    // Get business_info
    const { data: businessInfo } = await supabase
      .from('business_info')
      .select('id')
      .eq('user_id', internalId)
      .single();

    if (!businessInfo) {
      return apiError('Business info not found', 404);
    }

    // Update job_seeker_info
    const jobSeekerData = {
      years_of_experience: yearsOfExperience || null,
      has_certificate: hasCertificate || false,
      preferred_city: preferredCity || [],
      bio: bio || null,
      education: education || null,
      skills: skills || [],
    };

    const { data: existingJSI } = await supabase
      .from('job_seeker_info')
      .select('id')
      .eq('business_info_id', businessInfo.id)
      .maybeSingle();

    if (existingJSI) {
      const { error: updateError } = await supabase
        .from('job_seeker_info')
        .update(jobSeekerData)
        .eq('business_info_id', businessInfo.id);

      if (updateError) {
        console.error('[job-seeker-profile] Update error:', updateError);
        return apiError('Failed to update profile', 500, updateError.message);
      }
    } else {
      const { error: insertError } = await supabase
        .from('job_seeker_info')
        .insert({ business_info_id: businessInfo.id, ...jobSeekerData });

      if (insertError) {
        console.error('[job-seeker-profile] Insert error:', insertError);
        return apiError('Failed to create profile', 500, insertError.message);
      }
    }

    return apiSuccess();
  } catch (error) {
    console.error('[job-seeker-profile] PUT error:', error);
    return apiError('Internal server error');
  }
}
