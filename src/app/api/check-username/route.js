import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData } from '@/lib/api-response';

// GET /api/check-username?username=foo
export async function GET(request) {
  try {
    const userId = await getUserId(request);

    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.trim().toLowerCase();

    if (!username) {
      return apiError('Username is required', 400);
    }

    // Validate format: 3-20 chars, alphanumeric + underscores only
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return apiData({
        available: false,
        error: 'Username must be 3–20 characters and contain only letters, numbers, or underscores.',
      });
    }

    const supabase = createServerSupabaseClient();

    // Get current user's id to exclude their own username
    const { data: currentUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('clerk_id', userId)
      .single();

    // If they're checking their own current username it's "available"
    if (currentUser?.username?.toLowerCase() === username) {
      return apiData({ available: true, self: true });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    return apiData({ available: !existing });
  } catch (error) {
    console.error('[check-username] Error:', error);
    return apiError('Internal server error');
  }
}
