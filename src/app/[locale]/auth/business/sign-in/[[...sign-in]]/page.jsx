'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Scissors, LayoutDashboard, Users, TrendingUp } from 'lucide-react';
import AuthPageNav from '@/components/AuthPageNav';
import SignInForm from '@/components/auth/SignInForm';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export default function BusinessSignInPage() {
  const params = useParams();
  const locale = params.locale || 'en';
  const { t, isRTL } = useLanguage();
  const { isSignedIn, isLoaded } = useSupabaseAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if user exists in database after sign-in
  useEffect(() => {
    if (isLoaded && isSignedIn && !isCheckingRole) {
      setIsCheckingRole(true);
      console.log('[BusinessSignIn] User signed in, checking if user exists in database...');

      fetch('/api/get-role')
        .then(res => res.json())
        .then(async (data) => {
          console.log('[BusinessSignIn] Role check result:', data);
          if (data.role) {
            router.push(`/${locale}/business/dashboard`);
          } else {
            const { createAuthClient } = await import('@/lib/supabase/auth-client');
            await createAuthClient().auth.signOut();
            setIsCheckingRole(false);
            setErrorMessage(t('auth.accountNotFound') || 'Account not found. Please sign up first.');
          }
        })
        .catch(async (err) => {
          console.error('[BusinessSignIn] Error checking role:', err);
          const { createAuthClient } = await import('@/lib/supabase/auth-client');
          await createAuthClient().auth.signOut();
          setIsCheckingRole(false);
          setErrorMessage(t('auth.errorCheckingAccount') || 'Error checking account. Please try again.');
        });
    }
  }, [isLoaded, isSignedIn, locale, router, isCheckingRole, t]);

  const handleSignInSuccess = useCallback(() => {
    // The useEffect above handles role checking + redirect
  }, []);

  if (!isMounted || !isLoaded || isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{isSignedIn ? 'Redirecting...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-white ${isRTL ? 'rtl' : 'ltr'}`}>
      <AuthPageNav locale={locale} isRTL={isRTL} t={t} />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Side - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-slate-200/40 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />

          <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 h-full w-full">
            <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 mb-4 leading-[1.15]">
              {t('auth.barber.signInHeroTitle') || 'Welcome back'}
            </h1>
            <p className="text-slate-500 text-lg max-w-md mb-10 leading-relaxed">
              {t('auth.barber.signInHeroSubtitle') || 'Access your dashboard to manage appointments, clients, and grow your business.'}
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {[
                { icon: LayoutDashboard, label: t('auth.barber.featureDashboard') || 'Dashboard', desc: t('auth.barber.featureDashboardDesc') || 'Full overview' },
                { icon: Users, label: t('auth.barber.featureClients') || 'Clients', desc: t('auth.barber.featureClientsDesc') || 'Manage easily' },
                { icon: Scissors, label: t('auth.barber.featureServices') || 'Services', desc: t('auth.barber.featureServicesDesc') || 'Custom pricing' },
                { icon: TrendingUp, label: t('auth.barber.featureGrowth') || 'Growth', desc: t('auth.barber.featureGrowthDesc') || 'Track revenue' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 bg-white border-2 border-gray-200 rounded-sm p-3.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 shrink-0">
                    <Icon className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-900 text-sm font-semibold leading-tight">{label}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {t('auth.barber.signInTitle') || 'Sign in to your account'}
                </h2>
                <p className="text-gray-600">
                  {t('auth.barber.signInFormSubtitle') || 'Access your professional dashboard'}
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700 text-center font-medium">{errorMessage}</p>
                  <p className="text-red-600 text-center text-sm mt-2">
                    <Link href={`/${locale}/auth/business/sign-up`} className="underline hover:text-red-800 font-semibold">
                      {t('auth.createAccount') || 'Create an account'}
                    </Link>
                  </p>
                </div>
              )}

              <SignInForm
                signUpUrl={`/${locale}/auth/business/sign-up`}
                redirectTo={`/${locale}/business/dashboard`}
                onSuccess={handleSignInSuccess}
                variant="business"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
