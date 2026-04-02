import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/api-response';

/**
 * Verify the current request is from an admin.
 * Returns { supabase, adminUser } on success, or a NextResponse error.
 */
export async function requireAdmin() {
  const { userId } = await auth();

  if (!userId) {
    return { error: apiError('Unauthorized', 401) };
  }

  const supabase = createServerSupabaseClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, email')
    .eq('clerk_id', userId)
    .single();

  if (error || !user || user.role !== 'admin') {
    return { error: apiError('Forbidden', 403) };
  }

  return { supabase, adminUser: user };
}
