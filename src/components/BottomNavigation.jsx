'use client';

import { motion } from 'framer-motion';
import { Home, Heart, Calendar, MapPinned, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

const navItems = [
  { id: 'menu', icon: Menu, labelKey: 'navMenu', href: null, action: 'openSidebar' },
  { id: 'favorite', icon: Heart, labelKey: 'navFavorite', href: '/favorites' },
  { id: 'booking', icon: Calendar, labelKey: 'navBooking', href: '/bookings' },
  { id: 'map', icon: MapPinned, labelKey: 'navMap', href: '/search' },
  { id: 'home', icon: Home, labelKey: 'navHome', href: '' },
];

const defaultLabels = {
  navHome: 'Home',
  navFavorite: 'Favorite',
  navBooking: 'Bookings',
  navMap: 'Map',
  navMenu: 'Menu',
};

// Pages where bottom navigation should be hidden
const excludedPaths = [
  '/admin',
  '/business/dashboard',
  '/auth',
  '/b/',
  '/profile',
  '/business/profile',
];

export default function BottomNavigation() {
  const pathname = usePathname();
  const { t, locale } = useLanguage();
  
  // Check if current path should hide navigation
  const shouldHide = excludedPaths.some(path => pathname?.includes(path));
  
  if (shouldHide) return null;
  
  const getActiveTab = () => {
    if (pathname === `/${locale}` || pathname === `/${locale}/`) return 'home';
    if (pathname?.includes('/favorites')) return 'favorite';
    if (pathname?.includes('/bookings')) return 'booking';
    if (pathname?.includes('/map') || pathname?.includes('/search')) return 'map';
    if (pathname?.includes('/profile')) return null;
    return 'home';
  };
  
  const activeTab = getActiveTab();

  // Reverse order for English and French (LTR languages)
  const displayItems = locale === 'ar' ? navItems : [...navItems].reverse();

  const handleNavClick = (item, e) => {
    if (item.action === 'openSidebar') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('toggle-home-sidebar'));
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg sd:hidden overflow-visible">
      <div className="flex items-center justify-around h-16 px-2 overflow-visible">
        {displayItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const label = t(item.labelKey) || defaultLabels[item.labelKey];
          const href = item.href !== null ? (item.href ? `/${locale}${item.href}` : `/${locale}`) : '#';
          
          return (
            <Link
              key={item.id}
              href={href}
              onClick={(e) => handleNavClick(item, e)}
              className="relative flex flex-col items-center justify-center flex-1 h-full group"
            >
              <motion.div
                className="flex flex-col items-center justify-center"
                whileTap={{ scale: 0.9 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-0.5 w-12 h-1 bg-[#244C70] rounded-full"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div
                  className={`p-1.5 rounded-xl transition-colors duration-200 ${
                    isActive 
                      ? 'text-[#244C70]' 
                      : 'text-[#244C70]/70'
                  }`}
                >
                  <Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className={isActive ? 'fill-[#244C70]/20' : ''}
                  />
                </div>
                <span
                  className={`text-xs font-medium transition-colors duration-200 ${
                    isActive 
                      ? 'text-[#244C70] mt-0.5' 
                      : 'text-[#244C70]/70 mt-0.5'
                  }`}
                >
                  {label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
      
      {/* Safe area for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}
