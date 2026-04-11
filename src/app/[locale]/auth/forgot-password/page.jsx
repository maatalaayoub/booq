'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { createAuthClient } from '@/lib/supabase/auth-client';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import AuthPageNav from '@/components/AuthPageNav';
import Link from 'next/link';

const supabase = createAuthClient();

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = params.locale || 'fr';
  const { t, isRTL } = useLanguage();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(`/${locale}/auth/reset-password`)}`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex flex-col">
      <AuthPageNav locale={locale} isRTL={isRTL} t={t} />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
            {sent ? (
              /* Success state */
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {t('auth.forgotPassword.emailSent') || 'Check your email'}
                </h1>
                <p className="text-slate-600">
                  {t('auth.forgotPassword.emailSentDesc') || 'We\'ve sent a password reset link to your email address. Please check your inbox and click the link to reset your password.'}
                </p>
                <p className="text-sm text-slate-500">
                  {email}
                </p>
                <div className="pt-4">
                  <Link
                    href={`/${locale}/auth/user/sign-in`}
                    className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t('auth.forgotPassword.backToSignIn') || 'Back to sign in'}
                  </Link>
                </div>
              </div>
            ) : (
              /* Form state */
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-amber-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {t('auth.forgotPassword.title') || 'Forgot your password?'}
                  </h1>
                  <p className="text-slate-600 mt-2">
                    {t('auth.forgotPassword.subtitle') || 'Enter your email and we\'ll send you a link to reset your password.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-slate-700 font-medium text-sm mb-1.5">
                      {t('auth.forgotPassword.emailLabel') || 'Email address'}
                    </label>
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

                  {error && (
                    <p className="text-red-600 text-sm text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl h-12 text-base font-semibold transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] disabled:opacity-50"
                  >
                    {loading
                      ? (t('auth.forgotPassword.sending') || 'Sending...')
                      : (t('auth.forgotPassword.sendLink') || 'Send reset link')}
                  </button>
                </form>

                <div className="text-center">
                  <Link
                    href={`/${locale}/auth/user/sign-in`}
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
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
