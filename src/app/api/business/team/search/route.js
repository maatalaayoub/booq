import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData } from '@/lib/api-response';
import { getBusinessContext } from '@/repositories/business';

/**
 * GET /api/business/team/search?q=...
 * Search users by name, @username, email, or phone.
 * Returns up to 10 matching users with profile info.
 */
export async function GET(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return apiData({ results: [] });
    }

    // Determine search type
    const isUsername = q.startsWith('@');
    const isEmail = q.includes('@') && !isUsername;
    const isPhone = /^\+?\d[\d\s-]{3,}$/.test(q);

    let query = supabase
      .from('users')
      .select(`
        id, username, email,
        user_profile (
          first_name, last_name, phone, profile_image_url
        )
      `)
      .neq('id', ctx.userId)
      .limit(10);

    if (isUsername) {
      // Search by username (strip leading @)
      const uname = q.slice(1).toLowerCase();
      if (uname.length < 2) return apiData({ results: [] });
      query = query.ilike('username', `%${uname}%`);
    } else if (isEmail) {
      query = query.ilike('email', `%${q}%`);
    } else if (isPhone) {
      // Search by phone in user_profile
      const digits = q.replace(/[\s-]/g, '');
      const { data: phoneProfiles } = await supabase
        .from('user_profile')
        .select('user_id')
        .ilike('phone', `%${digits}%`)
        .limit(10);

      if (!phoneProfiles?.length) return apiData({ results: [] });

      const userIds = phoneProfiles.map((p) => p.user_id);
      query = supabase
        .from('users')
        .select(`
          id, username, email,
          user_profile (
            first_name, last_name, phone, profile_image_url
          )
        `)
        .in('id', userIds)
        .neq('id', ctx.userId)
        .limit(10);
    } else {
      // Search by name (first_name or last_name in user_profile)
      const { data: nameProfiles } = await supabase
        .from('user_profile')
        .select('user_id')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(10);

      if (!nameProfiles?.length) {
        // Fallback: also try username
        query = query.ilike('username', `%${q}%`);
      } else {
        const userIds = nameProfiles.map((p) => p.user_id);
        query = supabase
          .from('users')
          .select(`
            id, username, email,
            user_profile (
              first_name, last_name, phone, profile_image_url
            )
          `)
          .in('id', userIds)
          .neq('id', ctx.userId)
          .limit(10);
      }
    }

    const { data: users, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    // Get existing team members and pending invitations for this business
    const [{ data: existingMembers }, { data: pendingInvites }] = await Promise.all([
      supabase
        .from('team_members')
        .select('user_id')
        .eq('business_info_id', ctx.businessInfoId)
        .eq('status', 'active'),
      supabase
        .from('team_invitations')
        .select('invited_user_id')
        .eq('business_info_id', ctx.businessInfoId)
        .eq('status', 'pending'),
    ]);

    const memberIds = new Set((existingMembers || []).map((m) => m.user_id));
    const pendingIds = new Set((pendingInvites || []).map((i) => i.invited_user_id));

    // Check if users are members of ANY other business
    const userIds = (users || []).map((u) => u.id);
    const { data: otherMemberships } = userIds.length
      ? await supabase
          .from('team_members')
          .select('user_id')
          .in('user_id', userIds)
          .eq('status', 'active')
      : { data: [] };
    const otherMemberIds = new Set((otherMemberships || []).map((m) => m.user_id));

    const results = (users || []).map((u) => {
      const profile = u.user_profile;
      const firstName = profile?.first_name || '';
      const lastName = profile?.last_name || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ');

      let status = 'available';
      if (memberIds.has(u.id)) status = 'member';
      else if (pendingIds.has(u.id)) status = 'pending';
      else if (otherMemberIds.has(u.id)) status = 'other_team';

      return {
        id: u.id,
        username: u.username,
        fullName: fullName || null,
        avatarUrl: profile?.profile_image_url || null,
        status,
      };
    });

    return apiData({ results });
  } catch (err) {
    console.error('[team search] Error:', err);
    return apiError('Internal server error');
  }
}
