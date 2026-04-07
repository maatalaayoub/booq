'use client';

/**
 * Client-side auth hook.
 *
 * Delegates to Supabase Auth via useSupabaseAuth.
 * Keeps the same export shape so every consumer works unchanged.
 */
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

/**
 * @returns {{ user: object|null, isLoaded: boolean, isSignedIn: boolean, getToken: function }}
 */
export function useAuthUser() {
  const { user, isLoaded, isSignedIn, getToken } = useSupabaseAuth();
  return { user, isLoaded, isSignedIn, getToken };
}
