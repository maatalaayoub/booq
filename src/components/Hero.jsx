'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Menu, ChevronDown, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ReactCountryFlag from 'react-country-flag';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import Sidebar from '@/components/Sidebar';

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
  const [selectedCity, setSelectedCity] = useState('');
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const langRef = useRef(null);
  const cityRef = useRef(null);
  const searchBarRef = useRef(null);
  const stickyCityRef = useRef(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  
  // Combined loaded state - both Clerk and role data must be loaded
  const isLoaded = isClerkLoaded && isRoleLoaded;
  
  // Debug logging
  useEffect(() => {
    console.log('[Hero] Auth state:', { isLoaded, isSignedIn, isBusiness, userRole, isRoleLoaded });
  }, [isLoaded, isSignedIn, isBusiness, userRole, isRoleLoaded]);
  
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCity) params.set('city', selectedCity);
    const qs = params.toString();
    router.push(`/${locale}/search${qs ? `?${qs}` : ''}`);
  };  
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

  // Close city dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isOutsideHeroCity = !cityRef.current || !cityRef.current.contains(event.target);
      const isOutsideStickyCity = !stickyCityRef.current || !stickyCityRef.current.contains(event.target);
      if (isOutsideHeroCity && isOutsideStickyCity) {
        setIsCityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for toggle-home-sidebar event from bottom navigation
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsMobileMenuOpen(prev => !prev);
    };
    window.addEventListener('toggle-home-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-home-sidebar', handleToggleSidebar);
  }, []);

  // Show sticky search header when hero search bar scrolls out of view
  useEffect(() => {
    const el = searchBarRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative bg-[#0F172A]">
      {/* Sticky Search Header */}
      <AnimatePresence>
        {showStickyHeader && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-b border-[#364153]/30 shadow-lg"
          >
            <div className="px-3 sm:px-6 py-3 sm:py-2.5 flex items-center gap-3" ref={stickyCityRef}>
              {/* Left: Sidebar button + Logo (desktop) */}
              <div className="hidden sd:flex items-center gap-3 shrink-0">
                {isSignedIn && (
                <button
                  onClick={() => setIsDesktopSideMenuOpen(!isDesktopSideMenuOpen)}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1E293B]/50 border border-[#364153]/50 text-white transition-all hover:bg-[#364153]/50 active:scale-95"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
                )}
                <Link href={`/${locale}`} className="shrink-0">
                  <Image src="/images/white-logo.png" alt="Booq" width={100} height={30} className="h-7 w-auto" />
                </Link>
              </div>

              {/* Center: Search bar (all devices) */}
              <div className="flex flex-1 min-w-0 sd:justify-center">
                <div className="flex flex-1 sd:flex-initial sd:w-full sd:max-w-xl items-center gap-2 min-w-0 relative">
                <div className="flex flex-1 items-center rounded-[10px] bg-white px-3 py-2.5 min-w-0 overflow-hidden">
                  <Search className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    className="flex-1 bg-transparent text-[#364153] placeholder-gray-400 outline-none text-xs font-medium min-w-0 mx-1.5"
                  />
                  <div className="h-5 w-px bg-gray-200 shrink-0" />
                  <button
                    onClick={() => setIsCityOpen(!isCityOpen)}
                    className="flex items-center gap-1 shrink-0 ml-1.5"
                  >
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-[11px] font-medium text-[#364153] truncate max-w-[70px] sd:max-w-none">
                      {selectedCity ? t(`city${selectedCity}`) : t('myLocation')}
                    </span>
                    <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
                  </button>
                </div>
                <button className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] shrink-0 shadow-sm">
                  <Search className="h-4 w-4 text-[#364153]" />
                </button>
                {/* City dropdown */}
                <AnimatePresence>
                  {isCityOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-2 z-50 rounded-[5px] bg-white border border-gray-200 shadow-lg"
                    >
                      <div className="city-dropdown max-h-64 overflow-y-auto py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <button
                          onClick={() => {
                            if (!navigator.geolocation) return;
                            setIsLocating(true);
                            navigator.geolocation.getCurrentPosition(
                              async (pos) => {
                                try {
                                  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`);
                                  const data = await res.json();
                                  const city = data.address?.city || data.address?.town || data.address?.village || '';
                                  const match = ['Casablanca','Rabat','Marrakech','Fes','Tangier','Agadir','Meknes','Oujda','Kenitra','Tetouan'].find(c => city.toLowerCase().includes(c.toLowerCase()));
                                  if (match) setSelectedCity(match);
                                } catch {} finally { setIsLocating(false); setIsCityOpen(false); }
                              },
                              () => { setIsLocating(false); },
                              { timeout: 8000 }
                            );
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 border-b border-gray-100"
                        >
                          <MapPin className={`h-4 w-4 ${isLocating ? 'animate-pulse' : ''}`} />
                          {isLocating ? '...' : t('myLocation')}
                        </button>
                        {['Casablanca','Rabat','Marrakech','Fes','Tangier','Agadir','Meknes','Oujda','Kenitra','Tetouan'].map((city) => (
                          <button
                            key={city}
                            onClick={() => { setSelectedCity(city); setIsCityOpen(false); }}
                            className={`flex w-full items-center px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                              selectedCity === city ? 'text-[#364153] font-semibold bg-gray-50' : 'text-gray-600'
                            }`}
                          >
                            {t(`city${city}`)}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </div>

              {/* Right: Profile icon (signed in) or Auth buttons (signed out) - desktop */}
              <div className="hidden sd:flex items-center justify-end shrink-0">
                {isSignedIn ? (
                  <button
                    onClick={() => setIsDesktopSideMenuOpen(!isDesktopSideMenuOpen)}
                    className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border-2 border-[#364153]/50 transition-all hover:border-[#D4AF37] hover:scale-105"
                  >
                    {user?.imageUrl ? (
                      <img src={user.imageUrl} alt={user.firstName || 'Profile'} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-white" />
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-1 rounded-full bg-[#1E293B]/50 border border-[#364153]/50 p-1 backdrop-blur-md whitespace-nowrap">
                    <Link
                      href={`/${locale}/auth/user/sign-in`}
                      className="rounded-full px-4 py-2 text-[13px] font-medium text-white/60 transition-all duration-200 hover:text-white hover:bg-[#364153]/40"
                    >
                      {t('login')}
                    </Link>
                    <Link
                      href={`/${locale}/auth/user/sign-up`}
                      className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#364153] transition-all duration-200 hover:bg-gray-100"
                    >
                      {t('signUp')}
                    </Link>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-[#364153]/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-60 w-60 rounded-full bg-[#D4AF37]/5 blur-2xl" />
      </div>

      {/* Subtle mesh gradient overlay */}
      <div className="absolute inset-0 opacity-[0.15]">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="heroGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#364153" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="heroGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#364153" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Flowing curves */}
          <path d="M0,100 Q250,50 500,100 T1000,100 T1500,100 V0 H0 Z" fill="url(#heroGrad1)" opacity="0.4" />
          <path d="M0,200 Q300,150 600,200 T1200,200 T1800,200 V0 H0 Z" fill="url(#heroGrad2)" opacity="0.3" />
          {/* Subtle diagonal lines */}
          <line x1="0" y1="100%" x2="30%" y2="0" stroke="url(#heroGrad1)" strokeWidth="1" opacity="0.2" />
          <line x1="20%" y1="100%" x2="50%" y2="0" stroke="url(#heroGrad2)" strokeWidth="1" opacity="0.15" />
          <line x1="60%" y1="100%" x2="90%" y2="0" stroke="url(#heroGrad1)" strokeWidth="1" opacity="0.2" />
          <line x1="80%" y1="100%" x2="100%" y2="20%" stroke="url(#heroGrad2)" strokeWidth="1" opacity="0.15" />
        </svg>
      </div>

      <div className="relative w-full px-6 sm:px-8 lg:px-8">
        <nav dir="ltr" className="flex items-center justify-between py-4">
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
                className="hidden sd:flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B]/50 border border-[#364153]/50 text-gray-300 transition-all hover:bg-[#364153]/50 hover:text-white backdrop-blur-md"
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
              className="h-8 sd:h-11 w-auto"
              priority
            />
          </motion.div>
          
          {/* Mobile Menu Button & Icons */}
          <div className="flex items-center gap-2 sd:hidden">
            {/* Profile link for signed-in users */}
            {isLoaded && isSignedIn && user && (
              <Link
                href={isBusiness ? `/${locale}/business/profile` : `/${locale}/profile`}
                className="relative flex items-center justify-center p-0.5 rounded-full border-2 border-white/20 transition-all hover:border-[#D4AF37]"
              >
                <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-800">
                  <img src={user.imageUrl} alt={user.firstName || 'Profile'} className="h-full w-full object-cover" />
                </div>
              </Link>
            )}
          </div>
          
          {/* Desktop Navigation */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden items-center sd:flex"
          >
            {/* Auth Buttons Group */}
            <div className="flex items-center gap-2 mr-3">
              {!isLoaded ? (
                // Loading state
                <div className="w-24 h-10 bg-gray-800/50 rounded-[15px] animate-pulse" />
              ) : isSignedIn ? (
                // Signed in state
                <>
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
                        className="hidden sd:flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B]/50 border border-[#364153]/50 text-gray-300 transition-all hover:bg-[#364153]/50 hover:text-white backdrop-blur-md"
                      aria-label={t('menu') || 'Menu'}
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                  )}
                </>
              ) : (
                // Signed out state - show login/signup buttons
                <div className="flex items-center gap-1 rounded-full bg-[#1E293B]/50 border border-[#364153]/50 p-1 backdrop-blur-md">
                  <a 
                    href={`/${locale}/auth/business/sign-up`}
                    className="flex items-center rounded-full px-4 py-2 text-[13px] font-medium text-[#D4AF37] transition-all duration-200 hover:bg-[#D4AF37]/10 active:scale-[0.97]"
                  >
                    {t('barberSpace')}
                  </a>
                  
                  <div className="h-5 w-px bg-[#364153]/60" />
                  
                  <a 
                    href={`/${locale}/auth/user/sign-in`}
                    className="rounded-full px-4 py-2 text-[13px] font-medium text-white/60 transition-all duration-200 hover:text-white hover:bg-[#364153]/40 active:scale-[0.97]"
                  >
                    {t('login')}
                  </a>
                  
                  <a 
                    href={`/${locale}/auth/user/sign-up`}
                    className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#364153] transition-all duration-200 hover:bg-gray-100 active:scale-[0.97]"
                  >
                    {t('signUp')}
                  </a>
                </div>
              )}
            </div>

            {/* Language Selector - Only show when NOT signed in */}
            {!isSignedIn && (
              <div className="relative ml-1" ref={langRef}>
                <button
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-[#1E293B]/50 border border-[#364153]/50 px-3 text-[13px] text-white/60 transition-all hover:bg-[#364153]/50 hover:text-white/80 backdrop-blur-md"
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
                      className="absolute right-0 top-12 z-50 min-w-[160px] overflow-hidden rounded-[10px] border border-[#364153]/50 bg-[#0F172A]" 
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setCurrentLang(lang);
                            changeLanguage(lang.code);
                            setIsLangOpen(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-[#364153]/50 ${
                            currentLang.code === lang.code ? 'bg-[#364153]/30 text-[#D4AF37]' : 'text-gray-300'
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

        {/* Unified Sidebar */}
        <Sidebar 
          isOpen={isDesktopSideMenuOpen || isMobileMenuOpen} 
          onClose={() => { setIsDesktopSideMenuOpen(false); setIsMobileMenuOpen(false); }} 
        />

        <div className="flex items-start pt-16 pb-12 sm:pt-20 sm:pb-20 sm:items-center justify-center">
          {/* Content */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center max-w-4xl px-2 sm:px-0 w-full"
          >
            {/* Main title */}
            <div className="flex items-center justify-center mb-10">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl max-w-3xl">
                {(() => {
                  const title = t('heroMainTitle');
                  const isArabic = locale === 'ar';
                  const spaceIdx = title.indexOf(' ');
                  const firstWordStyle = isArabic
                    ? { color: 'white' }
                    : { WebkitTextStroke: '0.8px white', WebkitTextFillColor: 'transparent' };
                  if (spaceIdx === -1) return <span style={firstWordStyle}>{title}</span>;
                  return (
                    <>
                      <span style={firstWordStyle}>{title.slice(0, spaceIdx)}</span>
                      <span className="text-white">{title.slice(spaceIdx)}</span>
                    </>
                  );
                })()}
              </h1>
            </div>

            {/* Search Bar */}
            <div className="mx-auto mb-10 max-w-2xl w-full" ref={(el) => { cityRef.current = el; searchBarRef.current = el; }}>
              {/* Desktop: single row pill */}
              <div className="hidden sd:flex items-center gap-2 rounded-[10px] bg-white p-1.5">
                <div className="flex flex-1 items-center gap-3 px-4 py-2.5">
                  <Search className="h-5 w-5 text-gray-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="flex-1 bg-transparent text-[#364153] placeholder-gray-400 outline-none text-sm font-medium min-w-0"
                  />
                </div>
                <div className="h-8 w-px bg-gray-200" />
                {/* City Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setIsCityOpen(!isCityOpen)}
                    className="flex h-10 items-center gap-1.5 rounded-full px-3 text-gray-500 transition-all hover:bg-gray-100"
                  >
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium text-[#364153] max-w-[80px] truncate">
                      {selectedCity ? t(`city${selectedCity}`) : t('myLocation')}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isCityOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isCityOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-3 z-50 w-48 rounded-[5px] bg-white border border-gray-200 shadow-lg"
                      >
                        <div className="city-dropdown max-h-64 overflow-y-auto py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                          <style>{`.city-dropdown::-webkit-scrollbar { display: none; }`}</style>
                          <button
                            onClick={() => {
                              if (!navigator.geolocation) return;
                              setIsLocating(true);
                              navigator.geolocation.getCurrentPosition(
                                async (pos) => {
                                  try {
                                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`);
                                    const data = await res.json();
                                    const city = data.address?.city || data.address?.town || data.address?.village || '';
                                    const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan'];
                                    const match = cities.find(c => city.toLowerCase().includes(c.toLowerCase()));
                                    if (match) setSelectedCity(match);
                                  } catch {} finally { setIsLocating(false); setIsCityOpen(false); }
                                },
                                () => { setIsLocating(false); },
                                { timeout: 8000 }
                              );
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 border-b border-gray-100"
                          >
                            <MapPin className={`h-4 w-4 ${isLocating ? 'animate-pulse' : ''}`} />
                            {isLocating ? '...' : t('myLocation')}
                          </button>
                          {['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan'].map((city) => (
                            <button
                              key={city}
                              onClick={() => { setSelectedCity(city); setIsCityOpen(false); }}
                              className={`flex w-full items-center px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                                selectedCity === city ? 'text-[#364153] font-semibold bg-gray-50' : 'text-gray-600'
                              }`}
                            >
                              {t(`city${city}`)}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button 
                  onClick={handleSearch}
                  className="flex h-10 items-center gap-2 rounded-[10px] bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] px-6 text-sm font-semibold text-[#364153] transition-all hover:brightness-110 shadow-sm shrink-0"
                >
                  <Search className="h-4 w-4" />
                  <span>{t('search')}</span>
                </button>
              </div>

              {/* Mobile: stacked layout */}
              <div className="flex sd:hidden flex-col gap-2.5 px-2">
                {/* Search input */}
                <div className="flex items-center gap-3 rounded-[10px] bg-white px-4 py-3">
                  <Search className="h-5 w-5 text-gray-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    className="flex-1 bg-transparent text-[#364153] placeholder-gray-400 outline-none text-sm font-medium"
                  />
                </div>
                {/* City selector */}
                <div className="relative">
                  <button 
                    onClick={() => setIsCityOpen(!isCityOpen)}
                    className="flex w-full items-center gap-3 rounded-[10px] bg-white px-4 py-3 transition-all hover:bg-gray-50"
                  >
                    <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                    <span className="flex-1 text-start text-sm font-medium text-[#364153]">
                      {selectedCity ? t(`city${selectedCity}`) : t('myLocation')}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCityOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isCityOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 rounded-[5px] bg-white border border-gray-200 shadow-lg"
                      >
                        <div className="city-dropdown max-h-64 overflow-y-auto py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                          <button
                            onClick={() => {
                              if (!navigator.geolocation) return;
                              setIsLocating(true);
                              navigator.geolocation.getCurrentPosition(
                                async (pos) => {
                                  try {
                                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`);
                                    const data = await res.json();
                                    const city = data.address?.city || data.address?.town || data.address?.village || '';
                                    const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan'];
                                    const match = cities.find(c => city.toLowerCase().includes(c.toLowerCase()));
                                    if (match) setSelectedCity(match);
                                  } catch {} finally { setIsLocating(false); setIsCityOpen(false); }
                                },
                                () => { setIsLocating(false); },
                                { timeout: 8000 }
                              );
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 border-b border-gray-100"
                          >
                            <MapPin className={`h-4 w-4 ${isLocating ? 'animate-pulse' : ''}`} />
                            {isLocating ? '...' : t('myLocation')}
                          </button>
                          {['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan'].map((city) => (
                            <button
                              key={city}
                              onClick={() => { setSelectedCity(city); setIsCityOpen(false); }}
                              className={`flex w-full items-center px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                                selectedCity === city ? 'text-[#364153] font-semibold bg-gray-50' : 'text-gray-600'
                              }`}
                            >
                              {t(`city${city}`)}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Search button */}
                <button 
                  onClick={handleSearch}
                  className="flex items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#D4AF37] to-[#F4CF67] px-6 py-3 text-sm font-semibold text-[#364153] transition-all hover:brightness-110 shadow-sm"
                >
                  <Search className="h-4 w-4" />
                  {t('search')}
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
