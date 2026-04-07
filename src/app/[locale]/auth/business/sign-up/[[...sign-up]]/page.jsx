'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Scissors, Zap, CalendarCheck, BarChart3, Globe } from 'lucide-react';
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
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-100/30 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />

          <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 h-full w-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5">
                <Scissors className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-700 text-xs font-semibold tracking-wide uppercase">
                  {t('auth.barber.professionalPortal') || 'Professional Portal'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-xs font-semibold tracking-wide uppercase">
                  {t('auth.barber.freeTrial') || 'Free to Start'}
                </span>
              </div>
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 mb-4 leading-[1.15]">
              {t('auth.barber.joinNetwork') || 'Grow your barbering business'}
            </h1>
            <p className="text-slate-500 text-lg max-w-md mb-10 leading-relaxed">
              {t('auth.barber.signUpSubtitle') || 'Join 500+ professionals who trust Booka.ma to manage and grow their business.'}
            </p>

            <div className="space-y-4 max-w-md">
              {[
                { icon: CalendarCheck, text: t('auth.barber.benefitSchedule') || 'Smart scheduling that fills your calendar' },
                { icon: BarChart3, text: t('auth.barber.benefitAnalytics') || 'Revenue analytics and business insights' },
                { icon: Globe, text: t('auth.barber.benefitOnline') || 'Online presence that attracts new clients' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 shrink-0">
                    <Icon className="w-4 h-4 text-amber-600" />
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
              <div className="text-center mb-8 hidden lg:block">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {t('auth.barber.createYourAccount') || 'Create your account'}
                </h2>
                <p className="text-gray-600">
                  {t('auth.barber.startFreeToday') || 'Start free today • No credit card required'}
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
