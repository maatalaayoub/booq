import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

// POST - Mark onboarding as completed
export async function POST(request) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();

    // Update onboarding_completed to true
    const { data, error } = await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('supabase_auth_id', userId)
      .select('id, role, onboarding_completed')
      .single();

    if (error) {
      console.error('[complete-onboarding] Error:', error);
      return apiError('Failed to update onboarding status', 500, error.message);
    }

    return apiSuccess({ user: data });
  } catch (error) {
    console.error('[complete-onboarding] Unexpected error:', error);
    return apiError('Internal server error', 500, error.message);
  }
}

// GET - Check onboarding status
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('supabase_auth_id', userId)
      .single();

    if (error) {
      console.error('[complete-onboarding] Error:', error);
      return apiError('Failed to get onboarding status', 500, error.message);
    }

    return apiData({ 
      onboarding_completed: data?.onboarding_completed || false 
    });
  } catch (error) {
    console.error('[complete-onboarding] Unexpected error:', error);
    return apiError('Internal server error', 500, error.message);
  }
}
