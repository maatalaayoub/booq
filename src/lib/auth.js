import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Server-side role utility functions
 */

/**
 * Get the current user's role from server context
 * @returns {Promise<{userId: string | null, role: string | null}>}
 */
export async function getServerRole() {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.publicMetadata?.role || null;
  
  return { userId, role };
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
  const { userId } = await auth();
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
 * Get userId from Clerk session or Bearer token (for API routes).
 * Supports both Next.js session auth and mobile/external Bearer tokens.
 * @param {Request} request - The incoming request
 * @returns {Promise<string | null>} Clerk userId or null
 */
export async function getUserId(request) {
  const { userId } = await auth();
  if (userId) return userId;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { verifyToken } = await import('@clerk/backend');
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      if (payload?.sub) return payload.sub;
    } catch (err) {
      console.log('[auth] Bearer token verification failed:', err.message);
    }
  }
  return null;
}

/**
 * Resolve a Clerk userId to the internal Supabase user ID.
 * @param {object} supabase - Supabase client
 * @param {string} clerkId  - Clerk userId
 * @returns {Promise<string | null>} internal user.id or null
 */
export async function getInternalUserId(supabase, clerkId) {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();

  return user?.id || null;
}
