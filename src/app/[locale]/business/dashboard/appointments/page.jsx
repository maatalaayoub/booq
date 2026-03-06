'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CalendarDays,
  List,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarCheck,
} from 'lucide-react';
import AppointmentDetailModal from '@/components/dashboard/AppointmentDetailModal';
import NewAppointmentModal from '@/components/dashboard/NewAppointmentModal';
import { useLanguage } from '@/contexts/LanguageContext';

// Dynamic import of the FullCalendar wrapper to avoid SSR issues
const FullCalendarWrapper = dynamic(
  () => import('@/components/dashboard/FullCalendarWrapper'),
  { ssr: false, loading: () => (
    <div className="animate-pulse p-4 space-y-4">
      {/* Calendar header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-200 rounded" />
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {[...Array(7)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {[...Array(35)].map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded border border-gray-100" />)}
      </div>
    </div>
  )}
);

// ─── Status colours (full calendar event colours) ───────────
const STATUS_COLORS = {
  confirmed: { bg: '#D4AF37', border: '#B8960C' },
  pending: { bg: '#F59E0B', border: '#D97706' },
  completed: { bg: '#10B981', border: '#059669' },
  cancelled: { bg: '#EF4444', border: '#DC2626' },
};

// Convert a DB appointment row to a FullCalendar event object
function toCalendarEvent(apt) {
  const colors = STATUS_COLORS[apt.status] || STATUS_COLORS.confirmed;
  return {
    id: apt.id,
    title: `${apt.service} — ${apt.client_name}`,
    start: apt.start_time,
    end: apt.end_time,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    editable: apt.status !== 'confirmed' && apt.status !== 'completed' && apt.status !== 'cancelled',
    extendedProps: {
      client: apt.client_name,
      phone: apt.client_phone || '',
      service: apt.service,
      price: apt.price != null ? String(apt.price) : '',
      status: apt.status,
      notes: apt.notes || '',
    },
  };
}

// ─── Stat Cards ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-[5px] border border-gray-200">
      <div className={`flex items-center justify-center w-10 h-10 rounded-[5px] ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Filter Pill ────────────────────────────────────────────
function FilterPill({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
        active
          ? `${color} text-white border-transparent shadow-sm`
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Overlap helper ─────────────────────────────────────────
// Returns true when [startA, endA) overlaps [startB, endB)
function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

// ─── Main Component ─────────────────────────────────────────
export default function AppointmentsPage() {
  const { t, isRTL } = useLanguage();
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newDefaultDate, setNewDefaultDate] = useState(null);
  const [newDefaultEndDate, setNewDefaultEndDate] = useState(null);
  const [currentView, setCurrentView] = useState('timeGridWeek');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibleRange, setVisibleRange] = useState({ start: null, end: null });
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Track visible date range ──
  const handleDatesSet = useCallback((dateInfo) => {
    setVisibleRange({ start: dateInfo.start, end: dateInfo.end });
  }, []);

  const visibleRangeLabel = useMemo(() => {
    const { start, end } = visibleRange;
    if (!start || !end) return '';
    const fmt = (d, opts) => d.toLocaleDateString('en-US', opts);
    // end from FC is exclusive, so subtract 1 day for display
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    // If start and last are the same day (day view), show single date
    if (start.toDateString() === last.toDateString()) {
      return fmt(start, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    // Same month & year
    if (start.getMonth() === last.getMonth() && start.getFullYear() === last.getFullYear()) {
      return `${fmt(start, { month: 'short', day: 'numeric' })} — ${fmt(last, { day: 'numeric' })}, ${start.getFullYear()}`;
    }
    // Same year, different months
    if (start.getFullYear() === last.getFullYear()) {
      return `${fmt(start, { month: 'short', day: 'numeric' })} — ${fmt(last, { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`;
    }
    // Different years
    return `${fmt(start, { month: 'short', day: 'numeric', year: 'numeric' })} — ${fmt(last, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [visibleRange]);

  // ── Load appointments from database ──
  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await fetch('/api/business/appointments');
        if (res.ok) {
          const data = await res.json();
          const calendarEvents = (data.appointments || []).map(toCalendarEvent);
          setEvents(calendarEvents);
        } else {
          console.error('[Appointments] Failed to fetch:', res.status);
        }
      } catch (err) {
        console.error('[Appointments] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAppointments();
  }, []);

  // ── Stats ──
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    return {
      today: events.filter(
        (e) => new Date(e.start) >= todayStart && new Date(e.start) < todayEnd && e.extendedProps?.status !== 'cancelled'
      ).length,
      confirmed: events.filter((e) => e.extendedProps?.status === 'confirmed').length,
      pending: events.filter((e) => e.extendedProps?.status === 'pending').length,
      completed: events.filter((e) => e.extendedProps?.status === 'completed').length,
    };
  }, [events]);

  // ── Filtered events ──
  const filteredEvents = useMemo(() => {
    if (statusFilter === 'all') return events;
    return events.filter((e) => e.extendedProps?.status === statusFilter);
  }, [events, statusFilter]);

  // ── Calendar navigation ──
  const goToday = () => calendarRef.current?.getApi().today();
  const goPrev = () => calendarRef.current?.getApi().prev();
  const goNext = () => calendarRef.current?.getApi().next();
  const changeView = (view) => {
    calendarRef.current?.getApi().changeView(view);
    setCurrentView(view);
  };

  // ── Event click => open detail ──
  const handleEventClick = useCallback((info) => {
    info.jsEvent.preventDefault();
    const evt = info.event;
    setSelectedEvent({
      id: evt.id,
      title: evt.title,
      start: evt.start?.toISOString(),
      end: evt.end?.toISOString(),
      backgroundColor: evt.backgroundColor,
      extendedProps: { ...evt.extendedProps },
    });
    setIsDetailOpen(true);
  }, []);

  // ── Single tap on empty slot => open new ──
  const handleDateClick = useCallback((info) => {
    const now = new Date();
    const clickedDate = new Date(info.dateStr);

    if (info.allDay) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (clickedDate < todayStart) {
        showToast(t('appointments.toast.pastDate'));
        return;
      }
    } else {
      if (clickedDate < now) {
        showToast(t('appointments.toast.pastDateTime'));
        return;
      }
    }

    setNewDefaultDate(info.dateStr);
    setNewDefaultEndDate(null);
    setIsNewOpen(true);
  }, [showToast]);

  // ── Drag select (long press on touch) => open new with range ──
  const handleSelect = useCallback((info) => {
    const now = new Date();
    const selectedStart = new Date(info.startStr);

    if (info.allDay) {
      // Month view: block past dates, allow today
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selectedStart < todayStart) {
        showToast(t('appointments.toast.pastDate'));
        const api = calendarRef.current?.getApi();
        if (api) api.unselect();
        return;
      }
    } else {
      // Time grid: block past times
      if (selectedStart < now) {
        showToast(t('appointments.toast.pastDateTime'));
        const api = calendarRef.current?.getApi();
        if (api) api.unselect();
        return;
      }
    }

    setNewDefaultDate(info.startStr);
    setNewDefaultEndDate(info.endStr);
    setIsNewOpen(true);
    // Unselect the calendar highlight
    const api = calendarRef.current?.getApi();
    if (api) api.unselect();
  }, [showToast]);

  // ── Drag & drop => reschedule (persist to DB) ──
  const handleEventDrop = useCallback(async (info) => {
    // Block dropping onto a past date/time
    if (info.event.start < new Date()) {
      showToast(t('appointments.toast.movePast'));
      info.revert();
      return;
    }
    const status = info.event.extendedProps?.status;
    if (status === 'confirmed') {
      showToast(t('appointments.toast.confirmedNoMove'));
      info.revert();
      return;
    }
    if (status === 'completed' || status === 'cancelled') {
      info.revert();
      return;
    }
    // Block overlapping with existing appointments
    const dropStart = info.event.start;
    const dropEnd = info.event.end || dropStart;
    const hasOverlap = events.some((e) => {
      if (e.id === info.event.id) return false;
      if (e.extendedProps?.status === 'cancelled') return false;
      return timesOverlap(dropStart, dropEnd, new Date(e.start), new Date(e.end));
    });
    if (hasOverlap) {
      showToast(t('appointments.toast.overlap'));
      info.revert();
      return;
    }
    const newStart = info.event.start.toISOString();
    const newEnd = info.event.end?.toISOString() || newStart;
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) =>
        e.id === info.event.id ? { ...e, start: newStart, end: newEnd } : e
      )
    );
    // Navigate calendar to show the dropped date
    const api = calendarRef.current?.getApi();
    if (api) api.gotoDate(info.event.start);
    try {
      await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: info.event.id, start_time: newStart, end_time: newEnd }),
      });
    } catch (err) {
      console.error('[Appointments] Drop update failed:', err);
      info.revert();
    }
  }, [showToast, events]);

  // ── Resize (persist to DB) ──
  const handleEventResize = useCallback(async (info) => {
    // Block resizing into a past date/time
    if (info.event.start < new Date()) {
      showToast(t('appointments.toast.resizePast'));
      info.revert();
      return;
    }
    const status = info.event.extendedProps?.status;
    if (status === 'confirmed') {
      showToast(t('appointments.toast.confirmedNoResize'));
      info.revert();
      return;
    }
    if (status === 'completed' || status === 'cancelled') {
      info.revert();
      return;
    }
    // Block overlapping with existing appointments
    const resizeStart = info.event.start;
    const resizeEnd = info.event.end || resizeStart;
    const hasOverlap = events.some((e) => {
      if (e.id === info.event.id) return false;
      if (e.extendedProps?.status === 'cancelled') return false;
      return timesOverlap(resizeStart, resizeEnd, new Date(e.start), new Date(e.end));
    });
    if (hasOverlap) {
      showToast(t('appointments.toast.overlap'));
      info.revert();
      return;
    }
    const newStart = info.event.start.toISOString();
    const newEnd = info.event.end?.toISOString() || newStart;
    setEvents((prev) =>
      prev.map((e) =>
        e.id === info.event.id ? { ...e, start: newStart, end: newEnd } : e
      )
    );
    try {
      await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: info.event.id, start_time: newStart, end_time: newEnd }),
      });
    } catch (err) {
      console.error('[Appointments] Resize update failed:', err);
      info.revert();
    }
  }, [showToast, events, t]);

  // ── Add new event (save to DB) ──
  const handleAddEvent = useCallback(async (eventData) => {
    // Safety check: prevent saving past appointments
    if (new Date(eventData.start) < new Date()) {
      showToast(t('appointments.toast.pastDateTime'));
      return;
    }
    // Block overlapping with existing appointments
    const newStart = new Date(eventData.start);
    const newEnd = new Date(eventData.end);
    const hasOverlap = events.some((e) => {
      if (e.extendedProps?.status === 'cancelled') return false;
      return timesOverlap(newStart, newEnd, new Date(e.start), new Date(e.end));
    });
    if (hasOverlap) {
      showToast(t('appointments.toast.overlap'));
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/business/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: eventData.extendedProps.client,
          client_phone: eventData.extendedProps.phone,
          service: eventData.extendedProps.service,
          price: eventData.extendedProps.price,
          start_time: eventData.start,
          end_time: eventData.end,
          status: eventData.extendedProps.status || 'confirmed',
          notes: eventData.extendedProps.notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const calendarEvent = toCalendarEvent(data.appointment);
        setEvents((prev) => [...prev, calendarEvent]);
        setIsNewOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('[Appointments] Save failed:', res.status, err);
        showToast(err.error || t('appointments.toast.saveFailed'));
      }
    } catch (err) {
      console.error('[Appointments] Save error:', err);
      showToast(t('appointments.toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [showToast]);

  // ── Mark complete (persist to DB) ──
  const handleComplete = useCallback(async (eventId) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              backgroundColor: STATUS_COLORS.completed.bg,
              borderColor: STATUS_COLORS.completed.border,
              extendedProps: { ...e.extendedProps, status: 'completed' },
            }
          : e
      )
    );
    try {
      await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: 'completed' }),
      });
    } catch (err) {
      console.error('[Appointments] Complete update failed:', err);
    }
  }, []);

  // ── Confirm (persist to DB) ──
  const handleConfirmAppointment = useCallback(async (eventId) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              backgroundColor: STATUS_COLORS.confirmed.bg,
              borderColor: STATUS_COLORS.confirmed.border,
              editable: false,
              extendedProps: { ...e.extendedProps, status: 'confirmed' },
            }
          : e
      )
    );
    try {
      await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: 'confirmed' }),
      });
    } catch (err) {
      console.error('[Appointments] Confirm update failed:', err);
    }
  }, []);

  // ── Cancel (persist to DB) ──
  const handleCancelAppointment = useCallback(async (eventId) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              backgroundColor: STATUS_COLORS.cancelled.bg,
              borderColor: STATUS_COLORS.cancelled.border,
              extendedProps: { ...e.extendedProps, status: 'cancelled' },
            }
          : e
      )
    );
    try {
      await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: 'cancelled' }),
      });
    } catch (err) {
      console.error('[Appointments] Cancel update failed:', err);
    }
  }, []);

  // ── View buttons config ──
  const views = [
    { key: 'timeGridDay', icon: Clock, label: t('common.day') },
    { key: 'timeGridWeek', icon: CalendarDays, label: t('common.week') },
    { key: 'dayGridMonth', icon: CalendarDays, label: t('common.month') },
    { key: 'listWeek', icon: List, label: t('common.list') },
  ];

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('appointments.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('appointments.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setNewDefaultDate(null);
            setNewDefaultEndDate(null);
            setIsNewOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#364153] hover:bg-[#2a3444] text-white rounded-[5px] font-medium text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('appointments.new')}
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-[5px] border border-gray-200 animate-pulse">
              <div className="w-10 h-10 rounded-[5px] bg-gray-200" />
              <div>
                <div className="h-6 w-8 bg-gray-200 rounded mb-1.5" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard icon={CalendarCheck} label={t('appointments.stats.today')} value={stats.today} color="bg-blue-500" />
            <StatCard icon={CheckCircle2} label={t('appointments.stats.confirmed')} value={stats.confirmed} color="bg-amber-500" />
            <StatCard icon={AlertCircle} label={t('appointments.stats.pending')} value={stats.pending} color="bg-orange-500" />
            <StatCard icon={CheckCircle2} label={t('appointments.stats.completed')} value={stats.completed} color="bg-emerald-500" />
          </>
        )}
      </div>

      {/* ── Calendar Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[5px] border border-gray-200 overflow-hidden"
      >
        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          {isLoading ? (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-pulse">
              {/* Navigation skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-7 w-14 bg-gray-200 rounded-lg" />
                <div className="h-7 w-7 bg-gray-100 rounded-lg" />
                <div className="h-7 w-7 bg-gray-100 rounded-lg" />
                <div className="h-4 w-40 bg-gray-200 rounded ml-1" />
              </div>
              {/* View switcher skeleton */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                {[...Array(4)].map((_, i) => <div key={i} className="h-7 w-14 bg-gray-200 rounded-lg" />)}
              </div>
              {/* Filter skeleton */}
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-7 w-20 bg-gray-200 rounded-full" />)}
              </div>
            </div>
          ) : (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
              >
                {t('common.today')}
              </button>
              <button
                onClick={goPrev}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNext}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {visibleRangeLabel && (
                <span className="ml-1 text-sm font-semibold text-gray-700 whitespace-nowrap">
                  {visibleRangeLabel}
                </span>
              )}
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
              {views.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => changeView(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentView === key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <FilterPill label={t('common.all')} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} color="bg-gray-700" />
              <FilterPill label={t('appointments.stats.confirmed')} active={statusFilter === 'confirmed'} onClick={() => setStatusFilter('confirmed')} color="bg-amber-500" />
              <FilterPill label={t('appointments.stats.pending')} active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} color="bg-orange-500" />
              <FilterPill label={t('appointments.stats.completed')} active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} color="bg-emerald-500" />
              <FilterPill label={t('appointments.stats.cancelled')} active={statusFilter === 'cancelled'} onClick={() => setStatusFilter('cancelled')} color="bg-red-500" />
            </div>
          </div>
          )}
        </div>

        {/* Calendar */}
        <div className="p-2 sm:p-4 fc-custom">
          {isLoading ? (
            <div className="animate-pulse p-4 space-y-4">
              {/* Calendar header skeleton */}
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 rounded" />
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                </div>
              </div>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {[...Array(7)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded border border-gray-100" />)}
              </div>
            </div>
          ) : (
            <FullCalendarWrapper
              ref={calendarRef}
              events={filteredEvents}
              onEventClick={handleEventClick}
              onDateClick={handleDateClick}
              onSelect={handleSelect}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onDatesSet={handleDatesSet}
            />
          )}
        </div>
      </motion.div>

      {/* ── Modals ── */}
      <AppointmentDetailModal
        appointment={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onConfirm={handleConfirmAppointment}
        onComplete={handleComplete}
        onCancel={handleCancelAppointment}
      />

      <NewAppointmentModal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onSave={handleAddEvent}
        defaultDate={newDefaultDate}
        defaultEndDate={newDefaultEndDate}
        isSaving={isSaving}
      />

      {/* ── Toast Notification ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-[5px] shadow-lg text-sm font-medium flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
