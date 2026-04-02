import { requireAdmin } from '@/lib/admin';
import { apiData } from '@/lib/api-response';

/**
 * GET /api/admin/stats
 * Returns dashboard-level statistics for the admin panel.
 */
export async function GET() {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase } = result;

  // Helper: run a count query safely; return 0 on any error (e.g. table missing)
  const safeCount = async (queryFn) => {
    try {
      const { count, error } = await queryFn();
      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  };

  const [totalUsers, totalBusiness, pendingVerifications, totalAppointments, suspendedUsers] = await Promise.all([
    safeCount(() => supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user')),
    safeCount(() => supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business')),
    safeCount(() => supabase.from('verification_requests').select('*', { count: 'exact', head: true }).or('identity_status.eq.pending,business_status.eq.pending')),
    safeCount(() => supabase.from('appointments').select('*', { count: 'exact', head: true })),
    safeCount(() => supabase.from('users').select('*', { count: 'exact', head: true }).eq('account_status', 'suspended')),
  ]);

  return apiData({
    totalUsers,
    totalBusiness,
    pendingVerifications,
    totalAppointments,
    suspendedUsers,
  });
}
