import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';
import { findUserByAuthId } from '@/repositories/user';
import {
  findPendingInvitationsForUser,
  respondToInvitation,
  createTeamMember,
} from '@/repositories/team';
import { createNotification } from '@/repositories/notification';

/**
 * GET /api/business/team/invitations
 * Fetch pending invitations for the current user.
 */
export async function GET(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const user = await findUserByAuthId(supabase, authId, 'id, username');
    if (!user) return apiError('User not found', 404);

    const invitations = await findPendingInvitationsForUser(supabase, user.id);

    const results = invitations.map((inv) => {
      const biz = inv.business_info;
      const settings = biz?.business_card_settings?.settings || {};
      const businessName =
        settings.businessName ||
        biz?.shop_salon_info?.business_name ||
        biz?.mobile_service_info?.business_name ||
        'Unknown Business';

      return {
        id: inv.id,
        businessInfoId: inv.business_info_id,
        businessName,
        businessAvatar: settings.avatarUrl || null,
        businessCategory: biz?.business_category,
        professionalType: biz?.professional_type,
        invitedBy: inv.users?.username || 'Unknown',
        message: inv.message,
        createdAt: inv.created_at,
      };
    });

    return apiData({ invitations: results });
  } catch (err) {
    console.error('[team invitations GET] Error:', err);
    return apiError('Internal server error');
  }
}

/**
 * PATCH /api/business/team/invitations
 * Accept or decline an invitation.
 * Body: { invitationId, action: 'accept' | 'decline' }
 */
export async function PATCH(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const user = await findUserByAuthId(supabase, authId, 'id, username');
    if (!user) return apiError('User not found', 404);

    const body = await request.json();
    const { invitationId, action } = body;

    if (!invitationId) return apiError('invitationId is required', 400);
    if (!['accept', 'decline'].includes(action)) return apiError('action must be accept or decline', 400);

    const status = action === 'accept' ? 'accepted' : 'declined';
    const invitation = await respondToInvitation(supabase, invitationId, user.id, status);

    if (!invitation) return apiError('Invitation not found or already responded', 404);

    if (action === 'accept') {
      // Check if user is already a member of any business
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingMembership) {
        return apiError('You are already a member of another business', 400);
      }

      // Create team member
      await createTeamMember(supabase, {
        businessInfoId: invitation.business_info_id,
        userId: user.id,
        role: 'worker',
        invitedBy: invitation.invited_by_user_id,
      });

      // Notify business owner
      await createNotification(supabase, {
        userId: invitation.invited_by_user_id,
        type: 'invite_accepted',
        title: 'Invitation Accepted',
        message: `${user.username} has accepted your team invitation.`,
        data: { userId: user.id, businessInfoId: invitation.business_info_id, username: user.username },
      });
    } else {
      // Notify business owner of decline
      await createNotification(supabase, {
        userId: invitation.invited_by_user_id,
        type: 'invite_declined',
        title: 'Invitation Declined',
        message: `${user.username} has declined your team invitation.`,
        data: { userId: user.id, businessInfoId: invitation.business_info_id, username: user.username },
      });
    }

    return apiSuccess({ message: `Invitation ${status}`, invitation });
  } catch (err) {
    console.error('[team invitations PATCH] Error:', err);
    return apiError('Internal server error');
  }
}
