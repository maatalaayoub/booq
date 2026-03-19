'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Phone,
  MessageCircle,
  Navigation,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Scissors,
  Info,
  Share2,
  Heart,
  User,
  FileText,
} from 'lucide-react';

const ACCENT_COLORS = {
  slate:  { bg: '#364153', light: '#e8ecf0' },
  amber:  { bg: '#D4AF37', light: '#fef9e7' },
  rose:   { bg: '#e11d48', light: '#fff1f2' },
  teal:   { bg: '#0d9488', light: '#f0fdfa' },
  violet: { bg: '#7c3aed', light: '#f5f3ff' },
  blue:   { bg: '#2563eb', light: '#eff6ff' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

/* ================================================================
   HERO GALLERY  — compact with integrated profile
   ================================================================ */
function HeroGallery({ gallery, accent, showCover, businessName, businessType, avatarUrl }) {
  const [idx, setIdx] = useState(0);
  const touchRef = useRef(null);

  useEffect(() => {
    if (gallery.length <= 1) return;
    const t = setInterval(() => setIdx(p => (p + 1) % gallery.length), 5000);
    return () => clearInterval(t);
  }, [gallery.length]);

  const handleTouchStart = (e) => { touchRef.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchRef.current === null) return;
    const diff = touchRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) setIdx(p => diff > 0 ? (p + 1) % gallery.length : (p - 1 + gallery.length) % gallery.length);
    touchRef.current = null;
  };

  if (!showCover || gallery.length === 0) {
    return (
      <div className="h-48 sd:h-56 w-full relative" style={{ background: `linear-gradient(135deg, ${accent.bg} 0%, ${accent.bg}cc 50%, ${accent.bg}88 100%)` }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.1)_0%,transparent_60%)]" />
        {/* Business name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sd:p-8 z-10">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            {avatarUrl && (
              <img src={avatarUrl} alt="" className="w-12 h-12 rounded-xl border-2 border-white/30 object-cover" />
            )}
            <div>
              <h1 className="text-xl sd:text-2xl font-bold text-white leading-tight drop-shadow-sm">{businessName}</h1>
              <p className="text-[13px] text-white/70 capitalize mt-0.5">{businessType}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-52 sd:h-64 w-full relative overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {gallery.map((url, i) => (
        <img key={url} src={url} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700" style={{ opacity: i === idx ? 1 : 0 }} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
      {/* Business name overlay on the hero */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sd:p-8 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {avatarUrl && (
            <img src={avatarUrl} alt="" className="w-12 h-12 rounded-xl border-2 border-white/30 object-cover" />
          )}
          <div>
            <h1 className="text-xl sd:text-2xl font-bold text-white leading-tight drop-shadow-sm">{businessName}</h1>
            <p className="text-[13px] text-white/70 capitalize mt-0.5">{businessType}</p>
          </div>
        </div>
      </div>
      {gallery.length > 1 && (
        <div className="absolute bottom-3 right-5 flex gap-1.5 z-10">
          {gallery.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   TAB BAR — sticky, Booksy-style
   ================================================================ */
function TabBar({ tabs, activeTab, onTabChange, accent }) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="max-w-5xl mx-auto flex">
        {tabs.map(tab => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 py-3.5 text-[13px] font-semibold tracking-wide uppercase transition-colors relative ${
                active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full" style={{ backgroundColor: accent.bg }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   SERVICE ROW — multi-select with checkbox
   ================================================================ */
function ServiceRow({ service, isSelected, onToggle, canBook, showPrices, accent, t }) {
  return (
    <div
      className={`flex items-center gap-3 py-4 transition-colors cursor-pointer rounded-xl px-2 -mx-2 ${isSelected ? '' : 'hover:bg-gray-50'}`}
      style={isSelected ? { backgroundColor: `${accent.bg}06` } : undefined}
      onClick={() => canBook && onToggle(service)}
    >
      {/* Checkbox */}
      {canBook && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(service); }}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-transparent' : 'border-gray-300'}`}
          style={isSelected ? { backgroundColor: accent.bg } : undefined}
        >
          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
      )}

      {/* Left icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: isSelected ? `${accent.bg}15` : '#f3f4f6' }}
      >
        <Scissors className="w-[18px] h-[18px]" style={{ color: isSelected ? accent.bg : '#9ca3af' }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-gray-900 leading-tight">{service.name}</p>
        {service.description && (
          <p className="text-[13px] text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[12px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {service.durationMinutes} min
          </span>
        </div>
      </div>

      {/* Price */}
      {service.price > 0 && (
        <span className="text-[14px] font-bold shrink-0" style={{ color: accent.bg }}>
          {service.price} {service.currency}
        </span>
      )}
    </div>
  );
}

/* ================================================================
   DATE STRIP — horizontal scrolling dates
   ================================================================ */
function DateStrip({ selectedDate, onSelectDate, businessHours, accent, t }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startDate = addDays(today, weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const isOpenDay = (d) => {
    if (!businessHours?.length) return true;
    return businessHours.find(h => h.dayOfWeek === d.getDay())?.isOpen === true;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">{t('bp.selectDate')}</p>
        <div className="flex gap-1">
          <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0}
            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)} disabled={weekOffset >= 4}
            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 disabled:opacity-30 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {days.map(day => {
          const sel = selectedDate && isSameDay(day, selectedDate);
          const closed = !isOpenDay(day);
          const past = day < today;
          const dis = closed || past;
          const isToday = isSameDay(day, today);
          return (
            <button key={day.toISOString()} disabled={dis} onClick={() => onSelectDate(day)}
              className={`flex flex-col items-center min-w-[56px] py-2.5 rounded-[5px] border transition-all ${
                sel ? 'border-transparent text-white' : dis ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
              style={sel ? { backgroundColor: accent.bg, borderColor: accent.bg } : undefined}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {isToday ? t('bp.today') : t(`bp.day.${DAY_NAMES[day.getDay()].toLowerCase()}`)}
              </span>
              <span className="text-xl font-extrabold leading-tight">{day.getDate()}</span>
              <span className="text-[10px] font-medium opacity-70">{day.toLocaleDateString('en', { month: 'short' })}</span>
              {closed && !past && <span className="text-[7px] text-red-400 font-bold mt-0.5">{t('bp.closed')}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   TIME SLOT GRID
   ================================================================ */
function TimeSlotGrid({ slots, selectedSlot, onSelectSlot, loading, accent, t, userBookings }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin mb-2" style={{ color: accent.bg }} />
        <span className="text-[13px] text-gray-400">{t('bp.loadingSlots')}</span>
      </div>
    );
  }

  if (!slots?.length) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-[13px] text-gray-400">{t('bp.noSlots')}</p>
      </div>
    );
  }

  const available = slots.filter(s => s.available);
  if (!available.length) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-orange-200 mx-auto mb-2" />
        <p className="text-[13px] text-gray-400">{t('bp.fullyBooked')}</p>
      </div>
    );
  }

  const findUserBooking = (slotStart, slotEnd) => {
    return (userBookings || []).find(b => slotStart < b.end && slotEnd > b.start);
  };

  return (
    <div>
      <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('bp.selectTime')}</p>
      <div className="grid grid-cols-3 sd:grid-cols-4 gap-2">
        {slots.map(slot => {
          const sel = selectedSlot?.start === slot.start;
          const matchedBooking = findUserBooking(slot.start, slot.end);
          const userBooked = matchedBooking?.status;
          const isBooked = !!matchedBooking;
          return (
            <button key={slot.start} disabled={!slot.available || isBooked} onClick={() => onSelectSlot(slot)}
              className={`relative py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                isBooked
                  ? 'bg-white border-2 cursor-not-allowed'
                  : sel ? 'text-white shadow-lg scale-[1.02]'
                  : slot.available ? 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
              }`}
              style={
                isBooked
                  ? { borderColor: userBooked === 'confirmed' ? '#16a34a' : '#f59e0b', color: userBooked === 'confirmed' ? '#16a34a' : '#f59e0b' }
                  : sel ? { backgroundColor: accent.bg } : undefined
              }
            >
              {slot.start}
              {isBooked && (
                <span className={`block text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                  userBooked === 'confirmed' ? 'text-green-600' : 'text-amber-500'
                }`}>
                  {userBooked === 'confirmed' ? t('bp.approved') : t('bp.pending')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   BOOKING FORM MODAL
   ================================================================ */
function BookingModal({ open, onClose, business, services, date, slot, accent, t, onSuccess }) {
  const { user } = useUser();
  const [step, setStep] = useState('form'); // 'form' | 'summary'
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const totalPrice = services?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;
  const totalDuration = services?.reduce((sum, s) => sum + s.durationMinutes, 0) || 0;

  useEffect(() => {
    if (open && user) {
      setStep('form');
      setClientName(user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim());
      setClientPhone('');
      setNotes('');
      setError(null);
    }
  }, [open, user]);

  if (!open) return null;

  const handleContinueToSummary = () => {
    if (!clientName.trim()) { setError(t('bp.nameRequired')); return; }
    if (!clientPhone.trim()) { setError(t('bp.phoneRequired')); return; }
    setError(null);
    setStep('summary');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/book/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          serviceIds: services.map(s => s.id),
          date: formatDate(date),
          startTime: slot.start,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      onSuccess(data.appointment);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sd:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sd:max-w-md sd:mx-4 bg-white sd:rounded-[5px] rounded-t-[5px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Drag handle (mobile) */}
        <div className="sd:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            {step === 'summary' && (
              <button onClick={() => setStep('form')} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
            )}
            <h3 className="text-lg font-bold text-gray-900">
              {step === 'form' ? t('bp.yourDetails') : t('bp.bookingSummary')}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {step === 'form' ? (
          /* ── STEP 1: Contact Details Form ── */
          <div className="px-5 pb-6 space-y-4">
            {/* Compact info bar */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-[13px]">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-3.5 h-3.5" />
                <span>{date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                <span className="text-gray-300">•</span>
                <span>{slot.start}</span>
              </div>
              {business.showPrices && (
                <span className="font-bold" style={{ color: accent.bg }}>{totalPrice} {services[0]?.currency || 'MAD'}</span>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">{t('bp.yourName')} <span className="text-red-500">*</span></label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} maxLength={100}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0" style={{ '--tw-ring-color': `${accent.bg}40` }}
                placeholder={t('bp.namePlaceholder')} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">{t('bp.phone')} <span className="text-red-500">*</span></label>
              <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} maxLength={30}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0" style={{ '--tw-ring-color': `${accent.bg}40` }}
                placeholder="+212 6XX-XXXXXX" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">{t('bp.notesOptional')}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} rows={2}
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 resize-none" style={{ '--tw-ring-color': `${accent.bg}40` }}
                placeholder={t('bp.notesPlaceholder')} />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            {/* Continue button */}
            <button onClick={handleContinueToSummary}
              className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: accent.bg }}>
              {t('bp.continueToDetails')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ── STEP 2: Full Booking Summary ── */
          <div className="px-5 pb-6">
            {/* Services list */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{t('bp.services')}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {services.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent.bg}15` }}>
                      <Scissors className="w-4 h-4" style={{ color: accent.bg }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-gray-900">{s.name}</p>
                      <span className="text-[12px] text-gray-400">{s.durationMinutes} min</span>
                    </div>
                    {business.showPrices && (
                      <span className="text-[13px] font-bold" style={{ color: accent.bg }}>{s.price} {s.currency}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{t('bp.dateAndTime')}</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-[14px] text-gray-900">
                    {date.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-[14px] text-gray-900">{slot.start} – {slot.end}</span>
                  <span className="text-[12px] text-gray-400">({totalDuration} min)</span>
                </div>
              </div>
            </div>

            {/* Client info */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{t('bp.yourDetails')}</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-[14px] text-gray-900">{clientName}</span>
                </div>
                {clientPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-[14px] text-gray-900">{clientPhone}</span>
                  </div>
                )}
                {notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-[14px] text-gray-900">{notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total */}
            {business.showPrices && (
              <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl mb-6">
                <span className="text-[14px] font-medium text-gray-600">{t('bp.total')}</span>
                <span className="text-lg font-bold" style={{ color: accent.bg }}>{totalPrice} {services[0]?.currency || 'MAD'}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: accent.bg }}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {submitting ? t('bp.booking') : t('bp.submitBooking')}
            </button>

            <p className="text-[11px] text-center text-gray-400 mt-3">{t('bp.pendingNote')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   SUCCESS MODAL
   ================================================================ */
function SuccessModal({ appointment, onClose, accent, t }) {
  if (!appointment) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-[5px] shadow-2xl overflow-hidden text-center">
        <div className="px-6 py-10">
          <div className="w-20 h-20 rounded-full mx-auto mb-5 relative bg-amber-50">
            <Clock className="w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{t('bp.bookingSubmitted')}</h3>
          <p className="text-[14px] text-gray-400 mb-6">{t('bp.bookingPendingDesc')}</p>

          {/* Pending badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[12px] font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t('bp.pendingConfirmation')}
          </div>

          <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 mb-8">
            {[
              [t('bp.service'), appointment.service],
              [t('bp.date'), new Date(appointment.startTime).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })],
              [t('bp.time'), new Date(appointment.startTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-[14px]">
                <span className="text-gray-400">{label}</span>
                <span className="font-semibold text-gray-900">{val}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-gray-200 flex justify-between text-[14px]">
              <span className="text-gray-400">{t('bp.price')}</span>
              <span className="font-bold text-lg" style={{ color: accent.bg }}>{appointment.price} MAD</span>
            </div>
          </div>

          <button onClick={onClose}
            className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: accent.bg }}>
            {t('bp.done')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function BusinessPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const { t, locale, isRTL } = useLanguage();
  const businessId = params.id;

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('services');

  // Booking state
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const favs = JSON.parse(localStorage.getItem('favoriteBusinesses') || '[]');
    setIsFavorited(favs.includes(businessId));
  }, [businessId]);

  const toggleFavorite = () => {
    const favs = JSON.parse(localStorage.getItem('favoriteBusinesses') || '[]');
    const updated = isFavorited ? favs.filter(id => id !== businessId) : [...favs, businessId];
    localStorage.setItem('favoriteBusinesses', JSON.stringify(updated));
    setIsFavorited(!isFavorited);
  };

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);

  const bookingRef = useRef(null);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`/api/business-page/${businessId}`)
      .then(res => { if (!res.ok) throw new Error('not found'); return res.json(); })
      .then(data => { setBusiness(data); })
      .catch(() => setError('not_found'))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (!selectedDate || selectedServices.length === 0 || !business) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    fetch(`/api/book/available-slots?businessId=${business.id}&date=${formatDate(selectedDate)}&duration=${totalDuration}`)
      .then(res => res.json())
      .then(data => {
        setSlots(data.slots || []);
        setUserBookings(data.userBookings || []);
      })
      .catch(() => { setSlots([]); setUserBookings([]); })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedServices, business, totalDuration]);

  const accent = business ? (ACCENT_COLORS[business.accentColor] || ACCENT_COLORS.slate) : ACCENT_COLORS.slate;
  const canBook = business?.showBookingButton && business?.serviceMode !== 'walkin';

  const directionsUrl = business?.latitude && business?.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`
    : business?.city ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.city)}` : null;

  const handleToggleService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        const next = prev.filter(s => s.id !== service.id);
        if (next.length === 0) setSelectedDate(null);
        return next;
      }
      if (prev.length === 0) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        setSelectedDate(today);
      }
      return [...prev, service];
    });
    setSelectedSlot(null);
    setSlots([]);
  };

  const handleContinueBooking = () => {
    setShowBookingPanel(true);
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleBookNow = () => {
    if (!isSignedIn) { router.push(`/${locale}/auth/user/sign-in`); return; }
    setShowBookingModal(true);
  };

  const handleBookingSuccess = (appointment) => {
    setShowBookingModal(false);
    setBookedAppointment(appointment);
    setSelectedSlot(null);
    if (selectedDate && selectedServices.length > 0 && business) {
      fetch(`/api/book/available-slots?businessId=${business.id}&date=${formatDate(selectedDate)}&duration=${totalDuration}`)
        .then(res => res.json()).then(data => {
          setSlots(data.slots || []);
          setUserBookings(data.userBookings || []);
        }).catch(() => {});
    }
  };

  // TAB DEFINITIONS
  const tabs = [
    { id: 'services', label: t('bp.services') },
    { id: 'hours', label: t('bp.workingHours') },
    { id: 'about', label: t('bp.location') },
  ];

  /* ── LOADING SKELETON ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-56 sd:h-80 bg-gray-200 animate-pulse" />
        <div className="max-w-5xl mx-auto px-5 sd:px-8 -mt-16 relative z-10">
          <div className="flex items-end gap-4 mb-6">
            <div className="w-20 h-20 sd:w-24 sd:h-24 rounded-2xl bg-gray-300 border-4 border-white shadow-lg animate-pulse" />
            <div className="flex-1 pb-1">
              <div className="h-6 w-48 bg-gray-200 rounded-lg mb-2 animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="flex gap-3 mb-8">
            {[1, 2, 3].map(i => <div key={i} className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse" />)}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-100 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-100 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-20 bg-gray-50 rounded animate-pulse" />
                </div>
                <div className="w-20 h-9 rounded-xl bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── NOT FOUND ─────────────────────────────────────────────── */
  if (error || !business) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <Briefcase className="w-8 h-8 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('bp.notFound')}</h2>
          <p className="text-[14px] text-gray-400 mb-8">{t('bp.notFoundDesc')}</p>
          <Link href={`/${locale}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#364153] text-white text-[14px] font-semibold rounded-xl hover:bg-[#364153]/90 transition-colors">
            <ArrowLeft className="w-4 h-4" />{t('bp.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* ── HERO GALLERY ──────────────────────────────────── */}
      <div className="relative">
        <HeroGallery
          gallery={business.coverGallery}
          accent={accent}
          showCover={business.showCoverPhoto}
          businessName={business.businessName}
          businessType={t(`home.type.${business.professionalType}`) || business.professionalType?.replace(/_/g, ' ')}
          avatarUrl={business.showProfile ? business.avatarUrl : null}
        />
        {/* Top nav buttons */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20">
          <button onClick={() => router.back()}
            className="w-10 h-10 rounded-xl bg-black/25 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition-colors">
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex gap-2">
            <button onClick={toggleFavorite}
              className="w-10 h-10 rounded-xl bg-black/25 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors">
              <Heart className={`w-[18px] h-[18px] transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
            <button onClick={async () => {
              const url = window.location.href;
              const shareData = { title: document.title, text: document.title, url };
              if (navigator.canShare && navigator.canShare(shareData)) {
                try { await navigator.share(shareData); } catch {}
                return;
              }
              if (typeof navigator.share === 'function') {
                try { await navigator.share(shareData); } catch {}
                return;
              }
              setShowShareMenu(true);
            }}
              className="w-10 h-10 rounded-xl bg-black/25 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/40 transition-colors">
              <Share2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── SHARE MENU OVERLAY ─────────────────────────────── */}
      {showShareMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowShareMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl p-5 pb-8 animate-[slideUp_0.25s_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
            <h3 className="text-[15px] font-bold text-gray-900 mb-4 text-center">{t('bp.shareTitle') || 'Share'}</h3>
            <div className="grid grid-cols-4 gap-4 mb-5">
              {/* WhatsApp */}
              <a href={`https://wa.me/?text=${encodeURIComponent(business.businessName + ' ' + window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.252-.149-2.868.852.852-2.868-.168-.268A8 8 0 1112 20z"/></svg>
                </div>
                <span className="text-[11px] text-gray-600">WhatsApp</span>
              </a>
              {/* Facebook */}
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <span className="text-[11px] text-gray-600">Facebook</span>
              </a>
              {/* X / Twitter */}
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(business.businessName)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <span className="text-[11px] text-gray-600">X</span>
              </a>
              {/* Copy link */}
              <button onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                } catch {
                  const ta = document.createElement('textarea');
                  ta.value = window.location.href;
                  ta.style.cssText = 'position:fixed;opacity:0';
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                }
                setShowShareMenu(false);
                setShowCopiedToast(true);
                setTimeout(() => setShowCopiedToast(false), 2500);
              }}
                className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                </div>
                <span className="text-[11px] text-gray-600">{t('bp.copyLink') || 'Copy link'}</span>
              </button>
            </div>
            <button onClick={() => setShowShareMenu(false)}
              className="w-full py-3 text-[14px] font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              {t('bp.cancel') || 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* ── COPIED TOAST ─────────────────────────────────── */}
      {showCopiedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-[fadeInDown_0.3s_ease-out]">
          <div className="flex items-center gap-2.5 px-5 py-3 bg-gray-900 text-white rounded-xl shadow-2xl">
            <svg className="w-5 h-5 text-green-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            <span className="text-[14px] font-medium">{t('bp.linkCopied')}</span>
          </div>
        </div>
      )}

      {/* ── INFO BAR ── rating, location, actions ─────────── */}
      <div className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 sd:px-8 py-3 space-y-2.5 sd:space-y-0 sd:flex sd:items-center sd:justify-between sd:gap-3">
          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-2">
            {business.showRating && (
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-amber-600">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                5.0
              </span>
            )}
            {business.showRating && business.showLocation && business.city && (
              <span className="text-gray-300">·</span>
            )}
            {business.showLocation && business.city && (
              <span className="inline-flex items-center gap-1 text-[13px] text-gray-500">
                <MapPin className="w-3.5 h-3.5" />
                {business.city}
              </span>
            )}
            {business.showResponseTime && (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1 text-[13px] text-green-600 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {t('businessCard.fastReply')}
                </span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {business.showCallButton && business.phone && (
              <a href={`tel:${business.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors text-[12px] font-medium">
                <Phone className="w-3.5 h-3.5" />
                {t('businessCard.call')}
              </a>
            )}
            {business.showMessageButton && business.phone && (
              <a href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors text-[12px] font-medium">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.252-.149-2.868.852.852-2.868-.168-.268A8 8 0 1112 20z"/></svg>
                {t('businessCard.message')}
              </a>
            )}
            {business.showGetDirections && directionsUrl && (
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-[12px] font-medium">
                <Navigation className="w-3.5 h-3.5" />
                {t('businessCard.getDirections')}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── TAB BAR (mobile only) ────────────────────────── */}
      <div className="sd:hidden">
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} accent={accent} />
      </div>

      {/* ── CONTENT ───────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-5 sd:px-8 py-6 space-y-6">
        {/* ── SERVICES + BOOKING (single card on desktop) ── */}
        <div className="sd:bg-white sd:border sd:border-gray-300 sd:rounded-lg sd:p-6">
          <div className="sd:flex sd:gap-6">
            {/* ── LEFT: SERVICES ───────────────────────────── */}
            <div className="sd:flex-1 min-w-0">

              {/* ─── SERVICES ─────────────────────────────── */}
              <div className={`${activeTab !== 'services' ? 'hidden sd:block' : ''}`}>
                {business.showServices && business.services.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-900">{t('bp.services')}</h2>
                      <span className="text-[13px] text-gray-400 font-medium">{business.services.length} {business.services.length === 1 ? 'service' : 'services'}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                    {business.services.map(service => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        isSelected={selectedServices.some(s => s.id === service.id)}
                        onToggle={handleToggleService}
                        canBook={canBook}
                        showPrices={business.showPrices}
                        accent={accent}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Scissors className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-[14px] text-gray-400">{t('bp.noSlots')}</p>
                </div>
              )}

              {/* Walk-in notice */}
              {business.serviceMode === 'walkin' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl mt-6">
                  <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-amber-700 leading-relaxed">{t('bp.walkinOnly')}</p>
                </div>
              )}

              {/* Mobile booking panel */}
              {canBook && showBookingPanel && selectedServices.length > 0 && (
                <div ref={bookingRef} className="sd:hidden mt-6">
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-5">
                    <div className="pb-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">{t('bp.selectedServices')}</p>
                        <button onClick={() => setShowBookingPanel(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {selectedServices.map(s => (
                          <div key={s.id} className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent.bg}12` }}>
                              <Scissors className="w-3.5 h-3.5" style={{ color: accent.bg }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</p>
                              <span className="text-[11px] text-gray-400">{s.durationMinutes} min</span>
                            </div>
                            {business.showPrices && (
                              <span className="text-[12px] font-bold" style={{ color: accent.bg }}>{s.price} {s.currency}</span>
                            )}
                            <button onClick={() => handleToggleService(s)} className="w-6 h-6 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                        <span className="text-[12px] text-gray-400">{t('bp.total')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-gray-400">{totalDuration} min</span>
                          {business.showPrices && (
                            <>
                              <span className="text-[11px] text-gray-300">·</span>
                              <span className="text-[14px] font-bold" style={{ color: accent.bg }}>{totalPrice} {selectedServices[0]?.currency || 'MAD'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} businessHours={business.businessHours} accent={accent} t={t} />
                    {selectedDate && (
                      <TimeSlotGrid slots={slots} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} loading={slotsLoading} accent={accent} t={t} userBookings={userBookings} />
                    )}
                    {selectedSlot && (
                      <button onClick={handleBookNow}
                        className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                        style={{ backgroundColor: accent.bg }}>
                        <Calendar className="w-4 h-4" />
                        {t('bp.bookFor')} {selectedSlot.start}
                      </button>
                    )}
                    {selectedSlot && !isSignedIn && (
                      <p className="text-[11px] text-center text-gray-400">{t('bp.loginToBook')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ─── WORKING HOURS (mobile only, controlled by tab) ── */}
            <div className={`${activeTab !== 'hours' ? 'hidden' : ''} sd:hidden`}>
              {business.businessHours?.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-5">{t('bp.workingHours')}</h2>
                  <div className="space-y-1">
                    {business.businessHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(h => {
                      const nowDay = new Date().getDay();
                      const isToday = h.dayOfWeek === nowDay;
                      return (
                        <div key={h.dayOfWeek}
                          className={`flex items-center justify-between py-3.5 px-4 rounded-xl transition-colors ${isToday ? 'bg-gray-50' : ''}`}>
                          <div className="flex items-center gap-3">
                            {isToday && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent.bg }} />}
                            <span className={`text-[15px] ${isToday ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                              {t(`bp.day.${DAY_NAMES[h.dayOfWeek].toLowerCase()}`)}
                            </span>
                            {isToday && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">{t('bp.today')}</span>}
                          </div>
                          {h.isOpen ? (
                            <span className={`text-[15px] ${isToday ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{h.openTime} – {h.closeTime}</span>
                          ) : (
                            <span className="text-[14px] text-red-400 font-medium">{t('bp.closed')}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ─── LOCATION & CONTACT (mobile only) ──────── */}
            <div className={`${activeTab !== 'about' ? 'hidden' : ''} sd:hidden`}>
              {business.showLocation && (business.address || business.city) && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">{t('bp.location')}</h2>
                  {business.latitude && business.longitude && (
                    <div className="rounded-2xl overflow-hidden mb-4 border border-gray-200">
                      <iframe
                        title="Location"
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${business.longitude - 0.005},${business.latitude - 0.003},${business.longitude + 0.005},${business.latitude + 0.003}&layer=mapnik&marker=${business.latitude},${business.longitude}`}
                      />
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
                    <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[15px] text-gray-900 font-medium">{[business.address, business.city].filter(Boolean).join(', ')}</p>
                      {directionsUrl && (
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-[13px] font-semibold hover:underline" style={{ color: accent.bg }}>
                          <Navigation className="w-3.5 h-3.5" />
                          {t('businessCard.getDirections')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {business.phone && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">{t('bp.contactInfo')}</h2>
                  <div className="space-y-3">
                    {business.showCallButton && (
                      <a href={`tel:${business.phone}`} className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors group">
                        <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:shadow-md transition-shadow">
                          <Phone className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-[15px] font-medium text-gray-900">{t('businessCard.call')}</p>
                          <p className="text-[13px] text-gray-400">{business.phone}</p>
                        </div>
                      </a>
                    )}
                    {business.showMessageButton && (
                      <a href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors group">
                        <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:shadow-md transition-shadow">
                          <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.252-.149-2.868.852.852-2.868-.168-.268A8 8 0 1112 20z"/></svg>
                        </div>
                        <div>
                          <p className="text-[15px] font-medium text-gray-900">{t('businessCard.message')}</p>
                          <p className="text-[13px] text-green-600">WhatsApp</p>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* ── RIGHT: BOOKING (separated by border on desktop) ── */}
            {canBook && (
              <div className="hidden sd:block sd:w-[340px] sd:shrink-0 sd:border-l sd:border-gray-200 sd:pl-6">
                <div ref={bookingRef} className="space-y-5 sd:sticky sd:top-[24px]">
                  <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">{t('bp.selectedServices')}</p>

                {selectedServices.length === 0 ? (
                  /* Empty state */
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                      <Scissors className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-[14px] text-gray-400">{t('bp.selectServices')}</p>
                  </div>
                ) : (
                  <>
                    {/* Selected services list */}
                    <div className="pb-4 border-b border-gray-200">
                      <div className="space-y-2">
                        {selectedServices.map(s => (
                          <div key={s.id} className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent.bg}12` }}>
                              <Scissors className="w-3.5 h-3.5" style={{ color: accent.bg }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</p>
                              <span className="text-[11px] text-gray-400">{s.durationMinutes} min</span>
                            </div>
                            {business.showPrices && (
                              <span className="text-[12px] font-bold" style={{ color: accent.bg }}>{s.price} {s.currency}</span>
                            )}
                            <button onClick={() => handleToggleService(s)} className="w-6 h-6 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                        <span className="text-[12px] text-gray-400">{t('bp.total')}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-gray-400">{totalDuration} min</span>
                          {business.showPrices && (
                            <>
                              <span className="text-[11px] text-gray-300">·</span>
                              <span className="text-[14px] font-bold" style={{ color: accent.bg }}>{totalPrice} {selectedServices[0]?.currency || 'MAD'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Date picker */}
                    <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} businessHours={business.businessHours} accent={accent} t={t} />

                    {/* Time slots */}
                    {selectedDate && (
                      <TimeSlotGrid slots={slots} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} loading={slotsLoading} accent={accent} t={t} userBookings={userBookings} />
                    )}

                    {/* Confirm button */}
                    {selectedSlot && (
                      <button onClick={handleBookNow}
                        className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                        style={{ backgroundColor: accent.bg }}>
                        <Calendar className="w-4 h-4" />
                        {t('bp.bookFor')} {selectedSlot.start}
                      </button>
                    )}
                    {selectedSlot && !isSignedIn && (
                      <p className="text-[11px] text-center text-gray-400">{t('bp.loginToBook')}</p>
                    )}
                  </>
                )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── WORKING HOURS + LOCATION (full width, desktop only) ── */}
        <div className="hidden sd:block">
          <div className="sd:grid sd:grid-cols-2 sd:gap-6">
            {/* Working Hours card */}
            {business.businessHours?.length > 0 && (
              <div className="bg-white border border-gray-300 rounded-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">{t('bp.workingHours')}</h2>
                <div className="space-y-0.5">
                  {business.businessHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(h => {
                    const nowDay = new Date().getDay();
                    const isToday = h.dayOfWeek === nowDay;
                    return (
                      <div key={h.dayOfWeek}
                        className={`flex items-center justify-between py-3 px-4 rounded-xl transition-colors ${isToday ? 'bg-gray-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          {isToday && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent.bg }} />}
                          <span className={`text-[15px] ${isToday ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                            {t(`bp.day.${DAY_NAMES[h.dayOfWeek].toLowerCase()}`)}
                          </span>
                          {isToday && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">{t('bp.today')}</span>}
                        </div>
                        {h.isOpen ? (
                          <span className={`text-[15px] ${isToday ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{h.openTime} – {h.closeTime}</span>
                        ) : (
                          <span className="text-[14px] text-red-400 font-medium">{t('bp.closed')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location card */}
            {business.showLocation && (business.address || business.city) && (
              <div className="bg-white border border-gray-300 rounded-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">{t('bp.location')}</h2>
                {business.latitude && business.longitude && (
                  <div className="w-full h-[200px] rounded-xl overflow-hidden mb-4">
                    <iframe
                      title="Location"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${business.longitude - 0.005},${business.latitude - 0.003},${business.longitude + 0.005},${business.latitude + 0.003}&layer=mapnik&marker=${business.latitude},${business.longitude}`}
                    />
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-gray-900">{[business.address, business.city].filter(Boolean).join(', ')}</p>
                      {directionsUrl && (
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-[13px] font-semibold hover:underline" style={{ color: accent.bg }}>
                          <Navigation className="w-3 h-3" />
                          {t('businessCard.getDirections')}
                        </a>
                      )}
                    </div>
                  </div>
                  {business.phone && business.showCallButton && (
                    <a href={`tel:${business.phone}`} className="flex items-center gap-3 p-3.5 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-white shadow-sm group-hover:shadow-md flex items-center justify-center shrink-0 transition-shadow">
                        <Phone className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-gray-900">{t('businessCard.call')}</p>
                        <p className="text-[12px] text-gray-400">{business.phone}</p>
                      </div>
                    </a>
                  )}
                  {business.phone && business.showMessageButton && (
                    <a href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3.5 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group">
                      <div className="w-9 h-9 rounded-lg bg-white shadow-sm group-hover:shadow-md flex items-center justify-center shrink-0 transition-shadow">
                        <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.214l-.252-.149-2.868.852.852-2.868-.168-.268A8 8 0 1112 20z"/></svg>
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-gray-900">{t('businessCard.message')}</p>
                        <p className="text-[12px] text-green-600">WhatsApp</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FLOATING BOTTOM BAR (mobile) ─────────────────── */}
      {canBook && !showBookingPanel && (
        <div className="fixed bottom-0 left-0 right-0 z-30 sd:hidden">
          <div className="bg-white border-t border-gray-200 px-5 py-3 flex items-center gap-3 safe-area-pb">
            {selectedServices.length > 0 ? (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">
                    {selectedServices.length} {selectedServices.length === 1 ? t('bp.service') : t('bp.servicesLabel')}
                  </p>
                  {business.showPrices && (
                    <p className="text-lg font-bold" style={{ color: accent.bg }}>
                      {totalPrice} {selectedServices[0]?.currency || 'MAD'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    handleContinueBooking();
                    setActiveTab('services');
                  }}
                  className="px-8 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                  style={{ backgroundColor: accent.bg }}>
                  {t('bp.continue')}
                </button>
              </>
            ) : (
              <>
                {business.showPrices && business.services.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{t('bp.startingFrom')}</p>
                    <p className="text-lg font-bold" style={{ color: accent.bg }}>
                      {Math.min(...business.services.map(s => s.price))} {business.services[0]?.currency || 'MAD'}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setActiveTab('services')}
                  className="px-8 py-3.5 rounded-xl text-[15px] font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
                  style={{ backgroundColor: accent.bg }}>
                  {t('bp.selectServices')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom padding for floating bar */}
      {canBook && <div className="h-20 sd:h-0" />}

      {/* MODALS */}
      <BookingModal open={showBookingModal} onClose={() => setShowBookingModal(false)}
        business={business} services={selectedServices} date={selectedDate} slot={selectedSlot}
        accent={accent} t={t} onSuccess={handleBookingSuccess} />

      <SuccessModal appointment={bookedAppointment} onClose={() => setBookedAppointment(null)} accent={accent} t={t} />
    </div>
  );
}
