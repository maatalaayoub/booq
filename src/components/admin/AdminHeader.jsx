'use client';

import { useAuthUser } from '@/hooks/useAuthUser';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import Link from 'next/link';

export default function AdminHeader() {
  const { user } = useAuthUser();
  const params = useParams();
  const locale = params.locale || 'en';
  const { t, isRTL } = useLanguage();

  const handleOpenSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 lg:px-8">
        <nav dir="ltr" className={`flex items-center justify-between py-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button onClick={handleOpenSidebar} className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            <Link href={`/${locale}/admin`} className="flex items-center">
              <img src="/images/booka(dark).png" alt="Booka.ma" className="h-8 md:h-10 w-auto" />
            </Link>
          </div>

          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {user && (
              <div className="w-9 h-9 rounded-full ring-2 ring-[#364153]/30 overflow-hidden">
                <img src={user.imageUrl} alt={user.firstName || 'Admin'} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
