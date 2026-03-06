'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { useLanguage } from '@/contexts/LanguageContext';
import BusinessOnboarding from '@/components/BusinessOnboarding';

export default function BusinessDashboard() {
  const { 
    role, 
    isBarber, 
    hasRole, 
    isLoaded, 
    isSignedIn,
    user,
    refetch 
  } = useRole();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale || 'en';
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [setupError, setSetupError] = useState(null);
  
  // Ref to track if we've handled the setup (prevents redirect after URL clean)
  const setupHandledRef = useRef(false);

  // Debug logging
  useEffect(() => {
    console.log('[Dashboard] State:', { 
      isLoaded, isSignedIn, role, isBarber, hasRole, 
      isSettingUp, setupComplete, isCheckingOnboarding,
      onboardingStatus,
      setupParam: searchParams.get('setup')
    });
  }, [isLoaded, isSignedIn, role, isBarber, hasRole, isSettingUp, setupComplete, isCheckingOnboarding, onboardingStatus, searchParams]);

  // Notify layout about onboarding status
  const notifyLayout = (completed) => {
    window.dispatchEvent(new CustomEvent('onboarding-status', { 
      detail: { completed } 
    }));
  };

  // Check onboarding status
  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/business/onboarding');
      
      // Check content type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('API returned non-JSON response');
        setIsCheckingOnboarding(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setOnboardingStatus(data);
        notifyLayout(data.onboardingCompleted);
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    } finally {
      setIsCheckingOnboarding(false);
    }
  };

  useEffect(() => {
    async function setupRole() {
      const setupParam = searchParams.get('setup');
      console.log('[Dashboard] setupRole running:', { setupParam, isLoaded, isSignedIn, isBarber, hasRole, setupComplete, setupHandled: setupHandledRef.current });
      
      // Wait for auth and role data to load
      if (!isLoaded || !isSignedIn) {
        console.log('[Dashboard] Not ready yet, waiting...');
        return;
      }
      
      // If user already has barber role, check onboarding and clean URL
      if (isBarber) {
        console.log('[Dashboard] User is barber, checking onboarding...');
        if (setupParam) {
          window.history.replaceState({}, '', `/${locale}/business/dashboard`);
        }
        setupHandledRef.current = true;
        setSetupComplete(true);
        checkOnboardingStatus();
        return;
      }

      // If user has a different role (user role), redirect home
      if (hasRole && !isBarber) {
        console.log('[Dashboard] User has different role, redirecting...');
        router.push(`/${locale}`);
        return;
      }

      // If user has no role and setup param exists, show onboarding (role will be assigned on completion)
      if (!hasRole && setupParam === 'business') {
        console.log('[Dashboard] Showing onboarding flow (role will be assigned on completion)...');
        // Mark as handled BEFORE cleaning URL
        setupHandledRef.current = true;
        // Clean URL but keep showing onboarding
        window.history.replaceState({}, '', `/${locale}/business/dashboard`);
        setSetupComplete(true); // This triggers showing onboarding
        setIsCheckingOnboarding(false);
        // Set onboarding status to show the form
        setOnboardingStatus({ onboardingCompleted: false });
        return;
      }

      // If setup was already handled (URL was cleaned), don't redirect
      if (setupHandledRef.current || setupComplete) {
        console.log('[Dashboard] Setup already handled, not redirecting');
        setIsCheckingOnboarding(false);
        return;
      }

      // If user has no role and no setup param, redirect to sign-up
      // Sign-in page now blocks new users, so they must go through sign-up
      if (!hasRole && !setupParam) {
        console.log('[Dashboard] No role - redirecting to sign-up...');
        router.push(`/${locale}/auth/business/sign-up`);
        return;
      }
      
      // Fallback: no matching condition, stop checking
      console.log('[Dashboard] No matching condition, stopping checks');
      setIsCheckingOnboarding(false);
    }

    setupRole();
    // Note: setupComplete is NOT in dependencies to prevent re-triggering after we set it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, isBarber, hasRole, searchParams, locale, router]);

  const handleOnboardingComplete = async () => {
    // Refetch role since it was assigned during onboarding completion
    await refetch();
    setOnboardingStatus({ ...onboardingStatus, onboardingCompleted: true });
    notifyLayout(true);
  };

  // Show error if setup failed
  if (setupError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Setup Error</h2>
          <p className="text-gray-500 mb-6">{setupError}</p>
          <a
            href={`/${locale}/auth/business/sign-up`}
            className="inline-block px-6 py-3 bg-[#D4AF37] text-white rounded-lg font-medium hover:bg-[#C4A037] transition-colors"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  // Consolidated loading state - only show ONE loading screen
  if (!isLoaded || isSettingUp || isCheckingOnboarding || (searchParams.get('setup') && !setupComplete && !hasRole)) {
    return (
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-96 bg-gray-100 rounded" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[3px] p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-3.5 w-28 bg-gray-200 rounded mb-3" />
                  <div className="h-7 w-12 bg-gray-200 rounded" />
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming appointments skeleton */}
        <div className="bg-white rounded-[3px] border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-5 w-48 bg-gray-200 rounded" />
          </div>
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not a business user (extra client-side protection)
  // Only redirect if user has a different role, not if they have no role (new user)
  if (isLoaded && isSignedIn && hasRole && !isBarber) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if:
  // 1. User is barber but hasn't completed onboarding
  // 2. User has no role yet but came from signup (setupComplete is true)
  const shouldShowOnboarding = (isBarber && onboardingStatus && !onboardingStatus.onboardingCompleted) ||
    (!hasRole && setupComplete && onboardingStatus && !onboardingStatus.onboardingCompleted);
  
  console.log('[Dashboard] Render check:', { 
    isBarber, hasRole, setupComplete, 
    onboardingStatus, 
    shouldShowOnboarding,
    isLoaded, isSignedIn
  });
    
  if (shouldShowOnboarding) {
    return (
      <BusinessOnboarding 
        userName={user?.firstName} 
        onComplete={handleOnboardingComplete} 
      />
    );
  }

  return (
    <div>
      {/* Dashboard content */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t?.('dashboard.welcome') || 'Welcome back'}, {user?.firstName}!
        </h1>
        <p className="text-gray-500 mt-1">
          {t?.('dashboard.subtitle') || "Here's what's happening with your business today."}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-[3px] p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{t?.('dashboard.stats.todayAppointments') || "Today's Appointments"}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-[3px] p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{t?.('dashboard.stats.weeklyRevenue') || "This Week's Revenue"}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-[3px] p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{t?.('dashboard.stats.totalClients') || 'Total Clients'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-[3px] p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{t?.('dashboard.stats.avgRating') || 'Rating'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-[3px] border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t?.('dashboard.upcomingAppointments') || 'Upcoming Appointments'}</h2>
        </div>
        <div className="p-8 text-center text-gray-500">
          <p>{t?.('dashboard.noUpcomingAppointments') || 'No upcoming appointments'}</p>
        </div>
      </div>
    </div>
  );
}
