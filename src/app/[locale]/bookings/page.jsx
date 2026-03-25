'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/Sidebar';
import {
  ArrowLeft, Calendar, Clock, MapPin, Phone, Loader2,
  CheckCircle2, XCircle, AlertCircle, ChevronRight
} from 'lucide-react';

const ACCENT_COLORS = {
  slate:  { bg: '#364153' },
  amber:  { bg: '#D4AF37' },
  rose:   { bg: '#e11d48' },
  teal:   { bg: '#0d9488' },
  violet: { bg: '#7c3aed' },
  blue:   { bg: '#2563eb' },
};

const STATUS_CONFIG = {
  confirmed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'bookings.confirmed' },
  pending:   { icon: AlertCircle,  color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'bookings.pending' },
  cancelled: { icon: XCircle,      color: 'text-red-500',   bg: 'bg-red-50',   border: 'border-red-200',   label: 'bookings.cancelled' },
  completed: { icon: CheckCircle2, color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200',  label: 'bookings.completed' },
};

export default function BookingsPage() {
  const router = useRouter();
  const { t, locale, isRTL } = useLanguage();
  const { isSignedIn, isLoaded } = useUser();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleToggleSidebar = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-home-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-home-sidebar', handleToggleSidebar);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    fetch('/api/bookings')
      .then(res => res.json())
      .then(data => setBookings(data.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  const filters = [
    { id: 'all',       label: t('bookings.all') },
    { id: 'confirmed', label: t('bookings.confirmed') },
    { id: 'pending',   label: t('bookings.pending') },
    { id: 'cancelled', label: t('bookings.cancelled') },
    { id: 'completed', label: t('bookings.completed') },
  ];

  const filteredBookings = activeFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === activeFilter);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit', minute: '2-digit', hour12: locale !== 'fr',
      timeZone: 'UTC',
    });
  };

  const isUpcoming = (dateStr) => new Date(dateStr) > new Date();

  return (
    <div className={`min-h-screen bg-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="hidden sd:flex w-9 h-9 rounded-xl bg-gray-100 items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft className={`w-4.5 h-4.5 text-gray-700 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">{t('bookings.title')}</h1>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-3 pb-0 flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-gray-100">
        {filters.map(f => {
          const count = f.id !== 'all' ? bookings.filter(b => b.status === f.id).length : bookings.length;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`relative px-3 pb-2.5 pt-1 text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeFilter === f.id
                  ? 'text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              {f.label}
              <span className={`ml-1 text-[11px] ${
                activeFilter === f.id ? 'text-gray-500' : 'text-gray-300'
              }`}>
                {count}
              </span>
              {activeFilter === f.id && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-gray-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : !isSignedIn ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Calendar className="w-9 h-9 text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">{t('bookings.signInTitle')}</h2>
            <p className="text-[14px] text-gray-400 max-w-xs">{t('bookings.signInDesc')}</p>
            <div className="flex gap-3 mt-6">
              <Link
                href={`/${locale}/auth/user/sign-in`}
                className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-[#0F172A] transition-all hover:border-[#D4AF37]"
              >
                {t('login')}
              </Link>
              <Link
                href={`/${locale}/auth/user/sign-up`}
                className="rounded-full bg-[#0F172A] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1E293B]"
              >
                {t('signUp')}
              </Link>
            </div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Calendar className="w-9 h-9 text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">{t('bookings.empty')}</h2>
            <p className="text-[14px] text-gray-400 max-w-xs">{t('bookings.emptyDesc')}</p>
            <button onClick={() => router.push(`/${locale}`)}
              className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-[14px] font-semibold rounded-xl hover:bg-gray-800 transition-colors">
              {t('bookings.explore')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map(booking => {
              const accent = ACCENT_COLORS[booking.accentColor] || ACCENT_COLORS.slate;
              const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.confirmed;
              const StatusIcon = statusCfg.icon;
              const upcoming = isUpcoming(booking.startTime);

              return (
                <div
                  key={booking.id}
                  onClick={() => router.push(`/${locale}/b/${booking.businessId}`)}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors cursor-pointer">
                  
                  {/* Top: Business info + status */}
                  <div className="p-4 flex items-start gap-3">
                    {/* Avatar */}
                    <div className="shrink-0">
                      {booking.avatarUrl ? (
                        <img src={booking.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: accent.bg }}>
                          {booking.businessName?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-[14px] font-bold text-gray-900 truncate">{booking.businessName}</h3>
                          <p className="text-[12px] text-gray-500 capitalize mt-0.5">
                            {t(`home.type.${booking.professionalType}`) || booking.professionalType?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border} border`}>
                          <StatusIcon className="w-3 h-3" />
                          {t(statusCfg.label)}
                        </span>
                      </div>

                      {/* Service */}
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[13px] text-gray-700 font-medium truncate">{booking.service}</p>
                        {booking.price > 0 && (
                          <span className="text-[13px] font-bold text-gray-900 whitespace-nowrap ml-2">
                            {booking.price} MAD
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Date/time + actions */}
                  <div className="px-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[12px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(booking.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatTime(booking.startTime)}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Upcoming indicator */}
                  {upcoming && booking.status === 'confirmed' && (
                    <div className="h-0.5" style={{ backgroundColor: accent.bg }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
