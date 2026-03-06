'use client';

import { useUser } from '@clerk/nextjs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams } from 'next/navigation';
import { Menu, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AdminHeader() {
  const { user } = useUser();
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
            <Link href={`/${locale}/admin`} className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#364153]" />
              <span className="font-bold text-[#364153]">{t('admin.header.title')}</span>
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
