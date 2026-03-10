'use client';

import { Suspense, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, usePathname } from 'next/navigation';
import RoleSetupHandler from '@/components/RoleSetupHandler';
import BottomNavigation from '@/components/BottomNavigation';

// Pages where bottom navigation is hidden
const excludedPaths = ['/admin', '/business/dashboard', '/auth'];

export default function LocaleLayout({ children }) {
  const params = useParams();
  const pathname = usePathname();
  const { changeLanguage, locale } = useLanguage();
  
  // Check if bottom nav is visible on current path
  const showBottomNav = !excludedPaths.some(path => pathname?.includes(path));
  
  useEffect(() => {
    const urlLocale = params?.locale;
    if (urlLocale && ['en', 'fr', 'ar'].includes(urlLocale)) {
      // Set document direction and font class based on locale
      if (typeof document !== 'undefined') {
        if (urlLocale === 'ar') {
          document.documentElement.dir = 'rtl';
          document.documentElement.lang = 'ar';
          document.documentElement.classList.remove('locale-latin');
          document.documentElement.classList.add('locale-arabic');
        } else {
          document.documentElement.dir = 'ltr';
          document.documentElement.lang = urlLocale;
          document.documentElement.classList.add('locale-latin');
          document.documentElement.classList.remove('locale-arabic');
        }
      }
    }
  }, [params?.locale]);
  
  return (
    <>
      <Suspense fallback={null}>
        <RoleSetupHandler />
      </Suspense>
      <div className={showBottomNav ? 'pb-16 md:pb-0' : ''}>
        {children}
      </div>
      <BottomNavigation />
    </>
  );
}
