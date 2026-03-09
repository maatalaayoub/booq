'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Map, Menu, X, ChevronDown, Globe, User, LayoutDashboard, Settings, Scissors, Home, LogOut, Info, Mail, Shield, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ReactCountryFlag from 'react-country-flag';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser, SignOutButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';

const languages = [
  { code: 'en', name: 'English', countryCode: 'GB' },
  { code: 'fr', name: 'Français', countryCode: 'FR' },
  { code: 'ar', name: 'العربية', countryCode: 'MA' },
];

export default function Hero() {
  const { t, locale, changeLanguage } = useLanguage();
  const { isSignedIn, user, isLoaded: isClerkLoaded } = useUser();
  const { role: userRole, isBusiness, isLoaded: isRoleLoaded } = useRole();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSideMenuOpen, setIsDesktopSideMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(languages[0]);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuToggleRef = useRef(null);
  const desktopSideMenuRef = useRef(null);
  
  // Combined loaded state - both Clerk and role data must be loaded
  const isLoaded = isClerkLoaded && isRoleLoaded;
  
  // Dashboard URL for business users only
  const dashboardUrl = `/${locale}/business/dashboard`;
  
  // Debug logging
  useEffect(() => {
    console.log('[Hero] Auth state:', { isLoaded, isSignedIn, isBusiness, userRole, isRoleLoaded });
  }, [isLoaded, isSignedIn, isBusiness, userRole, isRoleLoaded]);
  
  // Mobile service rotating text state
  const [mobileServiceIndex, setMobileServiceIndex] = useState(0);
  const mobileServices = [
    t('mobileService1') || 'Barbering',
    t('mobileService2') || 'Hair Styling',
    t('mobileService3') || 'Beauty',
  ];
  
  // Learn service rotating text state
  const [learnServiceIndex, setLearnServiceIndex] = useState(0);
  const learnServices = [
    t('learnService1') || 'Barbering',
    t('learnService2') || 'Hair Styling',
    t('learnService3') || 'Beauty',
  ];
  
  // Mobile service rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setMobileServiceIndex((prev) => (prev + 1) % mobileServices.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mobileServices.length]);
  
  // Learn service rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setLearnServiceIndex((prev) => (prev + 1) % learnServices.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [learnServices.length]);
  
  // Typewriter effect state
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [targetLength, setTargetLength] = useState(0);

  // Get rotating sentences
  const getRotatingSentences = () => [
    t('heroRotating1'),
    t('heroRotating2'),
    t('heroRotating3'),
    t('heroRotating4'),
    t('heroRotating5'),
  ];

  // Helper to find common prefix length between two strings
  const getCommonPrefixLength = (str1, str2) => {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return i;
  };

  // Typewriter effect
  useEffect(() => {
    const sentences = getRotatingSentences();
    const currentSentence = sentences[currentSentenceIndex];
    const nextSentenceIndex = (currentSentenceIndex + 1) % sentences.length;
    const nextSentence = sentences[nextSentenceIndex];
    const commonPrefixLength = getCommonPrefixLength(currentSentence, nextSentence);

    if (isTyping) {
      if (displayedText.length < currentSentence.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentSentence.slice(0, displayedText.length + 1));
        }, 40); // Typing speed
        return () => clearTimeout(timeout);
      } else {
        // Finished typing, wait 1.5s before erasing
        const timeout = setTimeout(() => {
          setTargetLength(commonPrefixLength);
          setIsTyping(false);
        }, 1500); // Display duration (1.5s)
        return () => clearTimeout(timeout);
      }
    } else {
      if (displayedText.length > targetLength) {
        const timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, 25); // Erasing speed (faster)
        return () => clearTimeout(timeout);
      } else {
        // Move to next sentence and start typing
        setCurrentSentenceIndex(nextSentenceIndex);
        setIsTyping(true);
      }
    }
  }, [displayedText, isTyping, currentSentenceIndex, targetLength, locale]);

  // Reset when language changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentSentenceIndex(0);
    setIsTyping(true);
    setTargetLength(0);
  }, [locale]);

  // Sync currentLang with locale
  useEffect(() => {
    const lang = languages.find(l => l.code === locale);
    if (lang) setCurrentLang(lang);
  }, [locale]);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideMenu = mobileMenuRef.current && !mobileMenuRef.current.contains(event.target);
      const isOutsideToggle = mobileMenuToggleRef.current && !mobileMenuToggleRef.current.contains(event.target);
      if (isOutsideMenu && isOutsideToggle && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Close desktop side menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (desktopSideMenuRef.current && !desktopSideMenuRef.current.contains(event.target) && isDesktopSideMenuOpen) {
        setIsDesktopSideMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDesktopSideMenuOpen]);

  // Listen for toggle-home-sidebar event from bottom navigation
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsMobileMenuOpen(prev => !prev);
    };
    window.addEventListener('toggle-home-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-home-sidebar', handleToggleSidebar);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-[#14B8A6]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-60 w-60 rounded-full bg-[#D4AF37]/5 blur-2xl" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      <div className="relative w-full px-6 sm:px-8 lg:px-8">
        <nav dir="ltr" className="flex items-center justify-between py-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            {/* Drawer icon - Show only when signed in on desktop (LTR languages) */}
            {isLoaded && isSignedIn && locale !== 'ar' && (
              <button
                onClick={() => setIsDesktopSideMenuOpen(!isDesktopSideMenuOpen)}
                className="hidden md:flex h-10 w-10 items-center justify-center rounded-[10px] bg-gray-800/50 text-gray-300 transition-all hover:bg-gray-700 hover:text-white"
                aria-label={t('menu') || 'Menu'}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <Image 
              src="/images/white-logo.png" 
              alt="Booq" 
              width={200} 
              height={50}
              className="h-8 md:h-11 w-auto"
              priority
            />
          </motion.div>
          
          {/* Mobile Menu Button & Icons */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Show Dashboard button only for barbers */}
            {isLoaded && isSignedIn && isBusiness && (
              <a
                href={dashboardUrl}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-[90px] border border-white bg-transparent text-white transition-all hover:bg-white/10 hover:scale-105"
                aria-label={t('dashboard') || 'Dashboard'}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">{t('dashboard') || 'Dashboard'}</span>
              </a>
            )}
          </div>
          
          {/* Desktop Navigation */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden items-center md:flex"
          >
            {/* Navigation Links - Only show when NOT signed in */}
            {!isSignedIn && (
              <>
                <div className="flex items-center gap-6 mr-6">
                  <a href="#features" className="text-sm text-gray-300 transition-colors hover:text-[#D4AF37]">{t('features')}</a>
                  <a href="#how-it-works" className="text-sm text-gray-300 transition-colors hover:text-[#D4AF37]">{t('howItWorks')}</a>
                  <a href="#app" className="text-sm text-gray-300 transition-colors hover:text-[#D4AF37]">{t('app')}</a>
                </div>
                
                {/* Divider */}
                <div className="h-6 w-px bg-gray-600 mr-6" />
              </>
            )}
            
            {/* Auth Buttons Group */}
            <div className="flex items-center gap-6 mr-4">
              {!isLoaded ? (
                // Loading state
                <div className="w-24 h-10 bg-gray-800/50 rounded-[15px] animate-pulse" />
              ) : isSignedIn ? (
                // Signed in state
                <>
                  {/* Dashboard button - Show only for barbers */}
                  {isBusiness && (
                    <a 
                      href={dashboardUrl}
                      className="flex items-center gap-2 px-5 py-2 rounded-[90px] border border-white bg-transparent text-white transition-all hover:bg-white/10 hover:scale-105"
                      aria-label={t('dashboard') || 'Dashboard'}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="text-sm font-semibold">{t('dashboard') || 'Dashboard'}</span>
                    </a>
                  )}

                  {/* Profile Button - Direct Link */}
                  <Link
                    href={isBusiness ? `/${locale}/business/profile` : `/${locale}/profile`}
                    className="relative flex items-center justify-center p-0.5 rounded-full border-2 border-white/20 transition-all hover:border-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] focus:outline-none"
                  >
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-800">
                      <img 
                        src={user?.imageUrl} 
                        alt={user?.firstName || 'Profile'} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </Link>
                  {/* Drawer icon - Show only for Arabic (RTL) on right side */}
                  {locale === 'ar' && (
                    <button
                      onClick={() => setIsDesktopSideMenuOpen(!isDesktopSideMenuOpen)}
                      className="hidden md:flex h-10 w-10 items-center justify-center rounded-[10px] bg-gray-800/50 text-gray-300 transition-all hover:bg-gray-700 hover:text-white"
                      aria-label={t('menu') || 'Menu'}
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                  )}
                </>
              ) : (
                // Signed out state - show login/signup buttons
                <>
                  <a 
                    href={`/${locale}/auth/business/sign-in`}
                    className="flex items-center gap-2 rounded-[15px] border-2 border-[#D4AF37] bg-transparent px-4 py-2 text-sm font-medium text-[#D4AF37] transition-all hover:bg-[#D4AF37]/10"
                  >
                    <Scissors className="h-4 w-4" />
                    {t('barberSpace')}
                  </a>
                  
                  <a 
                    href={`/${locale}/auth/user/sign-in`}
                    className="rounded-[15px] border border-gray-500 bg-transparent px-4 py-2 text-sm font-medium text-gray-300 transition-all hover:border-white hover:bg-white/5 hover:text-white"
                  >
                    {t('login')}
                  </a>
                  
                  <a 
                    href={`/${locale}/auth/user/sign-up`}
                    className="rounded-[15px] border-2 border-[#D4AF37] bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] px-5 py-2 text-sm font-semibold text-[#0F172A] transition-all hover:scale-105"
                  >
                    {t('signUp')}
                  </a>
                </>
              )}
            </div>

            {/* Language Selector - Only show when NOT signed in */}
            {!isSignedIn && (
              <div className="relative ml-2" ref={langRef}>
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex h-10 items-center gap-2 rounded-[15px] bg-gray-800/50 px-3 text-sm text-gray-300 transition-all hover:bg-gray-700"
                >
                  <ReactCountryFlag 
                    countryCode={currentLang.countryCode} 
                    svg 
                    style={{ width: '1.2em', height: '1.2em' }}
                  />
                  <span className="hidden lg:inline">{currentLang.code.toUpperCase()}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isLangOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-12 z-50 min-w-[160px] overflow-hidden rounded-[10px] border border-gray-700 bg-[#1E293B]" 
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setCurrentLang(lang);
                            changeLanguage(lang.code);
                            setIsLangOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-700 ${
                            currentLang.code === lang.code ? 'bg-gray-700/50 text-[#D4AF37]' : 'text-gray-300'
                          }`}
                        >
                          <ReactCountryFlag 
                            countryCode={lang.countryCode} 
                            svg 
                            style={{ width: '1.2em', height: '1.2em' }}
                          />
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </nav>

        {/* Desktop Side Menu */}
        <AnimatePresence>
          {isDesktopSideMenuOpen && isSignedIn && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] hidden md:block"
                onClick={() => setIsDesktopSideMenuOpen(false)}
              />
              {/* Side Panel - Clean Professional Design */}
              <motion.div
                ref={desktopSideMenuRef}
                initial={{ x: locale === 'ar' ? '100%' : '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: locale === 'ar' ? '100%' : '-100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`fixed top-0 ${locale === 'ar' ? 'right-0' : 'left-0'} h-screen w-[320px] bg-white shadow-2xl z-[60] hidden md:flex flex-col`}
              >
                {/* Header with Close Button */}
                <div className="flex items-center justify-end p-4 shrink-0">
                  <button
                    onClick={() => setIsDesktopSideMenuOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4">
                  {/* Profile Section */}
                  {user && (
                    <div className="mb-4">
                      <div className="rounded-[5px] bg-white border border-gray-300 overflow-hidden">
                        {/* Profile Link */}
                        <a
                          href={isBusiness ? `/${locale}/business/profile` : `/${locale}/profile`}
                          onClick={() => setIsDesktopSideMenuOpen(false)}
                          className="block p-4 hover:bg-gray-50 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-gray-300">
                                <img 
                                  src={user.imageUrl} 
                                  alt={user.firstName || 'Profile'} 
                                  className="h-full w-full object-cover"
                                />
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
                        </a>
                        
                        {/* Divider */}
                        <div className="h-px bg-gray-200 mx-4" />
                        
                        {/* Logout Button */}
                        <SignOutButton redirectUrl={`/${locale}`}>
                          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50/50 transition-all group">
                            <LogOut className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                            <span className="text-sm font-medium">{t('signOut') || 'Sign Out'}</span>
                          </button>
                        </SignOutButton>
                      </div>
                    </div>
                  )}

                  {/* Home Button */}
                  <a
                    href={`/${locale}`}
                    onClick={() => setIsDesktopSideMenuOpen(false)}
                    className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl bg-[#244C70]/10 text-[#244C70] transition-all"
                  >
                    <Home className="h-5 w-5" strokeWidth={2} />
                    <span className="font-semibold text-base">{t('home') || 'Home'}</span>
                  </a>

                  {/* Divider */}
                  <div className="h-px bg-gray-200 my-4" />

                  {/* Quick Actions Section */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                    {t('quickActions') || 'Quick Actions'}
                  </p>

                  <div className="space-y-1">
                    {/* Dashboard - Only for business users */}
                    {isBusiness && (
                      <a
                        href={`/${locale}/business/dashboard`}
                        onClick={() => setIsDesktopSideMenuOpen(false)}
                        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] transition-all hover:bg-gray-50"
                      >
                        <LayoutDashboard className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                        <span className="font-medium text-base">{t('dashboard') || 'Dashboard'}</span>
                        <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-[#244C70] text-white rounded-full">PRO</span>
                      </a>
                    )}

                    {/* Settings */}
                    <a
                      href={isBusiness ? `/${locale}/business/dashboard/settings` : `/${locale}/settings`}
                      onClick={() => setIsDesktopSideMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] transition-all hover:bg-gray-50"
                    >
                      <Settings className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                      <span className="font-medium text-base">{t('settings') || 'Settings'}</span>
                    </a>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-200 my-4" />

                  {/* Language Selector */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">{t('language') || 'Language'}</p>
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

                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              {/* Side Panel */}
              <motion.div
                ref={mobileMenuRef}
                initial={{ x: locale === 'ar' ? '100%' : '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: locale === 'ar' ? '100%' : '-100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`fixed top-0 ${locale === 'ar' ? 'right-0' : 'left-0'} h-screen w-full bg-white shadow-2xl z-[60] md:hidden flex flex-col`}
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
              >
                {/* Header with Close Button */}
                <div className="flex items-center justify-end p-4 shrink-0">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4">
                  {/* Profile Section - Only when signed in */}
                  {isLoaded && isSignedIn && user && (
                    <div className="mb-4">
                      <div className="rounded-[5px] bg-white border border-gray-300 overflow-hidden">
                        {/* Profile Link */}
                        <a
                          href={isBusiness ? `/${locale}/business/profile` : `/${locale}/profile`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block p-4 hover:bg-gray-50 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-gray-300">
                                <img 
                                  src={user.imageUrl} 
                                  alt={user.firstName || 'Profile'} 
                                  className="h-full w-full object-cover"
                                />
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
                        </a>
                        
                        {/* Divider */}
                        <div className="h-px bg-gray-200 mx-4" />
                        
                        {/* Logout Button */}
                        <SignOutButton redirectUrl={`/${locale}`}>
                          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50/50 transition-all group">
                            <LogOut className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                            <span className="text-sm font-medium">{t('signOut') || 'Sign Out'}</span>
                          </button>
                        </SignOutButton>
                      </div>
                    </div>
                  )}

                  {/* Home Button */}
                  <a
                    href={`/${locale}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl bg-[#244C70]/10 text-[#244C70] transition-all"
                  >
                    <Home className="h-5 w-5" strokeWidth={2} />
                    <span className="font-semibold text-base">{t('home') || 'Home'}</span>
                  </a>

                  {/* Divider */}
                  <div className="h-px bg-gray-200 my-4" />

                  {/* Quick Actions Section */}
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                    {t('quickActions') || 'Quick Actions'}
                  </p>

                  <div className="space-y-1">
                    {/* Dashboard - Only for business users */}
                    {isLoaded && isSignedIn && isBusiness && (
                      <a
                        href={`/${locale}/business/dashboard`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] transition-all hover:bg-gray-50"
                      >
                        <LayoutDashboard className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                        <span className="font-medium text-base">{t('dashboard') || 'Dashboard'}</span>
                        <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-[#244C70] text-white rounded-full">PRO</span>
                      </a>
                    )}

                    {/* Settings */}
                    <a
                      href={isBusiness ? `/${locale}/business/dashboard/settings` : `/${locale}/settings`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] transition-all hover:bg-gray-50"
                    >
                      <Settings className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                      <span className="font-medium text-base">{t('settings') || 'Settings'}</span>
                    </a>

                    {/* About */}
                    <a
                      href={`/${locale}/about`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] transition-all hover:bg-gray-50"
                    >
                      <Info className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                      <span className="font-medium text-base">{t('about') || 'About'}</span>
                    </a>

                    {/* Contact */}
                    <a
                      href={`/${locale}/contact`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] transition-all hover:bg-gray-50"
                    >
                      <Mail className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                      <span className="font-medium text-base">{t('contact') || 'Contact'}</span>
                    </a>

                    {/* Privacy Policy */}
                    <a
                      href={`/${locale}/privacy`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-[#244C70] transition-all hover:bg-gray-50"
                    >
                      <Shield className="h-5 w-5 text-[#244C70]" strokeWidth={1.5} />
                      <span className="font-medium text-base">{t('privacyPolicy') || 'Privacy Policy'}</span>
                    </a>
                  </div>

                {/* Navigation Links - Only show when NOT signed in */}
                {!isSignedIn && (
                  <>
                    <div className="h-px bg-gray-200 my-4" />
                    <div className="flex flex-col gap-3 px-2">
                      <a href="#features" className="text-sm font-medium text-gray-700 transition-colors hover:text-[#D4AF37]">{t('features')}</a>
                      <a href="#how-it-works" className="text-sm font-medium text-gray-700 transition-colors hover:text-[#D4AF37]">{t('howItWorks')}</a>
                      <a href="#app" className="text-sm font-medium text-gray-700 transition-colors hover:text-[#D4AF37]">{t('app')}</a>
                    </div>
                  </>
                )}
                
                {/* Auth Buttons - Only show when NOT signed in */}
                {!isLoaded ? (
                  <div className="py-4">
                    <div className="flex-1 h-10 bg-gray-100 rounded-xl animate-pulse" />
                  </div>
                ) : !isSignedIn && (
                  <>
                    <div className="h-px bg-gray-200 my-4" />
                    <div className="flex flex-col gap-3 px-2">
                      {/* Barber Space Button */}
                      <a 
                        href={`/${locale}/auth/business/sign-in`}
                        className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-[#D4AF37] bg-[#D4AF37]/5 px-4 py-2.5 text-sm font-semibold text-[#D4AF37] transition-all hover:bg-[#D4AF37]/10"
                      >
                        <Scissors className="h-4 w-4" />
                        {t('barberSpace')}
                      </a>
                      
                      <div className="flex gap-3">
                        <a 
                          href={`/${locale}/auth/user/sign-in`}
                          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-gray-700 transition-all hover:border-[#D4AF37] hover:text-[#D4AF37]"
                        >
                          {t('login')}
                        </a>
                        
                        <a 
                          href={`/${locale}/auth/user/sign-up`}
                          className="flex-1 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] px-4 py-2.5 text-center text-sm font-semibold text-[#0F172A] transition-all hover:brightness-110"
                        >
                          {t('signUp')}
                        </a>
                      </div>
                    </div>
                  </>
                )}

                {/* Divider */}
                <div className="h-px bg-gray-200 my-4" />
                
                {/* Language Selector */}
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">{t('language') || 'Language'}</p>
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
                  <p className="text-xs text-gray-400 text-center">© 2026 booq. All rights reserved.</p>
                </div>

                {/* Bottom padding for mobile navigation */}
                <div className="h-20 shrink-0" />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex items-start pt-16 pb-12 sm:pt-20 sm:pb-20 sm:items-center justify-center">
          {/* Content */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center max-w-4xl px-2 sm:px-0 w-full"
          >
            {/* Title container with fixed height - hidden when logged in */}
            {!isSignedIn && (
              <div className="h-[6rem] sm:h-[7rem] md:h-[8rem] lg:h-[9rem] flex items-center justify-center mb-10">
                <h1 className="text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl md:text-3xl lg:text-4xl max-w-3xl">
                  {(() => {
                    const firstSpaceIndex = displayedText.indexOf(' ');
                    if (firstSpaceIndex === -1) {
                      // Only one word or typing the first word
                      return <span className="text-[#D4AF37]">{displayedText}</span>;
                    }
                    const firstWord = displayedText.slice(0, firstSpaceIndex);
                    const restOfText = displayedText.slice(firstSpaceIndex);
                    return (
                      <>
                        <span className="text-[#D4AF37]">{firstWord}</span>
                        <span className="text-white">{restOfText}</span>
                      </>
                    );
                  })()}
                  <span className="animate-pulse text-[#D4AF37]">|</span>
                </h1>
              </div>
            )}

            {/* Search Bar */}
            <div className="mx-auto mb-10 max-w-2xl w-full">
              <div className="flex items-center gap-1 sm:gap-2 rounded-[5px] border border-gray-200 bg-white p-1 sm:p-1.5">
                <div className="flex flex-1 items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-2.5">
                  <Search className="h-5 w-5 text-gray-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder={t('searchPlaceholder')}
                    className="flex-1 bg-transparent text-[#0F172A] placeholder-gray-400 outline-none text-xs sm:text-sm font-medium min-w-0"
                  />
                </div>
                <div className="h-6 sm:h-8 w-px bg-gray-200" />
                <button 
                  className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-[5px] text-gray-500 transition-all hover:bg-gray-100 hover:text-[#D4AF37]"
                  aria-label="Open map"
                >
                  <Map className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button 
                  className="flex h-9 sm:h-10 items-center gap-2 rounded-[5px] border-2 border-[#D4AF37] bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] px-3 sm:px-6 text-xs sm:text-sm font-semibold text-[#0F172A] transition-all hover:brightness-110 shrink-0"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('search')}</span>
                </button>
              </div>
            </div>

            {/* Services - Grid on mobile, flex row on desktop */}
            <div className="mt-8 grid grid-cols-2 gap-2 place-items-center sm:flex sm:flex-nowrap sm:items-center sm:justify-center sm:gap-3">
              <a 
                href="/mobile-barber" 
                className="group inline-flex items-center justify-start gap-1.5 rounded-[5px] bg-white/5 px-3 py-2.5 text-xs sm:text-sm text-gray-300 transition-all hover:bg-[#D4AF37] hover:text-[#0F172A] w-full sm:w-[170px]"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <span className="flex items-center whitespace-nowrap">
                  {locale === 'ar' ? (
                    <span className="relative inline-flex overflow-hidden">
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={mobileServiceIndex}
                          initial={{ y: '110%', opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                          animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
                          exit={{ y: '-110%', opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="block"
                        >
                          {mobileServices[mobileServiceIndex]}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  ) : (
                    <>
                      <span>{t('mobile')}</span>
                      <span className="relative ms-1 inline-flex overflow-hidden">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={mobileServiceIndex}
                            initial={{ y: '110%', opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                            animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ y: '-110%', opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="block"
                          >
                            {mobileServices[mobileServiceIndex]}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </>
                  )}
                </span>
              </a>
              
              <span className="hidden sm:inline text-gray-600">|</span>
              
              <a 
                href="/learn-barbering" 
                className="group inline-flex items-center justify-start gap-1.5 rounded-[5px] bg-white/5 px-3 py-2.5 text-xs sm:text-sm text-gray-300 transition-all hover:bg-[#D4AF37] hover:text-[#0F172A] w-full sm:w-[170px]"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
                <span className="flex items-center whitespace-nowrap">
                  {locale === 'ar' ? (
                    <>
                      <span>{t('learn')}</span>
                      <span className="relative ms-1 inline-flex overflow-hidden">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={learnServiceIndex}
                            initial={{ y: '110%', opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                            animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ y: '-110%', opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="block"
                          >
                            {learnServices[learnServiceIndex]}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{t('learn')}</span>
                      <span className="relative ms-1 inline-flex overflow-hidden">
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={learnServiceIndex}
                            initial={{ y: '110%', opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                            animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            exit={{ y: '-110%', opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="block"
                          >
                            {learnServices[learnServiceIndex]}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </>
                  )}
                </span>
              </a>
              
              <span className="hidden sm:inline text-gray-600">|</span>
              
              <a 
                href="/shop" 
                className="group flex items-center justify-center gap-2 rounded-[5px] bg-white/5 px-3 py-2.5 text-xs sm:text-sm text-gray-300 transition-all hover:bg-[#D4AF37] hover:text-[#0F172A] w-full sm:w-auto"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <span className="whitespace-nowrap">{t('shopSupplies')}</span>
              </a>
              
              <span className="hidden sm:inline text-gray-600">|</span>
              
              <a 
                href="/careers" 
                className="group flex items-center justify-center gap-2 rounded-[5px] bg-white/5 px-3 py-2.5 text-xs sm:text-sm text-gray-300 transition-all hover:bg-[#D4AF37] hover:text-[#0F172A] w-full sm:w-auto"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
                <span className="whitespace-nowrap">{t('careerOpportunities')}</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
