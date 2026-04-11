'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  UsersRound,
  Tag,
  DollarSign,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Globe,
  ShieldCheck,
  Building2,
  Navigation,
  UserCircle,
  FileText,
  Bookmark,
  MessageSquare,
  Video,
  Images,
} from 'lucide-react';

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { businessCategory, serviceMode, isLoading: isCategoryLoading } = useBusinessCategory();

  // Listen for toggle event from header
  useEffect(() => {
    const handleToggle = () => setMobileOpen(true);
    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggle);
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications?countOnly=true');
        if (res.ok) {
          const data = await res.json();
          setNotificationCount(data.unreadCount || 0);
        }
      } catch { /* silent */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale || 'en';
  const { t, isRTL } = useLanguage();

  const allMenuItems = [
    { 
      icon: LayoutDashboard, 
      label: t('dashboard.sidebar.overview') || 'Overview', 
      href: `/${locale}/business/dashboard`,
      categories: ['business_owner', 'mobile_service', 'job_seeker'],
    },
    { 
      icon: Calendar, 
      label: t('dashboard.sidebar.appointments') || 'Bookings', 
      href: `/${locale}/business/dashboard/appointments`,
      categories: ['business_owner', 'mobile_service'],
      excludeServiceModes: ['walkin'],
    },
    { 
      icon: Clock, 
      label: t('dashboard.sidebar.schedule') || 'Schedule', 
      href: `/${locale}/business/dashboard/schedule`,
      categories: ['business_owner', 'mobile_service'],
      excludeServiceModes: ['walkin'],
    },
    { 
      icon: Users, 
      label: t('dashboard.sidebar.clients') || 'Clients', 
      href: `/${locale}/business/dashboard/clients`,
      categories: ['business_owner', 'mobile_service'],
    },
    { 
      icon: Tag, 
      label: t('dashboard.sidebar.services') || 'Services & Prices', 
      href: `/${locale}/business/dashboard/services`,
      categories: ['business_owner', 'mobile_service'],
    },
    { 
      icon: UsersRound, 
      label: t('dashboard.sidebar.team') || 'Team', 
      href: `/${locale}/business/dashboard/team`,
      categories: ['business_owner', 'mobile_service'],
    },
    { 
      icon: Building2, 
      label: t('dashboard.sidebar.businessDetails') || 'Business Details', 
      href: `/${locale}/business/dashboard/business-details`,
      categories: ['business_owner', 'mobile_service'],
    },
    { 
      icon: UserCircle, 
      label: t('dashboard.sidebar.myProfile') || 'My Profile', 
      href: `/${locale}/business/dashboard/my-profile`,
      categories: ['job_seeker'],
    },
    { 
      icon: FileText, 
      label: t('dashboard.sidebar.myApplications') || 'My Applications', 
      href: `/${locale}/business/dashboard/my-applications`,
      categories: ['job_seeker'],
    },
    { 
      icon: Bookmark, 
      label: t('dashboard.sidebar.savedJobs') || 'Saved Jobs', 
      href: `/${locale}/business/dashboard/saved-jobs`,
      categories: ['job_seeker'],
    },
    { 
      icon: MessageSquare, 
      label: t('dashboard.sidebar.messages') || 'Messages', 
      href: `/${locale}/business/dashboard/messages`,
      categories: ['job_seeker'],
    },
    { 
      icon: Video, 
      label: t('dashboard.sidebar.interviews') || 'Interviews', 
      href: `/${locale}/business/dashboard/interviews`,
      categories: ['job_seeker'],
    },
    { 
      icon: Globe, 
      label: t('dashboard.sidebar.publicPage') || 'Business Card', 
      href: `/${locale}/business/dashboard/public-page`,
      categories: ['business_owner', 'mobile_service'],
    },
    { 
      icon: Images, 
      label: t('dashboard.sidebar.gallery') || 'Gallery', 
      href: `/${locale}/business/dashboard/gallery`,
      categories: ['business_owner', 'mobile_service'],
    },
    { 
      icon: DollarSign, 
      label: t('dashboard.sidebar.earnings') || 'Earnings', 
      href: `/${locale}/business/dashboard/earnings`,
      categories: ['business_owner', 'mobile_service'],
    },
    { 
      icon: BarChart3, 
      label: t('dashboard.sidebar.analytics') || 'Analytics', 
      href: `/${locale}/business/dashboard/analytics`,
      categories: ['business_owner', 'mobile_service'],
    },
    { 
      icon: ShieldCheck, 
      label: t('dashboard.sidebar.verification') || 'Verification', 
      href: `/${locale}/business/dashboard/verification`,
      categories: ['business_owner', 'mobile_service'],
    },
    {
      icon: Navigation,
      label: t('dashboard.sidebar.serviceArea') || 'Service Area',
      href: `/${locale}/business/dashboard/service-area`,
      categories: ['mobile_service'],
    },
  ];

  const menuItems = isCategoryLoading
    ? []
    : allMenuItems.filter(
        (item) =>
          (!businessCategory || item.categories.includes(businessCategory)) &&
          (!item.excludeServiceModes || !item.excludeServiceModes.includes(serviceMode))
      );

  const bottomItems = [
    { 
      icon: Bell, 
      label: t('dashboard.sidebar.notifications') || 'Notifications', 
      href: `/${locale}/business/dashboard/notifications`,
      badge: notificationCount
    },
    { 
      icon: Settings, 
      label: t('dashboard.sidebar.settings') || 'Settings', 
      href: `/${locale}/business/dashboard/settings` 
    },
  ];

  const isActive = (href) => {
    if (href === `/${locale}/business/dashboard`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Desktop sidebar - collapsed by default, expanded on hover
  const isExpanded = isHovered;

  const SidebarContent = ({ forMobile = false }) => (
    <div className={`flex flex-col h-full overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={forMobile ? () => setMobileOpen(false) : undefined}
            className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors duration-200 ${
              isActive(item.href)
                ? 'bg-[#364153]/10 text-[#364153] font-semibold'
                : 'text-gray-700 hover:bg-[#364153]/5 hover:text-[#364153]'
            }`}
            title={(!forMobile && !isExpanded) ? item.label : undefined}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive(item.href) ? 'text-[#364153]' : 'text-gray-600'}`} />
            <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${
              (!forMobile && !isExpanded) ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              {item.label}
            </span>
          </Link>
        ))}
        
        {/* Notifications & Settings */}
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={forMobile ? () => setMobileOpen(false) : undefined}
            className={`flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors duration-200 ${
              isActive(item.href)
                ? 'bg-[#364153]/10 text-[#364153] font-semibold'
                : 'text-gray-700 hover:bg-[#364153]/5 hover:text-[#364153]'
            }`}
            title={(!forMobile && !isExpanded) ? item.label : undefined}
          >
            <div className="relative flex-shrink-0">
              <item.icon className={`w-5 h-5 ${isActive(item.href) ? 'text-[#364153]' : 'text-gray-600'}`} />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`font-medium text-sm whitespace-nowrap transition-all duration-300 ${
              (!forMobile && !isExpanded) ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 flex-1'
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
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-72 bg-white ${isRTL ? 'border-l' : 'border-r'} border-gray-200 z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${
          mobileOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-1 text-gray-400 hover:text-gray-600 z-50`}
        >
          <X className="w-6 h-6" />
        </button>
        <div className="pt-12 h-full">
          <SidebarContent forMobile={true} />
        </div>
      </aside>

      {/* Desktop Sidebar - Collapsed by default, expands on hover */}
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
