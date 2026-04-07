'use client';

import { useAuthUser } from '@/hooks/useAuthUser';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams } from 'next/navigation';
import { Menu, User } from 'lucide-react';
import Link from 'next/link';
import { useUserProfile } from '@/hooks/useUserProfile';
import NotificationPopup from '@/components/NotificationPopup';

export default function WorkerHeader() {
  const { user } = useAuthUser();
  const params = useParams();
  const locale = params.locale || 'en';
  const { t, isRTL } = useLanguage();
  const { profile } = useUserProfile({ refetchOnFocus: true, refetchOnProfileUpdate: true });

  const profileImage = profile?.profileImageUrl || (user?.hasImage ? user.imageUrl : null);

  const handleOpenSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
  };

  return (
    <header className={`bg-white border-b border-gray-200 fixed top-0 z-30 right-0 left-0 ${isRTL ? 'lg:right-16' : 'lg:left-16'}`}>
      <div className="px-4 lg:px-8">
        <nav dir="ltr" className={`flex items-center justify-between py-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Left Section */}
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={handleOpenSidebar}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Logo */}
            <Link
              href={`/${locale}`}
              className="flex items-center"
            >
              <img src="/images/booka(dark).png" alt="Booka.ma" width={140} height={42} className="h-8 md:h-10 w-auto" />
            </Link>
          </div>

          {/* Right Section */}
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <NotificationPopup
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              iconSize="w-5 h-5"
            />

            {user && (
              <Link
                href={`/${locale}/profile`}
                className="rounded-full transition-all cursor-pointer hover:ring-2 hover:ring-[#D4AF37]/30"
              >
                <div className="w-9 h-9 rounded-full ring-2 ring-[#D4AF37]/50 overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#D4AF37] to-[#B8963A] flex items-center justify-center">
                      {user?.firstName ? (
                        <span className="text-sm font-bold text-white">{user.firstName.charAt(0).toUpperCase()}</span>
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
