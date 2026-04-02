import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData } from '@/lib/api-response';

// GET - Fetch public user profile by username or ID
export async function GET(request, { params }) {
  try {
    const { username } = await params;
    
    if (!username) {
      return apiError('Username is required', 400);
    }

    const supabase = createServerSupabaseClient();

    // Try to find user by username first, then by ID
    let user = null;
    let userError = null;

    // First try by username
    const { data: userByUsername, error: usernameError } = await supabase
      .from('users')
      .select('id, username, role, created_at')
      .eq('username', username)
      .single();

    if (userByUsername) {
      user = userByUsername;
    } else {
      // Try by ID
      const { data: userById, error: idError } = await supabase
        .from('users')
        .select('id, username, role, created_at')
        .eq('id', username)
        .single();
      
      user = userById;
      userError = idError;
    }

    if (!user) {
      return apiError('User not found', 404);
    }

    // Fetch user profile data
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('first_name, last_name, city, cover_image_url, profile_image_url, cover_image_position')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[user-profile/username] Error fetching profile:', profileError);
    }

    // If user is a business, get business info too
    let businessInfo = null;
    if (user.role === 'business') {
      const { data: business } = await supabase
        .from('business_profiles')
        .select('business_name, specialty, address, city')
        .eq('user_id', user.id)
        .single();
      
      businessInfo = business;
    }

    return apiData({
      id: user.id,
      username: user.username,
      role: user.role,
      joinedAt: user.created_at,
      firstName: profile?.first_name || null,
      lastName: profile?.last_name || null,
      city: profile?.city || null,
      coverImageUrl: profile?.cover_image_url || null,
      profileImageUrl: profile?.profile_image_url || null,
      coverImagePosition: profile?.cover_image_position ?? 50,
      business: businessInfo,
    });
  } catch (error) {
    console.error('[user-profile/username] Unexpected error:', error);
    return apiError('Internal server error');
  }
}
