'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Star, Shield, MapPin, Search, Layers } from 'lucide-react';
import AuthPageNav from '@/components/AuthPageNav';
import SignInForm from '@/components/auth/SignInForm';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export default function UserSignInPage() {
  const params = useParams();
  const locale = params.locale || 'en';
  const { t, isRTL } = useLanguage();
  const { isSignedIn, isLoaded, rawUser } = useSupabaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url');
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
      console.log('[UserSignIn] User signed in, checking if user exists in database...');

      fetch('/api/get-role')
        .then(res => {
          const ct = res.headers.get('content-type') || '';
          if (!ct.includes('application/json')) return { role: null };
          return res.json();
        })
        .then(async (data) => {
          console.log('[UserSignIn] Role check result:', data);
          if (data.role) {
            router.replace(redirectUrl || `/${locale}`);
          } else {
            // User not in database — try to create the row
            console.log('[UserSignIn] No role found, attempting to assign user role...');
            try {
              const roleRes = await fetch('/api/set-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'user' }),
              });
              const roleData = await roleRes.json();
              if (roleRes.ok || roleData.role) {
                console.log('[UserSignIn] Role assigned, redirecting');
                router.replace(redirectUrl || `/${locale}?setup=user`);
                return;
              }
            } catch (err) {
              console.error('[UserSignIn] Failed to assign role:', err);
            }
            // Still failed — sign out and show error
            const { createAuthClient } = await import('@/lib/supabase/auth-client');
            await createAuthClient().auth.signOut();
            setIsCheckingRole(false);
            setErrorMessage(t('auth.accountNotFound') || 'Account not found. Please sign up first.');
          }
        })
        .catch(async (err) => {
          console.error('[UserSignIn] Error checking role:', err);
          const { createAuthClient } = await import('@/lib/supabase/auth-client');
          await createAuthClient().auth.signOut();
          setIsCheckingRole(false);
          setErrorMessage(t('auth.errorCheckingAccount') || 'Error checking account. Please try again.');
        });
    }
  }, [isLoaded, isSignedIn, locale, router, isCheckingRole, t, redirectUrl]);

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
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-amber-50/80 via-white to-slate-50">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-100/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-50/40 rounded-full blur-[100px]" />

          <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 h-full w-full">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-amber-200/60 rounded-full px-4 py-1.5 w-fit mb-6 shadow-sm">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-amber-700 text-xs font-semibold tracking-wide uppercase">
                {t('auth.user.allInOne') || 'All-in-one platform'}
              </span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 mb-3 leading-[1.15]">
              {t('auth.user.signInHeroTitle') || 'Welcome Back'}
            </h1>
            <p className="text-slate-500 text-base max-w-sm mb-8 leading-relaxed">
              {t('auth.user.signInHeroSubtitle') || 'Sign in to book appointments, discover services, and manage all your bookings in one place.'}
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {[
                { icon: Search, label: t('auth.user.featureDiscover') || 'Discover', desc: t('auth.user.featureDiscoverDesc') || 'Find any service', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
                { icon: Calendar, label: t('auth.user.featureBooking') || 'Easy Booking', desc: t('auth.user.featureBookingDesc') || 'Book in seconds', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
                { icon: MapPin, label: t('auth.user.featureNearby') || 'Nearby', desc: t('auth.user.featureNearbyDesc') || 'Closest providers', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
                { icon: Shield, label: t('auth.user.featureSecure') || 'Secure', desc: t('auth.user.featureSecureDesc') || 'Data protected', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
              ].map(({ icon: Icon, label, desc, bg, border, text }) => (
                <div key={label} className={`group bg-white/70 backdrop-blur-sm border ${border} rounded-xl p-4 hover:bg-white transition-all duration-200`}>
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${bg} border ${border} mb-3`}>
                    <Icon className={`w-4 h-4 ${text}`} />
                  </div>
                  <p className="text-slate-800 text-sm font-semibold">{label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
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
                  {t('auth.user.welcomeBack') || 'Welcome back'}
                </h2>
                <p className="text-gray-600">
                  {t('auth.user.signInFormSubtitle') || 'Sign in to continue to your account'}
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700 text-center font-medium">{errorMessage}</p>
                  <p className="text-red-600 text-center text-sm mt-2">
                    <Link href={`/${locale}/auth/user/sign-up`} className="underline hover:text-red-800 font-semibold">
                      {t('auth.createAccount') || 'Create an account'}
                    </Link>
                  </p>
                </div>
              )}

              <SignInForm
                signUpUrl={`/${locale}/auth/user/sign-up${redirectUrl ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
                redirectTo={redirectUrl || `/${locale}`}
                onSuccess={handleSignInSuccess}
                variant="user"
                forgotPasswordUrl={`/${locale}/auth/forgot-password`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
