'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';
import BusinessOnboarding from '@/components/BusinessOnboarding';

export default function BusinessDashboard() {
  const { 
    role, 
    isBusiness, 
    hasRole, 
    isLoaded, 
    isSignedIn,
    user,
    refetch 
  } = useRole();
  const { t } = useLanguage();
  const { businessCategory } = useBusinessCategory();
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale || 'en';
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [setupError, setSetupError] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Ref to track if we've handled the setup (prevents redirect after URL clean)
  const setupHandledRef = useRef(false);

  // Debug logging
  useEffect(() => {
    console.log('[Dashboard] State:', { 
      isLoaded, isSignedIn, role, isBusiness, hasRole, 
      isSettingUp, setupComplete, isCheckingOnboarding,
      onboardingStatus,
      setupParam: searchParams.get('setup')
    });
  }, [isLoaded, isSignedIn, role, isBusiness, hasRole, isSettingUp, setupComplete, isCheckingOnboarding, onboardingStatus, searchParams]);

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

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/business/dashboard-stats');
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[fetchStats] API returned non-JSON response');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    async function setupRole() {
      const setupParam = searchParams.get('setup');
      console.log('[Dashboard] setupRole running:', { setupParam, isLoaded, isSignedIn, isBusiness, hasRole, setupComplete, setupHandled: setupHandledRef.current });
      
      // Wait for auth and role data to load
      if (!isLoaded || !isSignedIn) {
        console.log('[Dashboard] Not ready yet, waiting...');
        return;
      }
      
      // If user already has business role, check onboarding and clean URL
      if (isBusiness) {
        console.log('[Dashboard] User is business, checking onboarding...');
        if (setupParam) {
          window.history.replaceState({}, '', `/${locale}/business/dashboard`);
        }
        setupHandledRef.current = true;
        setSetupComplete(true);
        checkOnboardingStatus();
        fetchStats();
        return;
      }

      // If user has a different role (user role), redirect home
      if (hasRole && !isBusiness) {
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
  }, [isLoaded, isSignedIn, isBusiness, hasRole, searchParams, locale, router]);

  const handleOnboardingComplete = async () => {
    // Refetch role since it was assigned during onboarding completion
    await refetch();
    setOnboardingStatus({ ...onboardingStatus, onboardingCompleted: true });
    notifyLayout(true);
    fetchStats();
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

        {/* Upcoming bookings skeleton */}
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
  if (isLoaded && isSignedIn && hasRole && !isBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if:
  // 1. User is business but hasn't completed onboarding
  // 2. User has no role yet but came from signup (setupComplete is true)
  const shouldShowOnboarding = (isBusiness && onboardingStatus && !onboardingStatus.onboardingCompleted) ||
    (!hasRole && setupComplete && onboardingStatus && !onboardingStatus.onboardingCompleted);
  
  console.log('[Dashboard] Render check:', { 
    isBusiness, hasRole, setupComplete, 
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

  // Job Seeker dashboard
  if (businessCategory === 'job_seeker') {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t?.('dashboard.welcome') || 'Welcome back'}, {user?.firstName}!
          </h1>
          <p className="text-gray-500 mt-1">
            {t?.('dashboard.jobSeeker.subtitle') || "Here's an overview of your job search progress."}
          </p>
        </div>

        {/* Job Seeker Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-[3px] p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t?.('dashboard.jobSeeker.stats.applications') || 'Applications Sent'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.applicationsSent ?? 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3px] p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t?.('dashboard.jobSeeker.stats.interviews') || 'Upcoming Interviews'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.upcomingInterviews ?? 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3px] p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t?.('dashboard.jobSeeker.stats.savedJobs') || 'Saved Jobs'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.savedJobs ?? 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3px] p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t?.('dashboard.jobSeeker.stats.messages') || 'Unread Messages'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.unreadMessages ?? 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-[3px] border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t?.('dashboard.jobSeeker.recentApplications') || 'Recent Applications'}</h2>
          </div>
          {statsLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : stats?.recentApplications?.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {stats.recentApplications.map((app) => (
                <div key={app.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold text-sm">
                    {(app.business_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{app.business_name}</p>
                    <p className="text-xs text-gray-500">{app.position}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>{t?.('dashboard.jobSeeker.noApplications') || 'No applications yet. Start applying to jobs!'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Service provider dashboard (salon_owner / mobile_service)
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
              <p className="text-sm text-gray-500">{t?.('dashboard.stats.todayAppointments') || "Today's Bookings"}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.todayBookings ?? 0)}
              </p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? <span className="inline-block w-16 h-7 bg-gray-200 rounded animate-pulse" /> : `${stats?.weeklyRevenue ?? 0} MAD`}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {businessCategory === 'mobile_service' ? (
          <>
            <div className="bg-white rounded-[3px] p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t?.('dashboard.stats.serviceArea') || 'Service Area'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (
                      <>
                        {stats?.serviceArea ?? 0}
                        <span className="text-sm font-normal text-gray-500 ml-1">{t?.('dashboard.stats.cities') || 'cities'}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[3px] p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t?.('dashboard.stats.travelEarnings') || 'Travel Earnings'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statsLoading ? <span className="inline-block w-16 h-7 bg-gray-200 rounded animate-pulse" /> : `${stats?.travelEarnings ?? 0} MAD`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-[3px] p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t?.('dashboard.stats.totalClients') || 'Total Clients'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.totalClients ?? 0)}
                  </p>
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
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.rating ? `${stats.rating} ★` : 'N/A')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Upcoming Bookings */}
      <div className="bg-white rounded-[3px] border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t?.('dashboard.upcomingAppointments') || 'Upcoming Bookings'}</h2>
        </div>
        {statsLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : stats?.upcomingBookings?.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {stats.upcomingBookings.map((booking) => {
              const startDate = new Date(booking.start_time);
              const timeStr = startDate.toLocaleTimeString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateStr = startDate.toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              return (
                <div key={booking.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold text-sm">
                    {(booking.client_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{booking.client_name}</p>
                    <p className="text-xs text-gray-500">{booking.service}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-900">{timeStr}</p>
                    <p className="text-xs text-gray-500">{dateStr}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>{t?.('dashboard.noUpcomingAppointments') || 'No upcoming bookings'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
