'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { CalendarPlus, MapPin, Bell, Sparkles, Layers, Search, Smartphone } from 'lucide-react';
import AuthPageNav from '@/components/AuthPageNav';
import SignUpForm from '@/components/auth/SignUpForm';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export default function UserSignUpPage() {
  const params = useParams();
  const locale = params.locale || 'en';
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url');
  const { t, isRTL } = useLanguage();
  const { isSignedIn, isLoaded } = useSupabaseAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect when user signs in (after sign-up completes)
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log('[UserSignUp] User signed in, redirecting...');
      router.push(redirectUrl ? `${redirectUrl}?setup=user` : `/${locale}?setup=user`);
    }
  }, [isLoaded, isSignedIn, locale, router, redirectUrl]);

  const handleSignUpSuccess = useCallback((session) => {
    // The auth state change will trigger the useEffect redirect above
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
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/40">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-100/20 rounded-full blur-[100px]" />

          <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 h-full w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-emerald-200/60 rounded-full px-4 py-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-xs font-semibold tracking-wide uppercase">
                  {t('auth.user.freeForever') || 'Free forever'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-amber-200/60 rounded-full px-4 py-1.5 shadow-sm">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-700 text-xs font-semibold tracking-wide uppercase">
                  {t('auth.user.allInOne') || 'All-in-one'}
                </span>
              </div>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 mb-3 leading-[1.15]">
              {t('auth.user.signUpHeroTitle') || 'All Your Services, One Platform'}
            </h1>
            <p className="text-slate-500 text-base max-w-sm mb-8 leading-relaxed">
              {t('auth.user.signUpHeroSubtitle') || 'Book barbers, salons, dentists, sports venues, repair services and more — all from one account.'}
            </p>

            <div className="space-y-2.5 max-w-md">
              {[
                { icon: Search, text: t('auth.user.benefitDiscover') || 'Find any service — barbers, doctors, sports venues & more', bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600' },
                { icon: MapPin, text: t('auth.user.benefitDiscover2') || 'Discover the nearest providers with map & directions', bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-600' },
                { icon: CalendarPlus, text: t('auth.user.benefitBook') || 'Book appointments online in just a few taps', bg: 'bg-orange-50', border: 'border-orange-200', iconColor: 'text-orange-600' },
                { icon: Smartphone, text: t('auth.user.benefitMobile') || 'Request mobile services that come to you', bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600' },
                { icon: Bell, text: t('auth.user.benefitReminders') || 'Get reminders so you never miss an appointment', bg: 'bg-purple-50', border: 'border-purple-200', iconColor: 'text-purple-600' },
              ].map(({ icon: Icon, text, bg, border, iconColor }) => (
                <div key={text} className={`flex items-center gap-3 bg-white/60 backdrop-blur-sm border ${border} rounded-xl px-4 py-3`}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${bg} border ${border} shrink-0`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <p className="text-slate-600 text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Sign Up Form */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {t('auth.user.createAccount') || 'Create your account'}
                </h2>
                <p className="text-gray-600">
                  {t('auth.user.signUpFormSubtitle') || 'It only takes a minute to get started'}
                </p>
              </div>

              <SignUpForm
                signInUrl={`/${locale}/auth/user/sign-in${redirectUrl ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : ''}`}
                redirectTo={redirectUrl ? `${redirectUrl}?setup=user` : `/${locale}?setup=user`}
                onSuccess={handleSignUpSuccess}
                variant="user"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
