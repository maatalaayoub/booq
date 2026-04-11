'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Zap, CalendarCheck, BarChart3, Globe, Users, Settings, Layers } from 'lucide-react';
import AuthPageNav from '@/components/AuthPageNav';
import SignUpForm from '@/components/auth/SignUpForm';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export default function BusinessSignUpPage() {
  const params = useParams();
  const locale = params.locale || 'en';
  const { t, isRTL } = useLanguage();
  const { isSignedIn, isLoaded } = useSupabaseAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect to dashboard when user signs in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log('[BusinessSignUp] User signed in, redirecting to dashboard...');
      router.push(`/${locale}/business/dashboard?setup=business`);
    }
  }, [isLoaded, isSignedIn, locale, router]);

  const handleSignUpSuccess = useCallback((session) => {
    // Auth state change triggers the useEffect redirect above
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
        {/* Left Side - Features & Benefits */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-amber-50/60 via-white to-emerald-50/40">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-100/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-100/20 rounded-full blur-[100px]" />

          <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 h-full w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-amber-200/60 rounded-full px-4 py-1.5 shadow-sm">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-700 text-xs font-semibold tracking-wide uppercase">
                  {t('auth.barber.professionalPortal') || 'Professional Portal'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-emerald-200/60 rounded-full px-4 py-1.5 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-xs font-semibold tracking-wide uppercase">
                  {t('auth.barber.freeTrial') || 'Free to Start'}
                </span>
              </div>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 mb-3 leading-[1.15]">
              {t('auth.barber.joinNetwork') || 'Grow your business with Booka.ma'}
            </h1>
            <p className="text-slate-500 text-base max-w-sm mb-8 leading-relaxed">
              {t('auth.barber.signUpSubtitle') || 'Whether you\'re a barber, dentist, trainer, or any service provider — manage bookings, team, and clients all in one place.'}
            </p>

            <div className="space-y-2.5 max-w-md">
              {[
                { icon: CalendarCheck, text: t('auth.barber.benefitSchedule') || 'Smart scheduling — accept, reject, or reschedule bookings', bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600' },
                { icon: Users, text: t('auth.barber.benefitTeam') || 'Add workers and let clients choose or auto-assign', bg: 'bg-blue-50', border: 'border-blue-200', iconColor: 'text-blue-600' },
                { icon: Settings, text: t('auth.barber.benefitCustomize') || 'Customize your public booking page & services', bg: 'bg-orange-50', border: 'border-orange-200', iconColor: 'text-orange-600' },
                { icon: BarChart3, text: t('auth.barber.benefitAnalytics') || 'Track revenue with daily, weekly & monthly analytics', bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-600' },
                { icon: Globe, text: t('auth.barber.benefitOnline') || 'Get a shareable booking link — or connect a custom domain', bg: 'bg-purple-50', border: 'border-purple-200', iconColor: 'text-purple-600' },
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
                  {t('auth.barber.createYourAccount') || 'Create your account'}
                </h2>
                <p className="text-gray-600">
                  {t('auth.barber.startFreeToday') || 'Set up your business profile in minutes'}
                </p>
              </div>

              <SignUpForm
                signInUrl={`/${locale}/auth/business/sign-in`}
                redirectTo={`/${locale}/business/dashboard?setup=business`}
                onSuccess={handleSignUpSuccess}
                variant="business"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
