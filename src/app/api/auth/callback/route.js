import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const VALID_ROLES = ['user', 'business'];

/**
 * OAuth callback handler.
 * Supabase redirects here after successful OAuth (e.g. Google).
 * Exchanges the code for a session, assigns the role, and redirects.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';
  const role = searchParams.get('role');

  if (code) {
    const supabase = await createAuthServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Assign role if provided and valid (for new OAuth users)
      if (role && VALID_ROLES.includes(role)) {
        try {
          const adminSupabase = createServerSupabaseClient();
          const { data: existingUser } = await adminSupabase
            .from('users')
            .select('id, role')
            .eq('supabase_auth_id', data.user.id)
            .single();

          if (!existingUser) {
            // New user — create with role
            const email = data.user.email || null;
            const firstName = data.user.user_metadata?.full_name?.split(' ')[0] ||
                              data.user.user_metadata?.first_name || null;
            const lastName = data.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ||
                             data.user.user_metadata?.last_name || null;

            // Generate unique username
            let baseUsername = ((firstName || '') + (lastName || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!baseUsername) baseUsername = 'user';
            let finalUsername = baseUsername;
            let counter = 0;
            while (true) {
              const { data: existing } = await adminSupabase
                .from('users')
                .select('id')
                .eq('username', finalUsername)
                .single();
              if (!existing) break;
              counter++;
              finalUsername = baseUsername + counter;
            }

            await adminSupabase.from('users').insert({
              supabase_auth_id: data.user.id,
              email,
              username: finalUsername,
              role,
              onboarding_completed: role === 'user',
            });

            // Create profile record
            const { data: newUser } = await adminSupabase
              .from('users')
              .select('id')
              .eq('supabase_auth_id', data.user.id)
              .single();

            if (newUser) {
              await adminSupabase.from('user_profile').insert({
                user_id: newUser.id,
                first_name: firstName,
                last_name: lastName,
              });
            }
          }
        } catch (err) {
          console.error('[auth/callback] Error assigning role:', err);
          // Don't block the redirect — role can be assigned later
        }
      }

      // Ensure `next` is a relative path to prevent open redirect
      const redirectTo = next.startsWith('/') ? next : '/';
      return NextResponse.redirect(new URL(redirectTo, origin));
    }
  }

  // On error, redirect to a generic error page or sign-in
  return NextResponse.redirect(new URL('/auth/user/sign-in?error=auth_callback_failed', origin));
}
