import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

// GET - Fetch user profile data based on role
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();

    // Get user from users table including role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('clerk_id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[user-profile] Error fetching user:', userError);
      return apiError('Failed to fetch user');
    }

    if (!user) {
      return apiError('User not found', 404);
    }

    // Fetch from user_profile table (used for all users regardless of role)
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('first_name, last_name, birthday, gender, phone, address, city, cover_image_url, profile_image_url, cover_image_position')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[user-profile] Error fetching profile:', profileError);
    }

    return apiData({
      firstName: profile?.first_name || null,
      lastName: profile?.last_name || null,
      username: user.username,
      role: user.role,
      birthday: profile?.birthday || null,
      gender: profile?.gender || null,
      phone: profile?.phone || null,
      address: profile?.address || null,
      city: profile?.city || null,
      coverImageUrl: profile?.cover_image_url || null,
      profileImageUrl: profile?.profile_image_url || null,
      coverImagePosition: profile?.cover_image_position ?? 50,
    });
  } catch (error) {
    console.error('[user-profile] Unexpected error:', error);
    return apiError('Internal server error');
  }
}

// PUT - Update user profile data based on role
export async function PUT(request) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { firstName, lastName, birthday, gender, username, coverImageUrl, coverImagePosition, city, phone } = body;

    const supabase = createServerSupabaseClient();

    // Get user from users table including role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, username')
      .eq('clerk_id', userId)
      .single();

    if (userError || !user) {
      console.error('[user-profile] Error fetching user:', userError);
      return apiError('User not found', 404);
    }

    // Update username in users table if provided and changed
    if (username !== undefined && username !== user.username) {
      const normalizedUsername = username.trim().toLowerCase();

      if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
        return apiError('Invalid username format', 400);
      }

      const { data: taken } = await supabase
        .from('users')
        .select('id')
        .eq('username', normalizedUsername)
        .maybeSingle();

      if (taken) {
        return apiError('Username already taken', 409);
      }

      const { error: usernameError } = await supabase
        .from('users')
        .update({ username: normalizedUsername })
        .eq('id', user.id);

      if (usernameError) {
        console.error('[user-profile] Error updating username:', usernameError);
        return apiError('Failed to update username');
      }
    }

    // Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profile')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Build profile update data (first_name, last_name, birthday, gender all go to user_profile)
    const profileData = {};
    if (firstName !== undefined) profileData.first_name = firstName;
    if (lastName !== undefined) profileData.last_name = lastName;
    if (birthday !== undefined) profileData.birthday = birthday || null;
    if (gender !== undefined) profileData.gender = gender || null;
    if (city !== undefined) profileData.city = city || null;
    if (phone !== undefined) profileData.phone = phone || null;
    if (coverImageUrl !== undefined) profileData.cover_image_url = coverImageUrl; // null = delete
    if (coverImagePosition !== undefined) profileData.cover_image_position = coverImagePosition;

    if (Object.keys(profileData).length > 0) {
      if (existingProfile) {
        // Update existing profile
        const { error: updateProfileError } = await supabase
          .from('user_profile')
          .update(profileData)
          .eq('user_id', user.id);

        if (updateProfileError) {
          console.error('[user-profile] Error updating profile:', updateProfileError);
          return apiError('Failed to update profile');
        }
      } else {
        // Create new profile
        const { error: createProfileError } = await supabase
          .from('user_profile')
          .insert({
            user_id: user.id,
            ...profileData,
          });

        if (createProfileError) {
          console.error('[user-profile] Error creating profile:', createProfileError);
          return apiError('Failed to create profile');
        }
      }
    }

    return apiSuccess();
  } catch (error) {
    console.error('[user-profile] Unexpected error:', error);
    return apiError('Internal server error');
  }
}
