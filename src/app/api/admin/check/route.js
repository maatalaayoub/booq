import { requireAdmin } from '@/lib/admin';
import { apiData } from '@/lib/api-response';

/**
 * GET /api/admin/check
 * Quick check if current user is admin. Returns { isAdmin: true } or 403.
 */
export async function GET() {
  const result = await requireAdmin();
  if (result.error) return result.error;

  return apiData({ isAdmin: true, adminId: result.adminUser.id });
}
