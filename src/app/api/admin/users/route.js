import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

/**
 * GET /api/admin/users
 * List all users with profiles. Supports ?role=, ?status=, ?search= query params.
 */
export async function GET(request) {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase } = result;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let query = supabase
    .from('users')
    .select(`
      id, clerk_id, email, username, role, onboarding_completed, account_status, created_at,
      user_profile ( first_name, last_name, phone, city, profile_image_url )
    `)
    .order('created_at', { ascending: false });

  if (role) query = query.eq('role', role);
  if (status) query = query.eq('account_status', status);
  if (search) {
    query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
  }

  const { data: users, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: users || [] });
}

/**
 * PUT /api/admin/users
 * Update a user's account_status. Body: { userId, account_status, reason? }
 */
export async function PUT(request) {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase, adminUser } = result;

  const body = await request.json();
  const { userId, account_status, reason } = body;

  if (!userId || !['active', 'suspended', 'restricted'].includes(account_status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { error } = await supabase
    .from('users')
    .update({ account_status })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log the action
  await supabase.from('admin_actions_log').insert({
    admin_user_id: adminUser.id,
    action_type: account_status === 'suspended' ? 'suspend_user' : account_status === 'restricted' ? 'restrict_user' : 'activate_user',
    target_user_id: userId,
    details: { reason: reason || null },
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/users
 * Delete a user. Body: { userId, reason? }
 */
export async function DELETE(request) {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase, adminUser } = result;

  const body = await request.json();
  const { userId, reason } = body;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Prevent deleting other admins
  const { data: targetUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (targetUser?.role === 'admin') {
    return NextResponse.json({ error: 'Cannot delete admin accounts' }, { status: 403 });
  }

  // Log before delete (cascade will remove the user)
  await supabase.from('admin_actions_log').insert({
    admin_user_id: adminUser.id,
    action_type: 'delete_user',
    target_user_id: userId,
    details: { reason: reason || null },
  });

  const { error } = await supabase.from('users').delete().eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
