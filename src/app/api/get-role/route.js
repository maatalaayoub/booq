import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth';
import { apiData } from '@/lib/api-response';

export async function GET(request) {
  try {
    const userId = await getUserId(request);
    
    if (!userId) {
      return apiData(
        { error: 'Unauthorized', role: null },
        401
      );
    }

    // Initialize Supabase client
    let supabase;
    try {
      supabase = createServerSupabaseClient();
    } catch (err) {
      console.error('[get-role] Failed to create Supabase client:', err.message);
      return apiData(
        { error: 'Database configuration error', role: null },
        500
      );
    }

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, role, email, onboarding_completed, created_at')
      .eq('clerk_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No user found - no role assigned yet
        return apiData(
          { role: null, hasRole: false, onboardingCompleted: false }
        );
      }
      console.error('Error fetching user role:', error);
      return apiData(
        { error: 'Database error', role: null },
        500
      );
    }

    return apiData(
      { 
        role: user.role, 
        hasRole: true,
        userId: user.id,
        email: user.email,
        onboardingCompleted: user.onboarding_completed || false
      }
    );
  } catch (error) {
    console.error('Error getting role:', error);
    return apiData(
      { error: 'Internal server error', role: null },
      500
    );
  }
}
