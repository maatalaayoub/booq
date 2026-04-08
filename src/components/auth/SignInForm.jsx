'use client';

import { useState } from 'react';
import { createAuthClient } from '@/lib/supabase/auth-client';
import { Eye, EyeOff } from 'lucide-react';

const supabase = createAuthClient();

/**
 * Custom sign-in form.
 * Renders email/password fields + Google OAuth button.
 *
 * @param {Object} props
 * @param {string} props.signUpUrl - URL to the sign-up page
 * @param {string} props.redirectTo - Where to redirect after OAuth
 * @param {Function} props.onSuccess - Called after successful sign-in (receives session)
 * @param {string} [props.variant='user'] - 'user' | 'business' — changes button gradient
 */
export default function SignInForm({ signUpUrl, redirectTo, onSuccess, variant = 'user' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');

  const buttonGradient = variant === 'business'
    ? 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 shadow-lg shadow-slate-900/30 hover:shadow-xl hover:scale-[1.02]'
    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02]';

  async function handleEmailSignIn(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    onSuccess?.(data.session);
  }

  async function handleGoogleSignIn() {
    setError('');
    setOauthLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?role=${variant}&next=${encodeURIComponent(redirectTo || '/')}`,
      },
    });

    if (oauthError) {
      setOauthLoading(false);
      setError(oauthError.message);
    }
    // Otherwise the browser will redirect to Google
  }

  return (
    <div className="w-full space-y-5">
      {/* Email/Password Form */}
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div>
          <label className="block text-slate-700 font-medium text-sm mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-0 focus:bg-white rounded-xl h-12 px-4 transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-slate-700 font-medium text-sm mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-0 focus:bg-white rounded-xl h-12 px-4 pr-12 transition-all"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || oauthLoading}
          className={`w-full ${buttonGradient} text-white rounded-xl h-12 text-base font-semibold transition-all disabled:opacity-50`}
        >
          {loading ? 'Signing in...' : 'Continue'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-slate-400 text-sm">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={oauthLoading || loading}
        className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-xl h-12 font-medium disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {oauthLoading ? 'Redirecting...' : 'Continue with Google'}
      </button>

      {/* Footer — sign-up link */}
      {signUpUrl && (
        <p className="text-center text-slate-600 text-sm">
          Don&apos;t have an account?{' '}
          <a href={signUpUrl} className="text-amber-600 hover:text-amber-700 font-semibold">
            Sign up
          </a>
        </p>
      )}
    </div>
  );
}
