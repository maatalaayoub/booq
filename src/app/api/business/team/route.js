import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';
import { getBusinessContext } from '@/repositories/business';
import { findUserByAuthId } from '@/repositories/user';
import {
  findTeamMembers,
  findInvitationsByBusiness,
  createTeamInvitation,
  cancelInvitation,
  removeTeamMember,
  updateTeamMemberPermissions,
} from '@/repositories/team';
import { createNotification } from '@/repositories/notification';

/**
 * GET /api/business/team
 * Fetch team members and invitations for the current business.
 */
export async function GET(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const [members, invitations] = await Promise.all([
      findTeamMembers(supabase, ctx.businessInfoId),
      findInvitationsByBusiness(supabase, ctx.businessInfoId),
    ]);

    return apiData({ members, invitations });
  } catch (err) {
    console.error('[team GET] Error:', err);
    return apiError('Internal server error');
  }
}

/**
 * POST /api/business/team
 * Invite a worker by username.
 * Body: { username, message? }
 */
export async function POST(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const username = body.username?.trim().toLowerCase();
    const message = body.message?.trim() || null;

    if (!username) return apiError('Username is required', 400);
    if (username.length < 3 || username.length > 20) return apiError('Invalid username', 400);

    // Find the user by username
    const { data: targetUser, error: userErr } = await supabase
      .from('users')
      .select('id, username, supabase_auth_id')
      .eq('username', username)
      .single();

    if (userErr || !targetUser) return apiError('User not found', 404);

    // Can't invite yourself
    if (targetUser.id === ctx.userId) return apiError('You cannot invite yourself', 400);

    // Check if already a team member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('business_info_id', ctx.businessInfoId)
      .eq('user_id', targetUser.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingMember) return apiError('This user is already a team member', 400);

    // Check if user is already associated with ANY other business
    const { data: otherMembership } = await supabase
      .from('team_members')
      .select('id, business_info_id')
      .eq('user_id', targetUser.id)
      .eq('status', 'active')
      .maybeSingle();

    if (otherMembership) return apiError('This user is already a member of another business', 400);

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('business_info_id', ctx.businessInfoId)
      .eq('invited_user_id', targetUser.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) return apiError('An invitation is already pending for this user', 400);

    // Create invitation
    const invitation = await createTeamInvitation(supabase, {
      businessInfoId: ctx.businessInfoId,
      invitedByUserId: ctx.userId,
      invitedUserId: targetUser.id,
      invitedUsername: targetUser.username,
      message,
    });

    // Get business name for the notification
    const businessName = await getBusinessName(supabase, ctx.businessInfoId);

    // Send notification to invited user
    await createNotification(supabase, {
      userId: targetUser.id,
      type: 'team_invite',
      title: 'Team Invitation',
      message: `You've been invited to join ${businessName} as a team member.`,
      data: { invitationId: invitation.id, businessInfoId: ctx.businessInfoId, businessName },
    });

    return apiSuccess({ invitation });
  } catch (err) {
    console.error('[team POST] Error:', err);
    if (err.code === '23505') return apiError('An invitation is already pending for this user', 400);
    return apiError('Internal server error');
  }
}

/**
 * PATCH /api/business/team
 * Cancel invitation or remove team member.
 * Body: { action: 'cancel-invite', invitationId } or { action: 'remove-member', teamMemberId }
 */
export async function PATCH(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();

    if (body.action === 'cancel-invite') {
      if (!body.invitationId) return apiError('invitationId is required', 400);
      await cancelInvitation(supabase, body.invitationId, ctx.businessInfoId);
      return apiSuccess({ message: 'Invitation cancelled' });
    }

    if (body.action === 'remove-member') {
      if (!body.teamMemberId) return apiError('teamMemberId is required', 400);

      // Don't allow owner to remove themselves
      const { data: member } = await supabase
        .from('team_members')
        .select('id, user_id, role')
        .eq('id', body.teamMemberId)
        .eq('business_info_id', ctx.businessInfoId)
        .single();

      if (!member) return apiError('Team member not found', 404);
      if (member.role === 'owner') return apiError('Cannot remove the business owner', 400);

      await removeTeamMember(supabase, body.teamMemberId, ctx.businessInfoId);

      // Notify the removed member
      const businessName = await getBusinessName(supabase, ctx.businessInfoId);
      await createNotification(supabase, {
        userId: member.user_id,
        type: 'member_removed',
        title: 'Removed from Team',
        message: `You have been removed from ${businessName}.`,
        data: { businessInfoId: ctx.businessInfoId, businessName },
      });

      return apiSuccess({ message: 'Team member removed' });
    }

    if (body.action === 'update-permissions') {
      if (!body.teamMemberId) return apiError('teamMemberId is required', 400);
      if (!body.permissions || typeof body.permissions !== 'object') return apiError('permissions object is required', 400);

      // Validate permission keys
      const allowedKeys = ['canManageAppointments', 'canEditSchedule', 'canViewEarnings', 'canManageServices'];
      const permissions = {};
      for (const key of allowedKeys) {
        permissions[key] = body.permissions[key] === true;
      }

      // Don't allow modifying owner permissions
      const { data: member } = await supabase
        .from('team_members')
        .select('id, role')
        .eq('id', body.teamMemberId)
        .eq('business_info_id', ctx.businessInfoId)
        .single();

      if (!member) return apiError('Team member not found', 404);
      if (member.role === 'owner') return apiError('Cannot modify owner permissions', 400);

      const updated = await updateTeamMemberPermissions(supabase, body.teamMemberId, ctx.businessInfoId, permissions);
      return apiSuccess({ member: updated });
    }

    return apiError('Invalid action', 400);
  } catch (err) {
    console.error('[team PATCH] Error:', err);
    return apiError('Internal server error');
  }
}

// ─── HELPER ─────────────────────────────────────────────────────────────

async function getBusinessName(supabase, businessInfoId) {
  const { data } = await supabase
    .from('business_info')
    .select(`
      shop_salon_info ( business_name ),
      mobile_service_info ( business_name ),
      business_card_settings ( settings )
    `)
    .eq('id', businessInfoId)
    .single();

  if (!data) return 'a business';
  const settings = data.business_card_settings?.settings;
  if (settings?.businessName) return settings.businessName;
  return data.shop_salon_info?.business_name || data.mobile_service_info?.business_name || 'a business';
}
