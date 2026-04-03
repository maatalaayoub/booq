'use client';

/**
 * Client-side auth hook.
 *
 * This is the ONLY client file that imports from @clerk/nextjs.
 * To switch auth providers, replace this file and keep the same exports.
 */
import { useUser, useAuth } from '@clerk/nextjs';

/**
 * @returns {{ user: object|null, isLoaded: boolean, isSignedIn: boolean, getToken: function }}
 */
export function useAuthUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  return { user, isLoaded, isSignedIn, getToken };
}
