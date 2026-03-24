'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, MapPin, Calendar as CalendarIcon, Filter, Layers, List, Navigation, Star, ArrowLeft, Loader2, Scissors, ChevronLeft, ChevronRight, X, ChevronDown, Check, Store, Car, DollarSign, Clock, Phone, CalendarCheck, MessageCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOROCCO_CITIES = [
  'My Location', 'Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier',
  'Agadir', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan', 'Safi',
  'Mohammedia', 'El Jadida', 'Beni Mellal', 'Nador', 'Taza',
];

// Mock dynamic map to avoid SSR issues
const PlacesMap = dynamic(() => import('@/components/PlacesMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400 w-8 h-8" /></div>
});

const ServiceCard = ({ biz, locale, t, onHover, onLeave, onSelect }) => {
  // Builds the card body with buttons inside the text column
  const cardWithButtons = (buttons) => (
    <>
      {/* Image Section */}
      <div className="relative w-28 h-28 sm:h-auto sm:w-[220px] bg-gray-100 shrink-0 overflow-hidden">
        {biz.coverGallery && biz.coverGallery[0] ? (
          <img src={biz.coverGallery[0]} alt={biz.businessName} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#244C70]/10 to-[#244C70]/20 flex items-center justify-center">
            <Scissors className="w-6 h-6 sm:w-8 sm:h-8 text-[#244C70]/40" />
          </div>
        )}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-gray-800 flex items-center gap-0.5 sm:gap-1 shadow-sm">
          <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500" />
          4.9
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col gap-1.5 sm:gap-3 min-w-0">
        <div>
          <h3 className="font-bold text-[#1e293b] text-sm sm:text-lg leading-tight line-clamp-1">{biz.businessName}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 capitalize">{biz.professionalType?.replace('_', ' ') || t('search.salon')}</p>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600">
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
          <span className="line-clamp-1">{biz.city || t('search.morocco')}</span>
        </div>

        {biz.services && biz.services.length > 0 && (
          <div className="hidden sm:block flex-1 space-y-2 mt-1">
            {biz.services.slice(0, 2).map((s, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-600 line-clamp-1 pr-2">{s.name}</span>
                <span className="font-medium text-[#1e293b] whitespace-nowrap">{s.price} {s.currency}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons inside the text column */}
        {buttons && (
          <div className="hidden sm:flex mt-auto pt-3 gap-2">
            {buttons}
          </div>
        )}
      </div>
    </>
  );

  // Desktop card rendering with functional buttons inside the text area
  const desktopCard = biz.showBookingButton ? (
    // Book Now: entire card links to business page
    <div className="hidden md:block" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <Link href={`/${locale}/b/${biz.id}`} className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
        <div className="flex flex-row h-full w-full">
          {cardWithButtons(
            <span className="flex-1 bg-[#244C70] text-center text-white py-2.5 rounded-lg text-sm font-semibold group-hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1.5">
              <CalendarCheck className="w-4 h-4" />
              {t('search.bookNow')}
            </span>
          )}
        </div>
      </Link>
    </div>
  ) : biz.showGetDirections ? (
    // Get Directions: card is not a link, buttons are real links
    <div className="hidden md:block" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
        <div className="flex flex-row h-full w-full">
          {cardWithButtons(
            <>
              <a
                href={biz.latitude && biz.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${biz.latitude},${biz.longitude}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#244C70] text-white text-center py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
              </a>
              <Link
                href={`/${locale}/b/${biz.id}`}
                className="flex-1 bg-gray-100 text-gray-700 text-center py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                Details
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  ) : (biz.showCallButton || biz.showMessageButton) ? (
    // Call & Message: card is not a link, buttons are real links
    <div className="hidden md:block" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
        <div className="flex flex-row h-full w-full">
          {cardWithButtons(
            <>
              {biz.phone ? (
                <a
                  href={`tel:${biz.phone}`}
                  className="flex-1 bg-[#244C70] text-white text-center py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-4 h-4" />
                  {t('search.contact')}
                </a>
              ) : (
                <Link
                  href={`/${locale}/b/${biz.id}`}
                  className="flex-1 bg-[#244C70] text-white text-center py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3a5a] transition-colors flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t('search.contact')}
                </Link>
              )}
              <Link
                href={`/${locale}/b/${biz.id}`}
                className="flex-1 bg-gray-100 text-gray-700 text-center py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                {t('search.details')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  ) : (
    // Fallback: entire card links to business page
    <div className="hidden md:block" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <Link href={`/${locale}/b/${biz.id}`} className="block">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group flex flex-row h-full w-full">
          {cardWithButtons(null)}
        </div>
      </Link>
    </div>
  );

  // Desktop: conditional wrapper based on button config
  // Mobile: card taps select on map, action buttons rendered separately (no nested <a>)
  return (
    <>
      {desktopCard}
      <div className="md:hidden" onClick={() => onSelect?.(biz.id)}>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden transition-all group flex flex-row h-full w-full">
            {/* Image */}
            <div className="relative w-28 self-stretch bg-gray-100 shrink-0 overflow-hidden">
              {biz.coverGallery && biz.coverGallery[0] ? (
                <img src={biz.coverGallery[0]} alt={biz.businessName} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#244C70]/10 to-[#244C70]/20 flex items-center justify-center">
                  <Scissors className="w-6 h-6 text-[#244C70]/40" />
                </div>
              )}
              <div className="absolute top-2 right-2 bg-white px-1.5 py-0.5 rounded-full text-[10px] font-bold text-gray-800 flex items-center gap-0.5 shadow-sm">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                4.9
              </div>
            </div>
            {/* Info + Buttons */}
            <div className="p-3 flex-1 flex flex-col gap-1.5 min-w-0">
              <h3 className="font-bold text-[#1e293b] text-sm leading-tight line-clamp-1">{biz.businessName}</h3>
              <p className="text-xs text-gray-500 capitalize">{biz.professionalType?.replace('_', ' ') || t('search.salon')}</p>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="line-clamp-1">{biz.city || t('search.morocco')}</span>
              </div>
              {/* Action buttons based on config */}
              <div className="flex items-center gap-2 mt-auto pt-1">
                {biz.showBookingButton ? (
                  <Link
                    href={`/${locale}/b/${biz.id}`}
                    className="flex-1 bg-[#244C70] text-white text-center py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:bg-[#1a3a5a] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CalendarCheck className="w-3 h-3" />
                    {t('search.bookNow')}
                  </Link>
                ) : biz.showGetDirections ? (
                  <>
                    <a
                      href={biz.latitude && biz.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${biz.latitude},${biz.longitude}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#244C70] text-white text-center py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:bg-[#1a3a5a] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Navigation className="w-3 h-3" />
                      {t('search.directions')}
                    </a>
                    <Link
                      href={`/${locale}/b/${biz.id}`}
                      className="flex-1 bg-gray-100 text-gray-700 text-center py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:bg-gray-200 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t('search.details')}
                    </Link>
                  </>
                ) : (biz.showCallButton || biz.showMessageButton) ? (
                  <>
                    {biz.phone ? (
                      <a
                        href={`tel:${biz.phone}`}
                        className="flex-1 bg-[#244C70] text-white text-center py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:bg-[#1a3a5a] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-3 h-3" />
                        {t('search.contact')}
                      </a>
                    ) : (
                      <Link
                        href={`/${locale}/b/${biz.id}`}
                        className="flex-1 bg-[#244C70] text-white text-center py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:bg-[#1a3a5a] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-3 h-3" />
                        {t('search.contact')}
                      </Link>
                    )}
                    <Link
                      href={`/${locale}/b/${biz.id}`}
                      className="flex-1 bg-gray-100 text-gray-700 text-center py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:bg-gray-200 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t('search.details')}
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default function SearchPage() {
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const { t, isRTL } = useLanguage();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [cityQuery, setCityQuery] = useState(searchParams.get('city') || '');
  const [serviceMode, setServiceMode] = useState('store'); // store, mobile
  const [showFilters, setShowFilters] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }
  const [locationLoading, setLocationLoading] = useState(false);

  // Filter dialog state
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filterRating, setFilterRating] = useState(0); // 0 = any, 3, 4, 4.5
  const [filterPriceMax, setFilterPriceMax] = useState(''); // '' = any
  const [filterDistance, setFilterDistance] = useState(50); // km, only used with location
  const [filterSortBy, setFilterSortBy] = useState('recommended'); // recommended, price-low, price-high, rating, distance
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState(''); // '' = any, or professional_type value
  const [hoveredBusinessId, setHoveredBusinessId] = useState(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  // Bottom sheet state for mobile
  const [sheetHeight, setSheetHeight] = useState('50vh'); // '10vh', '50vh', '85vh'

  useEffect(() => {
    fetch('/api/businesses')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        if (data.businesses) {
          const allBiz = Object.values(data.businesses).flat();
          setBusinesses(allBiz);
        }
      })
      .catch(err => console.error('Fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  // Filter Logic
  const filteredBusinesses = useMemo(() => {
    let results = businesses.filter(b => {
      const matchSearch = searchQuery === '' || 
                          (b.businessName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (b.professionalType?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      let matchCity = true;
      let distance = null;
      if (cityQuery === '__my_location__' && userLocation) {
        if (b.latitude && b.longitude) {
          const R = 6371;
          const dLat = (b.latitude - userLocation.lat) * Math.PI / 180;
          const dLng = (b.longitude - userLocation.lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          matchCity = distance <= filterDistance;
        } else {
          matchCity = false;
        }
      } else if (cityQuery && cityQuery !== '__my_location__') {
        matchCity = (b.city?.toLowerCase() || '').includes(cityQuery.toLowerCase());
      }
      
      let matchMode = true;
      if (serviceMode === 'store') matchMode = b.serviceMode !== 'mobile';
      if (serviceMode === 'mobile') matchMode = b.serviceMode === 'mobile' || b.businessCategory === 'mobile_service';

      // Rating filter
      let matchRating = true;
      if (filterRating > 0) {
        const bizRating = b.rating || 0;
        matchRating = bizRating >= filterRating;
      }

      // Price filter
      let matchPrice = true;
      if (filterPriceMax !== '') {
        const minPrice = b.services && b.services.length > 0 ? Math.min(...b.services.map(s => s.price || Infinity)) : Infinity;
        matchPrice = minPrice <= Number(filterPriceMax);
      }

      // Category filter
      let matchCategory = true;
      if (filterCategory) {
        matchCategory = b.professionalType === filterCategory;
      }

      if (matchSearch && matchCity && matchMode && matchRating && matchPrice && matchCategory) {
        b._distance = distance;
        return true;
      }
      return false;
    });

    // Sorting
    if (filterSortBy === 'price-low') {
      results.sort((a, b) => {
        const aPrice = a.services?.[0]?.price || Infinity;
        const bPrice = b.services?.[0]?.price || Infinity;
        return aPrice - bPrice;
      });
    } else if (filterSortBy === 'price-high') {
      results.sort((a, b) => {
        const aPrice = a.services?.[0]?.price || 0;
        const bPrice = b.services?.[0]?.price || 0;
        return bPrice - aPrice;
      });
    } else if (filterSortBy === 'rating') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (filterSortBy === 'distance' && userLocation) {
      results.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
    }

    return results;
  }, [businesses, searchQuery, cityQuery, serviceMode, userLocation, filterRating, filterPriceMax, filterDistance, filterSortBy, filterCategory]);


  // Close all dropdowns
  const closeAllDropdowns = useCallback(() => {
    setShowCityDropdown(false);
    setShowDatePicker(false);
  }, []);

  const handleCitySelect = useCallback((city) => {
    if (city === 'My Location') {
      setLocationLoading(true);
      setCityQuery('__my_location__');
      setShowCityDropdown(false);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLocationLoading(false);
          },
          () => {
            setCityQuery('');
            setUserLocation(null);
            setLocationLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        setCityQuery('');
        setLocationLoading(false);
      }
    } else {
      setCityQuery(city);
      setUserLocation(null);
      setShowCityDropdown(false);
    }
  }, []);

  // --- Mobile Sheet: pixel-based real-time drag ---
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDragging = useRef(false);
  const currentHeight = useRef(0);

  // Snap points as fractions of available height (viewport minus bottom nav)
  const NAV_HEIGHT = 64; // bottom nav h-16 = 4rem = 64px
  const SNAP_MIN = 0.15;
  const SNAP_MID = 0.50;
  const SNAP_MAX = 0.85;

  const getSnapPx = useCallback((fraction) => Math.round((window.innerHeight - NAV_HEIGHT) * fraction), []);

  // Initialize currentHeight on mount
  useEffect(() => {
    currentHeight.current = getSnapPx(SNAP_MID);
  }, [getSnapPx]);

  const snapToNearest = useCallback((heightPx, velocityY) => {
    const vh = window.innerHeight - NAV_HEIGHT;
    const snapPoints = [SNAP_MIN * vh, SNAP_MID * vh, SNAP_MAX * vh];
    
    // Velocity-based: if fast swipe, go to next snap in that direction
    if (Math.abs(velocityY) > 0.4) {
      if (velocityY > 0) {
        // swiping down — find next lower snap
        const lower = snapPoints.filter(s => s < dragStartHeight.current - 20);
        const target = lower.length ? lower[lower.length - 1] : snapPoints[0];
        return target;
      } else {
        // swiping up — find next higher snap
        const higher = snapPoints.filter(s => s > dragStartHeight.current + 20);
        const target = higher.length ? higher[0] : snapPoints[snapPoints.length - 1];
        return target;
      }
    }

    // Otherwise snap to closest
    let closest = snapPoints[0];
    let minDist = Math.abs(heightPx - snapPoints[0]);
    for (let i = 1; i < snapPoints.length; i++) {
      const dist = Math.abs(heightPx - snapPoints[i]);
      if (dist < minDist) { minDist = dist; closest = snapPoints[i]; }
    }
    return closest;
  }, []);

  const applyHeight = useCallback((px, animate) => {
    const el = sheetRef.current;
    if (!el) return;
    if (animate) {
      el.style.transition = 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    } else {
      el.style.transition = 'none';
    }
    el.style.height = `${px}px`;
    currentHeight.current = px;

    // Update React state for snap points (controls backdrop, tap-to-expand)
    const vh = window.innerHeight - NAV_HEIGHT;
    const fraction = px / vh;
    if (animate) {
      if (fraction <= 0.25) setSheetHeight('15vh');
      else if (fraction <= 0.68) setSheetHeight('50vh');
      else setSheetHeight('85vh');
    }
  }, []);

  const collapseSheet = useCallback(() => {
    applyHeight(Math.round((window.innerHeight - NAV_HEIGHT) * SNAP_MIN), true);
  }, [applyHeight]);

  const expandSheet = useCallback(() => {
    applyHeight(Math.round((window.innerHeight - NAV_HEIGHT) * SNAP_MAX), true);
  }, [applyHeight]);

  // Handle drag on the header/drag-handle zone
  const handleDragStart = useCallback((e) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = currentHeight.current;
    isDragging.current = false;
  }, []);

  const handleDragMove = useCallback((e) => {
    const deltaY = e.touches[0].clientY - dragStartY.current;
    if (!isDragging.current && Math.abs(deltaY) > 5) {
      isDragging.current = true;
    }
    if (isDragging.current) {
      const newHeight = Math.max(
        getSnapPx(SNAP_MIN) * 0.8,
        Math.min(getSnapPx(SNAP_MAX) * 1.05, dragStartHeight.current - deltaY)
      );
      applyHeight(newHeight, false);
    }
  }, [applyHeight, getSnapPx]);

  const handleDragEnd = useCallback((e) => {
    // If no drag occurred, treat as a tap — toggle expand/collapse
    if (!isDragging.current) {
      const vh = window.innerHeight - NAV_HEIGHT;
      if (currentHeight.current > vh * 0.25) {
        collapseSheet();
      } else {
        expandSheet();
      }
      return;
    }

    const deltaY = e.changedTouches[0].clientY - dragStartY.current;
    const absVelocity = Math.abs(deltaY) > 80 ? Math.abs(deltaY) / 200 : 0;
    const directedVelocity = deltaY > 0 ? absVelocity : -absVelocity;

    const targetPx = snapToNearest(currentHeight.current, directedVelocity);
    applyHeight(targetPx, true);
    isDragging.current = false;
  }, [snapToNearest, applyHeight, collapseSheet, expandSheet]);

  return (
    <div className="h-screen bg-gray-50 overflow-hidden relative md:flex md:flex-col" style={{ overscrollBehavior: 'none' }}>
      {/* Top Navigation - Desktop & Mobile */}
      <header className="md:bg-white md:border-b md:border-gray-200 z-[50] md:shrink-0 md:relative fixed top-0 left-0 right-0">
        <div className="flex items-center px-4 h-14 md:h-16 max-w-7xl mx-auto w-full gap-4">
          <Link href={`/${locale}`} className="p-2 -ml-2 rounded-full md:hover:bg-gray-100 text-gray-700 transition-colors bg-white/80 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none shadow-sm md:shadow-none">
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
          
          <div className="flex-1 flex gap-2 items-center">
            {/* Desktop Search Bar */}
            <div className="hidden md:flex flex-1 items-center bg-gray-100 rounded-full pl-4 pr-1 py-1 gap-3 border border-gray-300 focus-within:ring-2 focus-within:ring-[#244C70]/30 transition-shadow">
              
              <div className="flex flex-1 items-center gap-2">
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder={t('search.placeholder')} 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full min-w-0 placeholder-gray-500"
                />
              </div>

              <div className="w-px h-6 bg-gray-300 shrink-0"></div>
              
              {/* City Dropdown Trigger */}
              <div className="flex flex-1 items-center gap-2 relative">
                <button
                  onClick={() => { setShowCityDropdown(!showCityDropdown); setShowDatePicker(false); }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className={`text-sm truncate ${cityQuery ? 'text-gray-800' : 'text-gray-500'}`}>
                    {cityQuery === '__my_location__' ? t('search.myLocation') : cityQuery || t('search.city')}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-auto" />
                </button>

                {/* City Dropdown Panel */}
                <AnimatePresence>
                  {showCityDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 max-h-64 overflow-y-auto"
                    >
                      {MOROCCO_CITIES.map(city => (
                        <button
                          key={city}
                          onClick={() => handleCitySelect(city)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                            (city === 'My Location' && cityQuery === '__my_location__') || city === cityQuery ? 'text-[#244C70] font-medium bg-[#244C70]/5' : 'text-gray-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {city === 'My Location' ? <Navigation className="w-4 h-4 opacity-50" /> : <MapPin className="w-4 h-4 opacity-50" />}
                            {city === 'My Location' ? t('search.myLocation') : city}
                          </span>
                          {((city === 'My Location' && cityQuery === '__my_location__') || city === cityQuery) && (
                            <Check className="w-4 h-4 text-[#244C70]" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-px h-6 bg-gray-300 shrink-0"></div>
              
              {/* Date Picker Trigger */}
              <div className="flex flex-1 items-center gap-2 relative">
                <button
                  onClick={() => { setShowDatePicker(!showDatePicker); setShowCityDropdown(false); }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <CalendarIcon className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className={`text-sm truncate ${selectedDate ? 'text-gray-800' : 'text-gray-500'}`}>
                    {selectedDate ? new Date(selectedDate).toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' }) : t('search.anyDate')}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-auto" />
                </button>

                {/* Date Picker Panel */}
                <AnimatePresence>
                  {showDatePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-3 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 w-72"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-800">{t('search.selectDate')}</span>
                        {selectedDate && (
                          <button onClick={() => { setSelectedDate(''); setShowDatePicker(false); }} className="text-xs text-[#244C70] hover:underline">
                            {t('search.clear')}
                          </button>
                        )}
                      </div>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={e => { setSelectedDate(e.target.value); setShowDatePicker(false); }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#244C70]/30 focus:border-[#244C70] outline-none"
                      />
                      <div className="flex gap-2 mt-3">
                        {[t('search.today'), t('search.tomorrow')].map((label, i) => {
                          const d = new Date(); d.setDate(d.getDate() + i);
                          const val = d.toISOString().split('T')[0];
                          return (
                            <button
                              key={label}
                              onClick={() => { setSelectedDate(val); setShowDatePicker(false); }}
                              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${selectedDate === val ? 'bg-[#244C70] text-white border-[#244C70]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                className="bg-[#244C70] hover:bg-[#1a3a5a] text-white p-2.5 rounded-full transition-colors flex items-center justify-center shrink-0 ml-1"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Header Title */}
            <div className="md:hidden flex-1">
            </div>
          </div>
        </div>

        {/* Mobile Search Field with Search & City buttons inside */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center bg-white/80 backdrop-blur-md rounded-full pl-4 pr-1.5 py-1.5 gap-2 shadow-sm">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input 
              type="text" 
              placeholder={t('search.placeholderMobile')} 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={collapseSheet}
              className="bg-transparent border-none outline-none text-sm flex-1 w-full placeholder-gray-500"
            />
            <button
              onClick={() => { setShowCityDropdown(!showCityDropdown); setShowDatePicker(false); collapseSheet(); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors shrink-0 ${
                cityQuery ? 'bg-[#244C70] border-[#244C70] text-white font-medium' : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="max-w-[80px] truncate">{cityQuery === '__my_location__' ? t('search.myLocation') : cityQuery || t('search.city')}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <button 
              className="bg-[#244C70] hover:bg-[#1a3a5a] text-white p-2 rounded-full transition-colors shrink-0"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile City Dropdown Overlay */}
        <AnimatePresence>
          {showCityDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute left-0 right-0 top-full bg-white border-t border-gray-100 shadow-lg z-[70] max-h-72 overflow-y-auto"
            >
              {MOROCCO_CITIES.map(city => (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm border-b border-gray-50 active:bg-gray-100 transition-colors ${
                    (city === 'My Location' && cityQuery === '__my_location__') || city === cityQuery ? 'text-[#244C70] font-medium bg-[#244C70]/5' : 'text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {city === 'My Location' ? <Navigation className="w-4 h-4 opacity-40" /> : <MapPin className="w-4 h-4 opacity-40" />}
                    {city === 'My Location' ? t('search.myLocation') : city}
                  </span>
                  {((city === 'My Location' && cityQuery === '__my_location__') || city === cityQuery) && (
                    <Check className="w-4 h-4 text-[#244C70]" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Date Picker Overlay */}
        <AnimatePresence>
          {showDatePicker && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden absolute left-0 right-0 top-full bg-white border-t border-gray-100 shadow-lg z-50 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-800">{t('search.selectDate')}</span>
                {selectedDate && (
                  <button onClick={() => { setSelectedDate(''); setShowDatePicker(false); }} className="text-xs text-[#244C70] hover:underline">
                    {t('search.clear')}
                  </button>
                )}
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setShowDatePicker(false); }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-[#244C70]/30 focus:border-[#244C70] outline-none"
              />
              <div className="flex gap-2 mt-3">
                {[t('search.today'), t('search.tomorrow'), t('search.thisWeek')].map((label, i) => {
                  const d = new Date();
                  if (i < 2) d.setDate(d.getDate() + i);
                  else d.setDate(d.getDate() + (7 - d.getDay()));
                  const val = d.toISOString().split('T')[0];
                  return (
                    <button
                      key={label}
                      onClick={() => { setSelectedDate(val); setShowDatePicker(false); }}
                      className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${selectedDate === val ? 'bg-[#244C70] text-white border-[#244C70]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Backdrop for closing dropdowns */}
      {(showCityDropdown || showDatePicker) && (
        <div className="fixed inset-0 z-40" onClick={closeAllDropdowns} />
      )}

      {/* Main Layout Area */}
      <div className="md:flex-1 md:flex md:flex-row absolute inset-0 md:relative overflow-hidden">
        
        {/* Map: full screen on mobile, 50% on desktop */}
        <div className="absolute inset-0 md:relative md:w-1/2 md:h-full z-0"
          onTouchStart={() => {
            // On mobile, any map touch collapses the bottom sheet
            if (window.innerWidth < 768 && currentHeight.current > (window.innerHeight - NAV_HEIGHT) * 0.25) {
              collapseSheet();
            }
          }}
        >
          <PlacesMap businesses={filteredBusinesses} locale={locale} hoveredBusinessId={hoveredBusinessId} selectedBusinessId={selectedBusinessId} onPopupClose={() => setSelectedBusinessId(null)} />
        </div>

        {/* RIGHT: Results Panel (Desktop Only) */}
        <div className="hidden md:flex w-1/2 h-full flex-col bg-gray-50 z-10 border-l border-gray-200">
          
          {/* Quick Filters */}
          <div className="bg-white py-3 px-6 border-b border-gray-200 flex items-center gap-2 overflow-x-auto scroller-hide shrink-0">
            <div className="flex rounded-full border border-gray-200 overflow-hidden">
              <button 
                onClick={() => setServiceMode('store')}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${serviceMode === 'store' ? 'bg-[#244C70] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <Store className="w-4 h-4" />
                {t('search.inStore')}
              </button>
              <button 
                onClick={() => setServiceMode('mobile')}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${serviceMode === 'mobile' ? 'bg-[#244C70] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                <Car className="w-4 h-4" />
                {t('search.mobile')}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {searchQuery || cityQuery ? t('search.searchResults') : t('search.recommended')}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 font-medium">{filteredBusinesses.length} {t('search.found')}</span>
                <button 
                  onClick={() => setShowFilterDialog(!showFilterDialog)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    showFilterDialog || filterRating || filterPriceMax || filterSortBy !== 'recommended' || filterCategory
                      ? 'bg-[#244C70] border-[#244C70] text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  {t('search.filters')}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4">
                {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />)}
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('search.noResults')}</h3>
                <p className="text-gray-500 max-w-sm">{t('search.noResultsDesc')}</p>
                <button onClick={() => {setSearchQuery(''); setCityQuery(''); setUserLocation(null); setServiceMode('store')}} className="mt-4 text-[#244C70] font-medium hover:underline">
                  {t('search.clearAllFilters')}
                </button>
              </div>
            ) : (
              <div className="grid xl:grid-cols-2 gap-4">
                {filteredBusinesses.map(biz => (
                  <ServiceCard 
                    key={biz.id} 
                    biz={biz} 
                    locale={locale} 
                    t={t}
                    onHover={() => setHoveredBusinessId(biz.id)}
                    onLeave={() => setHoveredBusinessId(null)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM SHEET (Mobile Only) — offset above bottom nav (h-16 = 4rem) */}
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 pointer-events-none" style={{ height: 'calc(100% - 4rem)' }}>
          <div 
            ref={sheetRef}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] pointer-events-auto flex flex-col"
            style={{ 
              height: '50vh', 
              transition: 'height 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
              willChange: 'height',
              transform: 'translateZ(0)',
            }}
          >
            {/* Drag Handle Zone - large touch target */}
            <div 
              className="w-full flex flex-col items-center py-3 cursor-grab active:cursor-grabbing shrink-0 select-none"
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              style={{ touchAction: 'none' }}
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Filter Chips Row */}
            <div className="flex items-center justify-between px-4 pb-2 shrink-0">
              {/* Service Mode Toggle - Left */}
              <div className="flex rounded-full border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setServiceMode('store')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${
                    serviceMode === 'store' ? 'bg-[#244C70] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>{t('search.inStore')}</span>
                </button>
                <button
                  onClick={() => setServiceMode('mobile')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-sm whitespace-nowrap transition-colors ${
                    serviceMode === 'mobile' ? 'bg-[#244C70] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>{t('search.mobile')}</span>
                </button>
              </div>

              {/* Filter Button - Right */}
              <button
                onClick={() => { setShowFilterDialog(true); collapseSheet(); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm whitespace-nowrap border transition-colors ${
                  filterRating || filterPriceMax || filterSortBy !== 'recommended' || filterCategory ? 'bg-[#244C70] border-[#244C70] text-white font-medium' : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{t('search.filters')}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
                style={{ overscrollBehavior: 'contain' }}
            >
              <div className="flex justify-between items-center px-1">
                <h2 className="font-bold text-gray-900 text-base">
                  {searchQuery ? t('search.results') : t('search.nearby')}
                </h2>
                <span className="text-sm font-medium text-gray-500">{filteredBusinesses.length} {t('search.found')}</span>
              </div>

              {filteredBusinesses.length === 0 && !loading && (
                 <div className="py-10 text-center">
                    <p className="text-gray-500">{t('search.noMatch')}</p>
                 </div>
              )}

              {filteredBusinesses.map(biz => (
                <ServiceCard key={biz.id} biz={biz} locale={locale} t={t} onSelect={(id) => { setSelectedBusinessId(id); collapseSheet(); }} />
              ))}
              
              {/* padding bottom for mobile safe area */}
              <div className="h-20 shrink-0" />
            </div>

          </div>
        </div>

      </div>

      {/* Filter Dialog */}
      <AnimatePresence>
        {showFilterDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[80]"
              onClick={() => setShowFilterDialog(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-lg md:rounded-2xl bg-white rounded-t-2xl z-[81] max-h-[85vh] flex flex-col shadow-2xl"
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <h2 className="text-lg font-bold text-gray-900">{t('search.filters')}</h2>
                <button onClick={() => setShowFilterDialog(false)} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Filter Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

                {/* Service Category */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('search.serviceCategory')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {[{ value: '', label: t('search.all') }, { value: 'barber', label: t('search.barber') }, { value: 'hairdresser', label: t('search.hairdresser') }, { value: 'makeup', label: t('search.makeupArtist') }, { value: 'nails', label: t('search.nailTechnician') }, { value: 'massage', label: t('search.massageTherapist') }].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFilterCategory(opt.value)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition-colors ${
                          filterCategory === opt.value ? 'bg-[#244C70] border-[#244C70] text-white font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('search.sortBy')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'recommended', label: t('search.sortRecommended') },
                      { value: 'price-low', label: t('search.sortPriceLow'), icon: DollarSign },
                      { value: 'price-high', label: t('search.sortPriceHigh'), icon: DollarSign },
                      { value: 'rating', label: t('search.sortRating'), icon: Star },
                      ...(userLocation ? [{ value: 'distance', label: t('search.sortNearest'), icon: Navigation }] : []),
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFilterSortBy(opt.value)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm border transition-colors ${
                          filterSortBy === opt.value ? 'bg-[#244C70] border-[#244C70] text-white font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('search.date')}</h3>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#244C70]/30 focus:border-[#244C70] outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    {[t('search.today'), t('search.tomorrow'), t('search.thisWeek')].map((label, i) => {
                      const d = new Date();
                      if (i < 2) d.setDate(d.getDate() + i);
                      else d.setDate(d.getDate() + (7 - d.getDay()));
                      const val = d.toISOString().split('T')[0];
                      return (
                        <button
                          key={label}
                          onClick={() => setFilterDate(val)}
                          className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                            filterDate === val ? 'bg-[#244C70] text-white border-[#244C70]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('search.minRating')}</h3>
                  <div className="flex gap-2">
                    {[{ value: 0, label: t('search.any') }, { value: 3, label: '3+' }, { value: 4, label: '4+' }, { value: 4.5, label: '4.5+' }].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFilterRating(opt.value)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-colors ${
                          filterRating === opt.value ? 'bg-[#244C70] border-[#244C70] text-white font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {opt.value > 0 && <Star className="w-3.5 h-3.5 fill-current" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max Price */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('search.maxPrice')}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {[{ value: '', label: t('search.any') }, { value: '50', label: '50' }, { value: '100', label: '100' }, { value: '200', label: '200' }, { value: '500', label: '500' }].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setFilterPriceMax(opt.value)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-colors ${
                          filterPriceMax === opt.value ? 'bg-[#244C70] border-[#244C70] text-white font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {opt.value && <DollarSign className="w-3.5 h-3.5" />}
                        {opt.value ? `≤ ${opt.label}` : opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance (only when location is active) */}
                {userLocation && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('search.distance')}: {filterDistance} {t('search.km')}</h3>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={filterDistance}
                      onChange={e => setFilterDistance(Number(e.target.value))}
                      className="w-full accent-[#244C70]"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>5 {t('search.km')}</span>
                      <span>100 {t('search.km')}</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Dialog Footer */}
              <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => {
                    setFilterRating(0);
                    setFilterPriceMax('');
                    setFilterDistance(50);
                    setFilterSortBy('recommended');
                    setFilterDate('');
                    setFilterCategory('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('search.reset')}
                </button>
                <button
                  onClick={() => setShowFilterDialog(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#244C70] text-white text-sm font-semibold hover:bg-[#1a3a5a] transition-colors"
                >
                  {t('search.showResults')} ({filteredBusinesses.length})
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}