'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale || 'en';
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const handleToggle = () => setMobileOpen(true);
    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggle);
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: t('admin.sidebar.dashboard'), href: `/${locale}/admin` },
    { icon: Users, label: t('admin.sidebar.users'), href: `/${locale}/admin/users` },
    { icon: Building2, label: t('admin.sidebar.businesses'), href: `/${locale}/admin/businesses` },
    { icon: ShieldCheck, label: t('admin.sidebar.verifications'), href: `/${locale}/admin/verifications` },
  ];

  const isActive = (href) => {
    if (href === `/${locale}/admin`) return pathname === href;
    return pathname.startsWith(href);
  };

  const isExpanded = isHovered;

  const SidebarContent = ({ forMobile = false }) => (
    <div className={`flex flex-col h-full overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Brand */}
      <div className={`px-4 py-4 border-b border-gray-100 ${(!forMobile && !isExpanded) ? 'text-center' : ''}`}>
        <span className={`font-bold text-sm text-[#364153] ${(!forMobile && !isExpanded) ? 'hidden' : ''}`}>
          {t('admin.sidebar.title')}
        </span>
        <span className={`font-bold text-sm text-[#364153] ${(!forMobile && !isExpanded) ? '' : 'hidden'}`}>A</span>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={forMobile ? () => setMobileOpen(false) : undefined}
            className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors duration-200 ${
              isActive(item.href)
                ? 'bg-[#364153]/10 text-[#364153]'
                : 'text-[#364153]/70 hover:bg-[#364153]/5 hover:text-[#364153]'
            }`}
            title={(!forMobile && !isExpanded) ? item.label : undefined}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive(item.href) ? 'text-[#364153]' : 'text-[#364153]/50'}`} />
            <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${
              (!forMobile && !isExpanded) ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`lg:hidden fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-72 bg-white ${isRTL ? 'border-l' : 'border-r'} border-gray-200 z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
        mobileOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
      }`}>
        <button onClick={() => setMobileOpen(false)} className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-1 text-gray-400 hover:text-gray-600 z-50`}>
          <X className="w-6 h-6" />
        </button>
        <div className="pt-12 h-full">
          <SidebarContent forMobile={true} />
        </div>
      </aside>

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:block fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} bg-white ${isRTL ? 'border-l' : 'border-r'} border-gray-200 transition-all duration-300 ease-in-out z-40 overflow-hidden ${
          isExpanded ? 'w-64 shadow-xl' : 'w-16'
        }`}
      >
        <SidebarContent forMobile={false} />
      </aside>
    </>
  );
}
