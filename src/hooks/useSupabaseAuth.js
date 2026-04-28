'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createAuthClient } from '@/lib/supabase/auth-client';

const supabase = createAuthClient();

export function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoaded(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoaded(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isSignedIn = !!session;

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  // Build a user object compatible with the old shape so existing components work
  const compatUser = useMemo(() => {
    if (!user) return null;
    const meta = user.user_metadata || {};
    let firstName = meta.first_name || meta.firstName || meta.given_name || '';
    let lastName = meta.last_name || meta.lastName || meta.family_name || '';
    if (!firstName || !lastName) {
      const fullName = meta.full_name || meta.name || '';
      if (fullName) {
        const parts = fullName.trim().split(/\s+/);
        if (!firstName) firstName = parts[0] || '';
        if (!lastName) lastName = parts.slice(1).join(' ') || '';
      }
    }
    return {
      id: user.id,
      emailAddresses: [{ emailAddress: user.email }],
      primaryEmailAddress: { emailAddress: user.email },
      email: user.email,
      firstName,
      lastName,
      imageUrl: null,
      hasImage: false,
    };
  }, [user]);

  return { user: compatUser, rawUser: user, session, isLoaded, isSignedIn, getToken };
}
