import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET - Fetch job seeker profile (combines user_profile + job_seeker_info)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Get internal user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user_profile
    const { data: profile } = await supabase
      .from('user_profile')
      .select('first_name, last_name, phone, city, bio, profile_image_url')
      .eq('user_id', user.id)
      .single();

    // Fetch business_info to get the business_info id
    const { data: businessInfo } = await supabase
      .from('business_info')
      .select('id, professional_type')
      .eq('user_id', user.id)
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

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update job seeker profile
export async function PUT(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user_profile
    const { data: existingProfile } = await supabase
      .from('user_profile')
      .select('id')
      .eq('user_id', user.id)
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
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('user_profile')
        .insert({ user_id: user.id, ...profileData });
    }

    // Get business_info
    const { data: businessInfo } = await supabase
      .from('business_info')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!businessInfo) {
      return NextResponse.json({ error: 'Business info not found' }, { status: 404 });
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
        return NextResponse.json({ error: 'Failed to update profile', details: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from('job_seeker_info')
        .insert({ business_info_id: businessInfo.id, ...jobSeekerData });

      if (insertError) {
        console.error('[job-seeker-profile] Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create profile', details: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[job-seeker-profile] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
