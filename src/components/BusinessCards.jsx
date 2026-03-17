'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Star, Clock, Briefcase, ChevronLeft, ChevronRight, Scissors, Sparkles, Hand, Palette, Phone, MessageCircle, Navigation } from 'lucide-react';
import Link from 'next/link';

const ACCENT_COLORS = {
  slate:  { bg: '#364153', light: '#e8ecf0' },
  amber:  { bg: '#D4AF37', light: '#fef9e7' },
  rose:   { bg: '#e11d48', light: '#fff1f2' },
  teal:   { bg: '#0d9488', light: '#f0fdfa' },
  violet: { bg: '#7c3aed', light: '#f5f3ff' },
  blue:   { bg: '#2563eb', light: '#eff6ff' },
};

const CATEGORY_ICONS = {
  barber: Scissors,
  hairdresser: Scissors,
  makeup: Palette,
  nails: Hand,
  massage: Sparkles,
};

// ─── SINGLE BUSINESS CARD ────────────────────────────────────
function BusinessCard({ business, t }) {
  const gallery = business.coverGallery || [];
  const [slideIndex, setSlideIndex] = useState(0);
  const accent = ACCENT_COLORS[business.accentColor] || ACCENT_COLORS.slate;

  useEffect(() => {
    if (gallery.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % gallery.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [gallery.length]);

  return (
    <div className="bg-white rounded-[5px] border border-gray-300 w-[260px] flex-shrink-0 snap-start overflow-hidden flex flex-col">
      {/* Cover */}
      <div className="relative">
        <div className="h-28 overflow-hidden relative" style={{ backgroundColor: accent.light }}>
          {business.showCoverPhoto && gallery.length > 0 ? (
            gallery.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`cover ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
                style={{ opacity: i === slideIndex ? 1 : 0 }}
              />
            ))
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent.light} 0%, ${accent.bg}22 100%)` }} />
          )}
        </div>
        {/* Avatar */}
        {business.showProfile && (
          <div className="absolute bottom-0 left-3 translate-y-1/2 z-10">
            {business.avatarUrl ? (
              <img
                src={business.avatarUrl}
                alt={business.businessName}
                className="w-12 h-12 rounded-full border-2 border-white shadow object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full border-2 border-white shadow bg-gray-200 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pb-3 pt-8 flex flex-col flex-1">
        <p className="text-sm font-bold text-[#364153] truncate">
          {business.businessName || t('businessCard.previewName')}
        </p>
        <p className="text-xs text-gray-400 truncate capitalize mb-2">
          {t(`home.type.${business.professionalType}`) || business.professionalType?.replace(/_/g, ' ')}
        </p>

        {/* Info chips */}
        <div className="flex flex-wrap gap-1 mb-2">
          {business.showLocation && business.city && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
              <MapPin className="w-3 h-3" />
              {business.city}
            </span>
          )}
          {business.showRating && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
              <Star className="w-3 h-3 fill-amber-400" />
              5.0
            </span>
          )}
          {business.showResponseTime && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
              <Clock className="w-3 h-3" />
              {t('businessCard.fastReply')}
            </span>
          )}
        </div>

        {/* Services */}
        {business.showServices && business.services.length > 0 && (
          <div className="mb-2">
            <div className="space-y-0.5">
              {business.services.slice(0, 2).map(s => (
                <div key={s.name} className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-600 truncate mr-2">{s.name}</span>
                  {business.showPrices && (
                    <span className="font-medium text-gray-800 whitespace-nowrap">{s.price} {s.currency}</span>
                  )}
                </div>
              ))}
            </div>
            {business.totalServices > 2 && (
              <p className="text-[11px] font-medium mt-1" style={{ color: accent.bg }}>
                +{business.totalServices - 2} {t('home.moreServices')}
              </p>
            )}
          </div>
        )}

        {/* Spacer pushes button to bottom */}
        <div className="flex-1" />

        {/* Action buttons row */}
        {(() => {
          const hasBooking = business.showBookingButton !== false;
          const hasDirections = business.showGetDirections;
          const hasCall = business.showCallButton && business.phone;
          const hasMsg = business.showMessageButton && business.phone;
          const hasMain = hasBooking || hasDirections;
          const contactOnly = !hasMain && (hasCall || hasMsg);
          const directionsUrl = business.latitude && business.longitude
            ? `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.city || business.businessName)}`;
          return (
            <div className="flex gap-1.5">
              {/* Booking button */}
              {hasBooking && (
                <button
                  className="flex-1 py-2 text-xs font-semibold text-white rounded-[5px] transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent.bg }}
                >
                  {t('businessCard.bookNow')}
                </button>
              )}
              {/* Get Directions button */}
              {hasDirections && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 py-2 text-xs font-semibold rounded-[5px] transition-opacity hover:opacity-90 flex items-center justify-center gap-1 ${
                    hasBooking ? 'border border-gray-400 text-gray-600' : 'text-white'
                  }`}
                  style={!hasBooking ? { backgroundColor: accent.bg } : undefined}
                >
                  <Navigation className="w-3 h-3" />
                  {t('businessCard.getDirections')}
                </a>
              )}
              {/* Call */}
              {hasCall && (
                <a
                  href={`tel:${business.phone}`}
                  className={`flex items-center justify-center rounded-[5px] transition-colors ${
                    contactOnly
                      ? 'flex-1 gap-1 py-2 text-xs font-semibold text-white hover:opacity-90'
                      : 'w-10 border border-gray-400 text-gray-600 hover:bg-gray-50'
                  }`}
                  style={contactOnly
                    ? { backgroundColor: accent.bg }
                    : undefined
                  }
                >
                  <Phone className="w-3.5 h-3.5" />
                  {contactOnly && t('businessCard.call')}
                </a>
              )}
              {/* Message */}
              {hasMsg && (
                <a
                  href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center rounded-[5px] transition-colors ${
                    contactOnly
                      ? 'flex-1 gap-1 py-2 text-xs font-semibold text-white hover:opacity-90'
                      : 'w-10 border border-gray-400 text-gray-600 hover:bg-gray-50'
                  }`}
                  style={contactOnly
                    ? { backgroundColor: accent.bg }
                    : undefined
                  }
                >
                  <MessageCircle className="w-3 h-3" />
                  {contactOnly && t('businessCard.message')}
                </a>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── SCROLLABLE CATEGORY ROW ─────────────────────────────────
function CategoryRow({ type, businesses, t, locale }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const Icon = CATEGORY_ICONS[type] || Scissors;

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener('scroll', checkScroll, { passive: true });
    return () => el?.removeEventListener('scroll', checkScroll);
  }, [businesses]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  if (!businesses || businesses.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Category header — aligned with page content */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[5px] bg-[#364153]/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#364153]" />
          </div>
          <h3 className="text-base font-bold text-[#364153]">
            {t(`home.category.${type}`)}
          </h3>
          <span className="text-xs text-gray-400 font-medium">({businesses.length})</span>
        </div>
        {/* Scroll arrows - desktop only */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable cards — breaks out of parent padding for edge-to-edge scroll */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide px-4 sm:px-6 lg:px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', scrollPaddingInline: '16px' }}
        >
          <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
          {businesses.map(biz => (
            <BusinessCard key={biz.id} business={biz} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SKELETON LOADER ─────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white rounded-[5px] border border-gray-200 w-[260px] flex-shrink-0 animate-pulse">
      <div className="h-28 bg-gray-100 rounded-t-[5px]" />
      <div className="px-3 pb-3 pt-8">
        <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
        <div className="flex gap-1 mb-3">
          <div className="h-5 bg-gray-100 rounded-full w-16" />
          <div className="h-5 bg-gray-100 rounded-full w-12" />
        </div>
        <div className="h-7 bg-gray-100 rounded-[5px]" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-8 h-8 rounded-[5px] bg-gray-100 animate-pulse" />
        <div className="h-5 w-24 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex gap-3 overflow-hidden px-4 sm:px-6 lg:px-8">
          {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

// ─── CATEGORY ORDER ──────────────────────────────────────────
const CATEGORY_ORDER = ['barber', 'hairdresser', 'makeup', 'nails', 'massage'];

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function BusinessCards() {
  const { isSignedIn, isLoaded } = useUser();
  const { t, locale } = useLanguage();
  const [businesses, setBusinesses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    const fetchBusinesses = async () => {
      try {
        const res = await fetch('/api/businesses');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setBusinesses(data.businesses || {});
      } catch {
        setBusinesses({});
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, [isLoaded, isSignedIn]);

  // Don't render anything for non-logged-in users
  if (!isLoaded || !isSignedIn) return null;

  const hasBusinesses = Object.values(businesses).some(arr => arr && arr.length > 0);

  return (
    <section className="bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#364153] sm:text-2xl">
            {t('home.businessesTitle')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('home.businessesSubtitle')}
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {/* Business cards by category */}
        {!loading && hasBusinesses && (
          CATEGORY_ORDER.map(type => (
            <CategoryRow
              key={type}
              type={type}
              businesses={businesses[type]}
              t={t}
              locale={locale}
            />
          ))
        )}

        {/* Empty state */}
        {!loading && !hasBusinesses && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">{t('home.noBusinesses')}</p>
          </div>
        )}
      </div>
    </section>
  );
}
