import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';

/**
 * GET /api/admin/check
 * Quick check if current user is admin. Returns { isAdmin: true } or 403.
 */
export async function GET() {
  const result = await requireAdmin();
  if (result.error) return result.error;

  return NextResponse.json({ isAdmin: true, adminId: result.adminUser.id });
}
