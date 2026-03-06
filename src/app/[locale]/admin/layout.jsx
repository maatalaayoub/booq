'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({ children }) {
  const { isRTL } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'en';
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch('/api/admin/check');
        if (res.ok) {
          setAuthorized(true);
        } else {
          router.replace(`/${locale}`);
        }
      } catch {
        router.replace(`/${locale}`);
      } finally {
        setChecking(false);
      }
    }
    verify();
  }, [router, locale]);

  if (checking) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${isRTL ? 'rtl' : 'ltr'}`}>
        <aside className={`hidden lg:block fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} bg-white ${isRTL ? 'border-l' : 'border-r'} border-gray-200 z-40 w-16`}>
          <div className="flex flex-col h-full px-3 py-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </aside>
        <div className={`flex flex-col min-h-screen ${isRTL ? 'lg:mr-16' : 'lg:ml-16'}`}>
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="px-4 lg:px-8">
              <div className="flex items-center justify-between py-4">
                <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="w-9 h-9 bg-gray-100 rounded-full animate-pulse" />
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

  if (!authorized) return null;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-x-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      <AdminSidebar />
      <div className={`flex flex-col min-h-screen overflow-x-hidden ${isRTL ? 'lg:mr-16' : 'lg:ml-16'}`}>
        <AdminHeader />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
