import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth';
import { apiError, apiSuccess, apiData, validationResponse } from '@/lib/api-response';
import { parseBody } from '@/lib/validate';
import { updateProfileSchema } from '@/schemas/user-profile';
import { findUserByClerkId, isUsernameTaken, updateUser, findUserProfile, upsertUserProfile } from '@/repositories/user';

// GET - Fetch user profile data based on role
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();

    const user = await findUserByClerkId(supabase, userId, 'id, username, role');
    if (!user) {
      return apiError('User not found', 404);
    }

    const profile = await findUserProfile(supabase, user.id);

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
    const { error: validationError, data: validated } = parseBody(updateProfileSchema, body);
    if (validationError) return validationResponse(validationError);

    const { firstName, lastName, birthday, gender, username, coverImageUrl, coverImagePosition, city, phone } = validated;

    const supabase = createServerSupabaseClient();

    const user = await findUserByClerkId(supabase, userId, 'id, role, username');
    if (!user) {
      return apiError('User not found', 404);
    }

    // Update username if changed
    if (username !== undefined && username !== user.username) {
      if (await isUsernameTaken(supabase, username)) {
        return apiError('Username already taken', 409);
      }
      await updateUser(supabase, user.id, { username });
    }

    // Build profile data
    const profileData = {};
    if (firstName !== undefined) profileData.first_name = firstName;
    if (lastName !== undefined) profileData.last_name = lastName;
    if (birthday !== undefined) profileData.birthday = birthday || null;
    if (gender !== undefined) profileData.gender = gender || null;
    if (city !== undefined) profileData.city = city || null;
    if (phone !== undefined) profileData.phone = phone || null;
    if (coverImageUrl !== undefined) profileData.cover_image_url = coverImageUrl;
    if (coverImagePosition !== undefined) profileData.cover_image_position = coverImagePosition;

    if (Object.keys(profileData).length > 0) {
      await upsertUserProfile(supabase, user.id, profileData);
    }

    return apiSuccess();
  } catch (error) {
    console.error('[user-profile] Unexpected error:', error);
    return apiError('Internal server error');
  }
}
