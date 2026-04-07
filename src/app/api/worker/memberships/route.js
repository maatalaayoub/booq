import { getUserId, getInternalUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData } from '@/lib/api-response';
import { findUserTeamMemberships } from '@/repositories/team';

/**
 * GET /api/worker/memberships
 * Returns all businesses the current user is a team member of.
 */
export async function GET(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const userId = await getInternalUserId(supabase, authId);
    if (!userId) return apiError('User not found', 404);

    const memberships = await findUserTeamMemberships(supabase, userId);

    // Format for frontend: include business name
    const formatted = memberships.map((m) => {
      const bi = m.business_info;
      const name =
        bi?.shop_salon_info?.business_name ||
        bi?.mobile_service_info?.business_name ||
        'Unknown Business';
      return {
        id: m.id,
        businessInfoId: m.business_info_id,
        businessName: name,
        businessCategory: bi?.business_category,
        role: m.role,
        permissions: m.permissions,
        joinedAt: m.joined_at,
      };
    });

    return apiData(formatted);
  } catch (error) {
    console.error('[Worker Memberships]', error);
    return apiError('Internal server error', 500);
  }
}
