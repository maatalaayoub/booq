'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Home, Settings, LogOut, Info, Mail, Shield, LayoutDashboard, ChevronRight, Calendar, Heart, Bell, Users, User
} from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthUser } from '@/hooks/useAuthUser';
import { createAuthClient } from '@/lib/supabase/auth-client';
import { useParams, usePathname } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import Link from 'next/link';

const languages = [
  { code: 'en', name: 'English', countryCode: 'GB' },
  { code: 'fr', name: 'Français', countryCode: 'FR' },
  { code: 'ar', name: 'العربية', countryCode: 'MA' },
];

export default function Sidebar({ isOpen, onClose }) {
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale || 'en';
  const { t, changeLanguage, isRTL } = useLanguage();
  const { user, isSignedIn, isLoaded: isAuthLoaded } = useAuthUser();
  const { isBusiness, isLoaded: isRoleLoaded } = useRole();
  const sideMenuRef = useRef(null);
  
  const [currentLang, setCurrentLang] = useState(
    languages.find(l => l.code === locale) || languages[0]
  );

  const isLoaded = isAuthLoaded && isRoleLoaded;
  const isHomePage = pathname === `/${locale}` || pathname === `/${locale}/`;

  const [unreadCount, setUnreadCount] = useState(0);
  const [isWorker, setIsWorker] = useState(false);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/notifications?countOnly=true');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent
    }
  }, [isSignedIn]);

  // Check if user is a team member (worker)
  const fetchWorkerStatus = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/worker/memberships');
      if (res.ok) {
        const data = await res.json();
        const memberships = Array.isArray(data) ? data : (data.data || []);
        setIsWorker(memberships.length > 0);
      }
    } catch {
      // silent
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isOpen && isSignedIn) {
      fetchUnreadCount();
      fetchWorkerStatus();
    }
  }, [isOpen, isSignedIn, fetchUnreadCount, fetchWorkerStatus]);

  // Sync currentLang with locale
  useEffect(() => {
    const lang = languages.find(l => l.code === locale);
    if (lang) setCurrentLang(lang);
  }, [locale]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sideMenuRef.current && !sideMenuRef.current.contains(event.target) && isOpen) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Side Panel */}
          <motion.div
            ref={sideMenuRef}
            initial={{ x: isRTL ? '100%' : '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? '100%' : '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-screen w-full md:w-[320px] md:max-w-[85vw] bg-white shadow-2xl z-[60] flex flex-col`}
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-end p-4 shrink-0">
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4">
              {/* Auth Buttons - Only show when NOT signed in */}
              {!isLoaded ? (
                <div className="py-4 px-2">
                  <div className="flex-1 h-10 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              ) : !isSignedIn && (
                <div className="flex flex-col gap-3 px-2 mb-4">
                  <div className="flex gap-3">
                    <Link 
                      href={`/${locale}/auth/user/sign-in`}
                      onClick={onClose}
                      className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold text-[#0F172A] transition-all hover:border-[#D4AF37]"
                    >
                      {t('login')}
                    </Link>
                    <Link 
                      href={`/${locale}/auth/user/sign-up`}
                      onClick={onClose}
                      className="flex-1 rounded-full bg-[#0F172A] px-4 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-[#1E293B]"
                    >
                      {t('signUp')}
                    </Link>
                  </div>
                  <Link 
                    href={`/${locale}/auth/business/sign-up`}
                    onClick={onClose}
                    className="flex items-center justify-center w-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] px-4 py-3 text-sm font-semibold text-[#0F172A] transition-all hover:brightness-110"
                  >
                    {t('barberSpace')}
                  </Link>
                </div>
              )}

              {/* Profile Section */}
              {isLoaded && isSignedIn && user && (
                <div className="mb-4">
                  <div className="rounded-[5px] bg-white border border-gray-300 overflow-hidden">
                    {/* Profile Link */}
                    <Link
                      href={isBusiness ? `/${locale}/business/profile` : `/${locale}/profile`}
                      onClick={onClose}
                      className="block p-4 hover:bg-gray-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-gray-300">
                            {user.imageUrl ? (
                              <img 
                                src={user.imageUrl} 
                                alt={user.firstName || 'Profile'} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-[#D4AF37] to-[#B8963A] flex items-center justify-center">
                                {user.firstName ? (
                                  <span className="text-lg font-bold text-white">
                                    {user.firstName.charAt(0).toUpperCase()}
                                  </span>
                                ) : (
                                  <User className="w-6 h-6 text-white" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-sm">
                            {user.firstName} {user.lastName}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </Link>
                    
                    {/* Divider */}
                    <div className="h-px bg-gray-200 mx-4" />
                    
                    {/* Logout Button */}
                    <button
                      onClick={async () => {
                        await createAuthClient().auth.signOut();
                        window.location.href = `/${locale}`;
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50/50 transition-all group"
                    >
                      <LogOut className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                      <span className="text-sm font-medium">{t('signOut') || 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Home Button */}
              <Link
                href={`/${locale}`}
                onClick={onClose}
                className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl transition-all ${
                  isHomePage 
                    ? 'bg-[#244C70]/10 text-[#244C70]' 
                    : 'text-[#244C70] hover:bg-gray-50'
                }`}
              >
                <Home className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                <span className="font-medium text-base">{t('home') || 'Home'}</span>
              </Link>

              {/* Notifications */}
              {isLoaded && isSignedIn && (
                <Link
                  href={`/${locale}/notifications`}
                  onClick={onClose}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl transition-all text-[#244C70] hover:bg-gray-50"
                >
                  <div className="relative">
                    <Bell className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] flex items-center justify-center px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-base">{t('notifications') || 'Notifications'}</span>
                </Link>
              )}

              {/* My Bookings */}
              <Link
                href={`/${locale}/bookings`}
                onClick={onClose}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl transition-all text-[#244C70] hover:bg-gray-50"
              >
                <Calendar className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                <span className="font-medium text-base">{t('bookings.title') || 'My Bookings'}</span>
              </Link>

              {/* Favorites - hidden on small devices, shown in bottom nav */}
              <Link
                href={`/${locale}/favorites`}
                onClick={onClose}
                className="hidden md:flex items-center gap-3 w-full px-4 py-3.5 rounded-xl transition-all text-[#244C70] hover:bg-gray-50"
              >
                <Heart className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                <span className="font-medium text-base">{t('favorites') || 'Favorites'}</span>
              </Link>

              {/* Divider */}
              <div className="h-px bg-gray-200 my-4" />

              {/* Quick Actions Section */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                {t('quickActions') || 'Quick Actions'}
              </p>

              <div className="space-y-1">
                {/* Dashboard - Only for business users */}
                {isLoaded && isBusiness && (
                  <Link
                    href={`/${locale}/business/dashboard`}
                    onClick={onClose}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] transition-all hover:bg-gray-50"
                  >
                    <LayoutDashboard className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                    <span className="font-medium text-base">{t('dashboard') || 'Dashboard'}</span>
                    <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-[#244C70] text-white rounded-full">PRO</span>
                  </Link>
                )}

                {/* Worker Dashboard - For team members */}
                {isLoaded && isWorker && !isBusiness && (
                  <Link
                    href={`/${locale}/worker/dashboard`}
                    onClick={onClose}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] transition-all hover:bg-gray-50"
                  >
                    <Users className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                    <span className="font-medium text-base">{t('worker.dashboard') || 'Worker Dashboard'}</span>
                    <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-[#D4AF37] text-white rounded-full">PRO</span>
                  </Link>
                )}

                {/* Settings */}
                <button
                  onClick={onClose}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70]/50 transition-all cursor-default"
                  disabled
                >
                  <Settings className="h-5 w-5 text-[#244C70]/50" strokeWidth={1.5} />
                  <span className="font-medium text-base">{t('settings') || 'Settings'}</span>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold bg-gray-200 text-gray-500 rounded-full">{t('comingSoon') || 'Soon'}</span>
                </button>

                {/* About */}
                <button
                  onClick={onClose}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70]/50 transition-all cursor-default"
                  disabled
                >
                  <Info className="h-5 w-5 text-[#244C70]/50" strokeWidth={1.5} />
                  <span className="font-medium text-base">{t('about') || 'About'}</span>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold bg-gray-200 text-gray-500 rounded-full">{t('comingSoon') || 'Soon'}</span>
                </button>

                {/* Contact */}
                <Link
                  href={`/${locale}/contact`}
                  onClick={onClose}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] hover:bg-[#244C70]/5 transition-all"
                >
                  <Mail className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                  <span className="font-medium text-base">{t('contact') || 'Contact'}</span>
                </Link>

                {/* Privacy Policy */}
                <button
                  onClick={onClose}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70]/50 transition-all cursor-default"
                  disabled
                >
                  <Shield className="h-5 w-5 text-[#244C70]/50" strokeWidth={1.5} />
                  <span className="font-medium text-base">{t('privacyPolicy') || 'Privacy Policy'}</span>
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold bg-gray-200 text-gray-500 rounded-full">{t('comingSoon') || 'Soon'}</span>
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-200 my-4" />

              {/* Language Selector */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
                {t('language') || 'Language'}
              </p>
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-full mb-4">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setCurrentLang(lang);
                      changeLanguage(lang.code);
                    }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 px-3 text-sm font-medium transition-all ${
                      currentLang.code === lang.code 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ReactCountryFlag 
                      countryCode={lang.countryCode} 
                      svg 
                      style={{ width: '1.1em', height: '1.1em' }}
                    />
                    <span>{lang.code.toUpperCase()}</span>
                  </button>
                ))}
              </div>

              {/* Copyright */}
              <div className="px-4 py-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 text-center">© 2026 Booka.ma. All rights reserved.</p>
              </div>

              {/* Bottom padding for mobile navigation */}
              <div className="h-20 shrink-0" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
