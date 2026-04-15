'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useLanguage } from '@/contexts/LanguageContext';
import Sidebar from '@/components/Sidebar';
import {
  ArrowLeft, Calendar, Clock, MapPin, Phone, Loader2,
  CheckCircle2, XCircle, AlertCircle, ChevronRight,
  X, ChevronLeft, Pencil, Plus, Navigation, RotateCw,
} from 'lucide-react';

const HEALTH_MEDICAL_TYPES = new Set([
  'general_practitioner', 'orthodontist', 'cardiologist', 'ophthalmologist',
  'psychiatrist', 'gastroenterologist', 'neurologist', 'allergist',
  'urologist', 'pediatrician', 'std_specialist', 'hepatologist',
]);

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
  const { isSignedIn, isLoaded } = useAuthUser();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(null);
  const [dateOptions, setDateOptions] = useState([]);
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [closedMessage, setClosedMessage] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Service editing state
  const [availableServices, setAvailableServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [originalServiceName, setOriginalServiceName] = useState('');
  const [showAllServices, setShowAllServices] = useState(false);

  useEffect(() => {
    const handleToggleSidebar = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-home-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-home-sidebar', handleToggleSidebar);
  }, []);

  const fetchBookings = useCallback(() => {
    setFetchError(false);
    fetch('/api/bookings')
      .then(res => res.json())
      .then(data => setBookings(data.bookings || []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    fetchBookings();
  }, [isLoaded, isSignedIn, fetchBookings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise((resolve, reject) => {
        setFetchError(false);
        fetch('/api/bookings')
          .then(res => res.json())
          .then(data => { setBookings(data.bookings || []); resolve(); })
          .catch(() => { setFetchError(true); reject(); });
      });
    } catch {} finally {
      setRefreshing(false);
    }
  };

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

  const canModify = (booking) => {
    return (booking.status === 'pending' || booking.status === 'confirmed') && isUpcoming(booking.startTime);
  };

  // Open detail modal
  const openDetail = (booking, e) => {
    e.stopPropagation();
    setSelectedBooking(booking);
    setShowDetailModal(true);
    setEditMode(false);
    setShowCancelConfirm(false);
    setEditError(null);
  };

  const closeDetail = () => {
    setShowDetailModal(false);
    setSelectedBooking(null);
    setEditMode(false);
    setShowCancelConfirm(false);
    setSlots(null);
    setSelectedSlot(null);
    setEditError(null);
    setClosedMessage(null);
    setAvailableServices([]);
    setSelectedServices([]);
    setOriginalServiceName('');
    setShowAllServices(false);
  };

  // Cancel
  const handleCancel = async () => {
    if (!selectedBooking) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/bookings?id=${selectedBooking.id}`, { method: 'DELETE' });
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'cancelled' } : b));
        closeDetail();
      }
    } catch {}
    setCancelLoading(false);
  };

  // Reschedule helpers
  const formatDateStr = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const getDurationFromBooking = (booking) => {
    if (!booking.startTime || !booking.endTime) return 30;
    return Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000);
  };

  const getSelectedDuration = () => {
    if (selectedServices.length > 0) {
      return selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
    }
    return selectedBooking ? getDurationFromBooking(selectedBooking) : 30;
  };

  const loadSlots = async (dateStr, booking, duration) => {
    setSlotsLoading(true);
    setSlots(null);
    setClosedMessage(null);
    setSelectedSlot(null);
    setEditError(null);
    try {
      const dur = duration || getSelectedDuration();
      const res = await fetch(`/api/book/available-slots?businessId=${encodeURIComponent(booking.businessId)}&date=${dateStr}&duration=${dur}`);
      const data = await res.json();
      if (data.closed) {
        setSlots([]);
        setClosedMessage(data.message || t('bookings.businessClosed'));
      } else {
        setSlots((data.slots || []).filter(s => s.available));
        setClosedMessage(null);
      }
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const fetchAvailableServices = async (businessId) => {
    setServicesLoading(true);
    try {
      const res = await fetch(`/api/business-page/${encodeURIComponent(businessId)}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableServices(data.services || []);
        // Match current booking services by name
        if (selectedBooking) {
          const currentNames = selectedBooking.service.split(' + ').map(s => s.trim());
          setOriginalServiceName(selectedBooking.service);
          const matched = (data.services || []).filter(s => currentNames.includes(s.name));
          setSelectedServices(matched.length > 0 ? matched : []);
        }
      }
    } catch {} finally {
      setServicesLoading(false);
    }
  };

  const toggleService = (service) => {
    const exists = selectedServices.find(s => s.id === service.id);
    const updated = exists ? selectedServices.filter(s => s.id !== service.id) : [...selectedServices, service];
    setSelectedServices(updated);
    setSelectedSlot(null);
    if (rescheduleDate && updated.length > 0) {
      const newDur = updated.reduce((sum, s) => sum + s.durationMinutes, 0);
      loadSlots(rescheduleDate, selectedBooking, newDur);
    }
  };

  const handleAddMoreServices = () => {
    setShowAllServices(true);
    fetchAvailableServices(selectedBooking.businessId);
  };

  const startEdit = () => {
    setEditMode(true);
    setShowCancelConfirm(false);
    setOriginalServiceName(selectedBooking.service);
    const now = new Date();
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() + i);
      d.setUTCHours(0, 0, 0, 0);
      dates.push(d);
    }
    setDateOptions(dates);
    const initialDate = formatDateStr(dates[0]);
    setRescheduleDate(initialDate);
    loadSlots(initialDate, selectedBooking);
  };

  const handleDateChange = (dateStr) => {
    setRescheduleDate(dateStr);
    loadSlots(dateStr, selectedBooking);
  };

  const servicesChanged = () => {
    if (selectedServices.length === 0) return false;
    const newName = selectedServices.map(s => s.name).join(' + ');
    return newName !== originalServiceName;
  };

  const handleEditConfirm = async () => {
    if (!selectedBooking) return;
    const hasTimeChange = selectedSlot && rescheduleDate;
    const hasServiceChange = servicesChanged();
    if (!hasTimeChange && !hasServiceChange) return;

    setEditLoading(true);
    setEditError(null);
    try {
      const payload = { id: selectedBooking.id };
      if (hasTimeChange) {
        payload.date = rescheduleDate;
        payload.startTime = selectedSlot.start;
      }
      if (hasServiceChange) {
        payload.serviceIds = selectedServices.map(s => s.id);
      }
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update booking');
      }
      fetchBookings();
      closeDetail();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => {
              const referrer = document.referrer;
              const isAuthPage = referrer && (referrer.includes('/auth/') || referrer.includes('/sign-in') || referrer.includes('/sign-up'));
              if (!referrer || isAuthPage || window.history.length <= 1) {
                router.push(`/${locale}`);
              } else {
                router.back();
              }
            }}
            className="hidden sd:flex w-9 h-9 rounded-xl bg-gray-100 items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft className={`w-4.5 h-4.5 text-gray-700 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">{t('bookings.title')}</h1>
          </div>
          {isSignedIn && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
              title={t('common.refresh') || 'Refresh'}
            >
              <RotateCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
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
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-9 h-9 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">{t('bookings.errorTitle') || 'Something went wrong'}</h2>
            <p className="text-[14px] text-gray-400 max-w-xs">{t('bookings.errorDesc') || 'Could not load your bookings. Please try again.'}</p>
            <button onClick={() => { setLoading(true); fetchBookings(); }}
              className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-[14px] font-semibold rounded-xl hover:bg-gray-800 transition-colors">
              {t('bookings.retry') || 'Retry'}
            </button>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Calendar className="w-9 h-9 text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              {t(`bookings.empty_${activeFilter}`) || t('bookings.empty')}
            </h2>
            <p className="text-[14px] text-gray-400 max-w-xs">
              {t(`bookings.emptyDesc_${activeFilter}`) || t('bookings.emptyDesc')}
            </p>
            {activeFilter === 'all' && (
              <button onClick={() => router.push(`/${locale}`)}
                className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-[14px] font-semibold rounded-xl hover:bg-gray-800 transition-colors">
                {t('bookings.explore')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map(booking => {
              const accent = ACCENT_COLORS[booking.accentColor] || ACCENT_COLORS.slate;
              const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.confirmed;
              const StatusIcon = statusCfg.icon;
              const upcoming = isUpcoming(booking.startTime);
              const modifiable = canModify(booking);

              return (
                <div
                  key={booking.id}
                  onClick={(e) => openDetail(booking, e)}
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
                        {booking.price > 0 && !HEALTH_MEDICAL_TYPES.has(booking.professionalType) && (
                          <span className="text-[13px] font-bold text-gray-900 whitespace-nowrap ml-2">
                            {booking.price} MAD
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Date/time */}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Detail / Cancel / Reschedule Modal ═══ */}
      {showDetailModal && selectedBooking && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" onClick={closeDetail}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {editMode ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditMode(false); setEditError(null); setAvailableServices([]); setSelectedServices([]); }} className="p-1 -ml-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                      <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                    <h2 className="text-lg font-bold text-gray-900">{t('bookings.editBooking')}</h2>
                  </div>
                ) : showCancelConfirm ? (
                  <h2 className="text-lg font-bold text-gray-900">{t('bookings.cancelTitle')}</h2>
                ) : (
                  <h2 className="text-lg font-bold text-gray-900 truncate">{selectedBooking.businessName}</h2>
                )}
              </div>
              <button onClick={closeDetail} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-5 overflow-y-auto flex-1">
              {showCancelConfirm ? (
                /* Cancel confirmation */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <p className="text-sm text-red-700">{t('bookings.cancelMessage')}</p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{selectedBooking.service}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(selectedBooking.startTime)} · {formatTime(selectedBooking.startTime)}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {t('bookings.goBack')}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelLoading}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {cancelLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {t('bookings.confirmCancel')}
                    </button>
                  </div>
                </div>
              ) : editMode ? (
                /* Edit booking view */
                <div className="space-y-4">
                  {/* Info banner */}
                  {selectedBooking.status === 'confirmed' && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">{t('bookings.rescheduleInfo')}</p>
                    </div>
                  )}

                  {/* Services section */}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">{t('bookings.services')}</p>
                    {!showAllServices ? (
                      /* Show current service + add more button */
                      <div className="space-y-2">
                        <div className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-900 bg-gray-50">
                          <div className="w-5 h-5 rounded-md border-2 bg-gray-900 border-gray-900 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{selectedBooking.service}</p>
                          </div>
                          {selectedBooking.price > 0 && !HEALTH_MEDICAL_TYPES.has(selectedBooking.professionalType) && (
                            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{selectedBooking.price} MAD</span>
                          )}
                        </div>
                        <button
                          onClick={handleAddMoreServices}
                          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          {t('bookings.addMoreServices')}
                        </button>
                      </div>
                    ) : servicesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      </div>
                    ) : availableServices.length > 0 ? (
                      <div className="space-y-2">
                        {availableServices.map((service) => {
                          const isSelected = selectedServices.some(s => s.id === service.id);
                          return (
                            <button
                              key={service.id}
                              onClick={() => toggleService(service)}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'border-gray-900 bg-gray-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{service.name}</p>
                                <p className="text-xs text-gray-500">{service.durationMinutes} min</p>
                              </div>
                              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{service.price} {service.currency || 'MAD'}</span>
                            </button>
                          );
                        })}
                        {/* Total summary */}
                        {selectedServices.length > 0 && (
                          <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded-xl text-sm">
                            <span className="text-gray-600">{t('bookings.totalDuration')}: <span className="font-semibold text-gray-900">{selectedServices.reduce((s, svc) => s + svc.durationMinutes, 0)} min</span></span>
                            <span className="font-bold text-gray-900">{selectedServices.reduce((s, svc) => s + svc.price, 0)} {availableServices[0]?.currency || 'MAD'}</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {/* Current time */}
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">{t('bookings.currentTime')}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(selectedBooking.startTime)} · {formatTime(selectedBooking.startTime)}{!HEALTH_MEDICAL_TYPES.has(selectedBooking.professionalType) && (() => {
                          const start = new Date(selectedBooking.startTime);
                          const end = new Date(start.getTime() + getSelectedDuration() * 60000);
                          return ` - ${formatTime(end.toISOString())}`;
                        })()}
                      </p>
                      {!HEALTH_MEDICAL_TYPES.has(selectedBooking.professionalType) && (
                        <span className="text-xs text-gray-500">{getSelectedDuration()} min</span>
                      )}
                    </div>
                  </div>

                  {/* Date picker */}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">{t('bookings.selectDate')}</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {dateOptions.map((d) => {
                        const ds = formatDateStr(d);
                        const isActive = ds === rescheduleDate;
                        const dayName = d.toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', timeZone: 'UTC' });
                        const dayNum = d.getUTCDate();
                        return (
                          <button
                            key={ds}
                            onClick={() => handleDateChange(ds)}
                            className={`flex flex-col items-center px-3 py-2 rounded-xl min-w-[52px] text-xs font-medium transition-all border ${
                              isActive
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="text-[10px] uppercase">{dayName}</span>
                            <span className="text-base font-bold mt-0.5">{dayNum}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">{t('bookings.selectTime')}</p>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                      </div>
                    ) : closedMessage ? (
                      <div className="text-center py-6">
                        <XCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{closedMessage}</p>
                      </div>
                    ) : slots && slots.length === 0 ? (
                      <div className="text-center py-6">
                        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t('bookings.noSlots')}</p>
                      </div>
                    ) : slots ? (
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((slot) => {
                          const isSelected = selectedSlot && slot.start >= selectedSlot.start && slot.start < selectedSlot.end;
                          const isStart = selectedSlot?.start === slot.start;
                          return (
                            <button
                              key={slot.start}
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-2 px-3 rounded-xl text-sm font-medium transition-all border ${
                                isStart
                                  ? 'bg-gray-900 text-white border-gray-900'
                                  : isSelected
                                    ? 'bg-gray-200 text-gray-900 border-gray-400'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {slot.start}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {editError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-xs text-red-600">{editError}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Detail view */
                <div className="space-y-4">
                  {/* Business header */}
                  <div className="flex items-center gap-3">
                    {selectedBooking.avatarUrl ? (
                      <img src={selectedBooking.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold"
                        style={{ backgroundColor: (ACCENT_COLORS[selectedBooking.accentColor] || ACCENT_COLORS.slate).bg }}>
                        {selectedBooking.businessName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{selectedBooking.businessName}</h3>
                      <p className="text-xs text-gray-500 capitalize">
                        {t(`home.type.${selectedBooking.professionalType}`) || selectedBooking.professionalType?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {(() => {
                      const statusConfig = STATUS_CONFIG[selectedBooking.status];
                      const Icon = statusConfig.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
                          <Icon className="w-3 h-3" />
                          {t(statusConfig.label)}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Contact & Directions buttons */}
                  {(selectedBooking.businessPhone || (selectedBooking.latitude && selectedBooking.longitude)) && (
                    <div className="flex gap-2">
                      {selectedBooking.businessPhone && (
                        <a
                          href={`tel:${selectedBooking.businessPhone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {t('bookings.contact')}
                        </a>
                      )}
                      {selectedBooking.latitude && selectedBooking.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBooking.latitude},${selectedBooking.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          {t('bookings.getDirections')}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Appointment details card */}
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    {/* Service + Price */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{selectedBooking.service}</p>
                      {selectedBooking.price > 0 && !HEALTH_MEDICAL_TYPES.has(selectedBooking.professionalType) && (
                        <span className="text-sm font-bold text-gray-900">{selectedBooking.price} MAD</span>
                      )}
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(selectedBooking.startTime)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {HEALTH_MEDICAL_TYPES.has(selectedBooking.professionalType)
                          ? formatTime(selectedBooking.startTime)
                          : `${formatTime(selectedBooking.startTime)} - ${formatTime(selectedBooking.endTime)}`}
                      </span>
                    </div>

                    {/* Duration */}
                    {!HEALTH_MEDICAL_TYPES.has(selectedBooking.professionalType) && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{getDurationFromBooking(selectedBooking)} min</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {selectedBooking.notes && (
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">{t('bookings.notes')}</p>
                      <p className="text-sm text-gray-700">{selectedBooking.notes}</p>
                    </div>
                  )}

                  {/* Action buttons - only for modifiable bookings */}
                  {canModify(selectedBooking) && (
                    <div className="flex gap-3">
                      <button
                        onClick={startEdit}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        <span className="sm:hidden">{t('bookings.editBookingShort')}</span>
                        <span className="hidden sm:inline">{t('bookings.editBooking')}</span>
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        className="flex-1 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="sm:hidden">{t('bookings.cancelBtnShort')}</span>
                        <span className="hidden sm:inline">{t('bookings.cancelBtn')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky confirm button */}
            {editMode && !showCancelConfirm && (
              <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                <button
                  onClick={handleEditConfirm}
                  disabled={(!selectedSlot && !servicesChanged()) || editLoading || (showAllServices && selectedServices.length === 0)}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    (selectedSlot || servicesChanged()) && !(showAllServices && selectedServices.length === 0)
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('bookings.confirmChanges')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
