/**
 * Supabase server-side auth adapter.
 *
 * Exports: getSessionUserId, getSessionRole, verifyBearerToken.
 */
import { createAuthServerClient } from '@/lib/supabase/auth-server';

/**
 * Get current session user ID from server context.
 * @returns {Promise<string|null>} Supabase auth user ID or null
 */
export async function getSessionUserId() {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Get current session user ID and role.
 * Role is stored in the users table, not in the JWT.
 * The auth.js layer handles the DB lookup via getInternalUserId.
 * @returns {Promise<{userId: string|null, role: string|null}>}
 */
export async function getSessionRole() {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { userId: null, role: null };

  // Return userId — role lookup happens in the calling code
  return { userId: user.id, role: null };
}

/**
 * Verify a Bearer token (Supabase access_token) and return the user ID.
 * Used for mobile / external API clients.
 * @param {string} token - Supabase access token
 * @returns {Promise<string|null>} User ID or null
 */
export async function verifyBearerToken(token) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    return user?.id || null;
  } catch (err) {
    console.log('[auth] Bearer token verification failed:', err.message);
    return null;
  }
}
