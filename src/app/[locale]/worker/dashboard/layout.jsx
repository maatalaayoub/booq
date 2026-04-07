'use client';

import { useAuthUser } from '@/hooks/useAuthUser';
import { useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkerProvider, useWorker } from '@/contexts/WorkerContext';
import WorkerSidebar from '@/components/worker/WorkerSidebar';
import WorkerHeader from '@/components/worker/WorkerHeader';

function WorkerDashboardShell({ children }) {
  const { isRTL } = useLanguage();
  const { memberships, activeMembership, permissions, loading, switchBusiness } = useWorker();
  const { isLoaded, user } = useAuthUser();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale || 'en';

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !user) {
      router.replace(`/${locale}/auth/business/sign-in`);
    }
  }, [isLoaded, user, router, locale]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Loading skeleton
  if (!isLoaded || loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className={`flex flex-col min-h-screen ${isRTL ? 'lg:mr-16' : 'lg:ml-16'}`}>
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="px-4 lg:px-8">
              <div className="flex items-center justify-between py-4">
                <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
                <div className="w-32 h-10 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // No memberships — show empty state
  if (memberships.length === 0) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-center px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👷</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isRTL ? 'لا توجد عضوية في أي فريق' : 'No Team Memberships'}
          </h2>
          <p className="text-gray-500 mb-6">
            {isRTL ? 'لم تتم دعوتك لأي فريق عمل بعد' : "You haven't been added to any team yet."}
          </p>
          <button
            onClick={() => router.push(`/${locale}`)}
            className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#b8962e] text-white rounded-lg font-medium transition-colors"
          >
            {isRTL ? 'العودة للرئيسية' : 'Go Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-x-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      <WorkerSidebar permissions={permissions} />
      <div className={`flex flex-col min-h-screen overflow-x-hidden ${isRTL ? 'lg:mr-16' : 'lg:ml-16'}`}>
        <WorkerHeader />
        <main className="flex-1 p-6 pt-[calc(1.5rem+64px)]">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function WorkerDashboardLayout({ children }) {
  return (
    <WorkerProvider>
      <WorkerDashboardShell>{children}</WorkerDashboardShell>
    </WorkerProvider>
  );
}
