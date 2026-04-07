// ─── TEAM REPOSITORY ────────────────────────────────────────────────────
// Reusable data-access functions for `team_members` and `team_invitations`.

// ─── TEAM MEMBERS ───────────────────────────────────────────────────────

/**
 * Find all active team members for a business.
 */
export async function findTeamMembers(supabase, businessInfoId) {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      id, user_id, role, permissions, status, joined_at,
      users:users!team_members_user_id_fkey (
        id, supabase_auth_id, username, email,
        user_profile ( first_name, last_name, phone, profile_image_url )
      )
    `)
    .eq('business_info_id', businessInfoId)
    .eq('status', 'active')
    .order('role', { ascending: true })
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Find a specific team member by user_id and business.
 */
export async function findTeamMember(supabase, businessInfoId, userId) {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('business_info_id', businessInfoId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Find all businesses a user is a team member of (for worker dashboard).
 */
export async function findUserTeamMemberships(supabase, userId) {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      id, role, permissions, status, joined_at,
      business_info_id,
      business_info (
        id, business_category, professional_type,
        shop_salon_info ( business_name ),
        mobile_service_info ( business_name ),
        business_card_settings ( settings )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw error;
  return data || [];
}

/**
 * Add a new team member.
 */
export async function createTeamMember(supabase, { businessInfoId, userId, role = 'worker', permissions, invitedBy }) {
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      business_info_id: businessInfoId,
      user_id: userId,
      role,
      permissions: permissions || {
        canManageAppointments: true,
        canEditSchedule: false,
        canViewEarnings: false,
        canManageServices: false,
      },
      status: 'active',
      invited_by: invitedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove a team member (set status inactive).
 */
export async function removeTeamMember(supabase, teamMemberId, businessInfoId) {
  const { error } = await supabase
    .from('team_members')
    .update({ status: 'inactive' })
    .eq('id', teamMemberId)
    .eq('business_info_id', businessInfoId);

  if (error) throw error;
}

/**
 * Update team member permissions.
 */
export async function updateTeamMemberPermissions(supabase, teamMemberId, businessInfoId, permissions) {
  const { data, error } = await supabase
    .from('team_members')
    .update({ permissions })
    .eq('id', teamMemberId)
    .eq('business_info_id', businessInfoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── TEAM INVITATIONS ───────────────────────────────────────────────────

/**
 * Find all invitations for a business.
 */
export async function findInvitationsByBusiness(supabase, businessInfoId) {
  const { data, error } = await supabase
    .from('team_invitations')
    .select(`
      id, invited_username, status, message, created_at, responded_at,
      invited_user_id,
      users!team_invitations_invited_user_id_fkey ( id, username, email )
    `)
    .eq('business_info_id', businessInfoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Find pending invitations for a user (to display accept/decline).
 */
export async function findPendingInvitationsForUser(supabase, userId) {
  const { data, error } = await supabase
    .from('team_invitations')
    .select(`
      id, message, created_at, status,
      business_info_id,
      business_info (
        id, business_category, professional_type,
        shop_salon_info ( business_name ),
        mobile_service_info ( business_name ),
        business_card_settings ( settings )
      ),
      users!team_invitations_invited_by_user_id_fkey ( username )
    `)
    .eq('invited_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new team invitation.
 */
export async function createTeamInvitation(supabase, { businessInfoId, invitedByUserId, invitedUserId, invitedUsername, message }) {
  const { data, error } = await supabase
    .from('team_invitations')
    .insert({
      business_info_id: businessInfoId,
      invited_by_user_id: invitedByUserId,
      invited_user_id: invitedUserId,
      invited_username: invitedUsername,
      status: 'pending',
      message,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Respond to an invitation (accept/decline).
 */
export async function respondToInvitation(supabase, invitationId, userId, status) {
  const { data, error } = await supabase
    .from('team_invitations')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('invited_user_id', userId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel an invitation (by business owner).
 */
export async function cancelInvitation(supabase, invitationId, businessInfoId) {
  const { error } = await supabase
    .from('team_invitations')
    .update({ status: 'cancelled', responded_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('business_info_id', businessInfoId)
    .eq('status', 'pending');

  if (error) throw error;
}
