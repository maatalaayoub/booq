'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { createAuthClient } from '@/lib/supabase/auth-client';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import AuthPageNav from '@/components/AuthPageNav';
import Link from 'next/link';

const supabase = createAuthClient();

export default function ResetPasswordPage() {
  const params = useParams();
  const locale = params.locale || 'fr';
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Wait for the session to be established from the callback redirect
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true);
      }
    });

    // Also check if already has a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t('auth.resetPassword.minLength') || 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.mismatch') || 'Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);

    // Redirect to sign-in after 3 seconds
    setTimeout(() => {
      router.replace(`/${locale}/auth/user/sign-in`);
    }, 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex flex-col">
      <AuthPageNav locale={locale} isRTL={isRTL} t={t} />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
            {success ? (
              /* Success state */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {t('auth.resetPassword.success') || 'Password updated!'}
                </h1>
                <p className="text-slate-600">
                  {t('auth.resetPassword.successDesc') || 'Your password has been reset successfully. Redirecting you to sign in...'}
                </p>
              </div>
            ) : (
              /* Form state */
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-7 h-7 text-amber-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {t('auth.resetPassword.title') || 'Set new password'}
                  </h1>
                  <p className="text-slate-600 mt-2">
                    {t('auth.resetPassword.subtitle') || 'Enter your new password below.'}
                  </p>
                </div>

                {!sessionReady ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
                    <p className="text-slate-500 text-sm mt-3">
                      {t('auth.resetPassword.verifying') || 'Verifying your reset link...'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-slate-700 font-medium text-sm mb-1.5">
                        {t('auth.resetPassword.newPassword') || 'New password'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="new-password"
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

                    <div>
                      <label className="block text-slate-700 font-medium text-sm mb-1.5">
                        {t('auth.resetPassword.confirmPassword') || 'Confirm password'}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                          className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-0 focus:bg-white rounded-xl h-12 px-4 pr-12 transition-all"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="text-red-600 text-sm text-center">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl h-12 text-base font-semibold transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] disabled:opacity-50"
                    >
                      {loading
                        ? (t('auth.resetPassword.updating') || 'Updating...')
                        : (t('auth.resetPassword.updatePassword') || 'Update password')}
                    </button>
                  </form>
                )}

                <div className="text-center">
                  <Link
                    href={`/${locale}/auth/user/sign-in`}
                    className="text-slate-600 hover:text-slate-800 text-sm font-medium"
                  >
                    {t('auth.forgotPassword.backToSignIn') || 'Back to sign in'}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
