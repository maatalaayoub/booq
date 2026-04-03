/**
 * Clerk server-side auth adapter.
 *
 * This is the ONLY file that imports from @clerk/nextjs/server or @clerk/backend.
 * To switch auth providers, replace this file and keep the same exports.
 */
import { auth } from '@clerk/nextjs/server';

/**
 * Get current session user ID from server context.
 * Works in API routes and server components.
 * @returns {Promise<string|null>} Clerk user ID or null
 */
export async function getSessionUserId() {
  const { userId } = await auth();
  return userId || null;
}

/**
 * Get current session user ID and role from server context.
 * @returns {Promise<{userId: string|null, role: string|null}>}
 */
export async function getSessionRole() {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.publicMetadata?.role || null;
  return { userId: userId || null, role };
}

/**
 * Verify a Bearer token and return the user ID.
 * Used for mobile/external API clients.
 * @param {string} token - Bearer token
 * @returns {Promise<string|null>} User ID or null
 */
export async function verifyBearerToken(token) {
  try {
    const { verifyToken } = await import('@clerk/backend');
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    return payload?.sub || null;
  } catch (err) {
    console.log('[auth] Bearer token verification failed:', err.message);
    return null;
  }
}
