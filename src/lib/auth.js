import { getSessionUserId, getSessionRole, verifyBearerToken } from '@/lib/auth/supabase-adapter';
import { redirect } from 'next/navigation';

/**
 * Server-side role utility functions.
 */

/**
 * Get the current user's role from server context
 * @returns {Promise<{userId: string | null, role: string | null}>}
 */
export async function getServerRole() {
  return getSessionRole();
}

/**
 * Require a specific role to access a server component
 * Redirects to specified path if role doesn't match
 * @param {'user' | 'business'} requiredRole - Required role
 * @param {string} redirectTo - Path to redirect to on failure
 */
export async function requireRole(requiredRole, redirectTo = '/') {
  const { userId, role } = await getServerRole();
  
  if (!userId) {
    redirect(requiredRole === 'business' ? '/auth/business/sign-in' : '/auth/user/sign-in');
  }
  
  if (role !== requiredRole) {
    redirect(redirectTo);
  }
  
  return { userId, role };
}

/**
 * Check if current user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const userId = await getSessionUserId();
  return !!userId;
}

/**
 * Check if current user is a customer
 * @returns {Promise<boolean>}
 */
export async function isUserRole() {
  const { role } = await getServerRole();
  return role === 'user';
}

/**
 * Check if current user is a business user
 * @returns {Promise<boolean>}
 */
export async function isBusinessRole() {
  const { role } = await getServerRole();
  return role === 'business';
}

/**
 * Check if current user is an admin
 * @returns {Promise<boolean>}
 */
export async function isAdminRole() {
  const { role } = await getServerRole();
  return role === 'admin';
}

/**
 * Get userId from session or Bearer token (for API routes).
 * Supports both Next.js session auth and mobile/external Bearer tokens.
 * @param {Request} request - The incoming request
 * @returns {Promise<string | null>} User ID or null
 */
export async function getUserId(request) {
  const userId = await getSessionUserId();
  if (userId) return userId;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const tokenUserId = await verifyBearerToken(token);
    if (tokenUserId) return tokenUserId;
  }
  return null;
}

/**
 * Resolve an auth provider user ID to the internal Supabase user ID.
 * @param {object} supabase - Supabase client
 * @param {string} authId   - Supabase Auth user ID (UUID)
 * @returns {Promise<string | null>} internal user.id or null
 */
export async function getInternalUserId(supabase, authId) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_auth_id', authId)
    .single();

  return user?.id || null;
}
