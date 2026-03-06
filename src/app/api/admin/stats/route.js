import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

/**
 * GET /api/admin/stats
 * Returns dashboard-level statistics for the admin panel.
 */
export async function GET() {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase } = result;

  const [
    { count: totalUsers },
    { count: totalBusiness },
    { count: pendingVerifications },
    { count: totalAppointments },
    { count: suspendedUsers },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'business'),
    supabase.from('verification_requests').select('*', { count: 'exact', head: true }).or('identity_status.eq.pending,business_status.eq.pending'),
    supabase.from('appointments').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('account_status', 'suspended'),
  ]);

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    totalBusiness: totalBusiness || 0,
    pendingVerifications: pendingVerifications || 0,
    totalAppointments: totalAppointments || 0,
    suspendedUsers: suspendedUsers || 0,
  });
}
