import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Verify the current request is from an admin.
 * Returns { supabase, adminUser } on success, or a NextResponse error.
 */
export async function requireAdmin() {
  const { userId } = await auth();

  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const supabase = createServerSupabaseClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, email, account_status')
    .eq('clerk_id', userId)
    .single();

  if (error || !user || user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase, adminUser: user };
}
