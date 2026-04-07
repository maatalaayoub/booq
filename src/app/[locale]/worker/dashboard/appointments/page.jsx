'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
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
  RotateCw,
} from 'lucide-react';
import AppointmentDetailModal from '@/components/dashboard/AppointmentDetailModal';
import NewAppointmentModal from '@/components/dashboard/NewAppointmentModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';

// Dynamic import of the FullCalendar wrapper to avoid SSR issues
const FullCalendarWrapper = dynamic(
  () => import('@/components/dashboard/FullCalendarWrapper'),
  { ssr: false, loading: () => (
    <div className="animate-pulse p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-gray-200 rounded" />
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {[...Array(7)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
      </div>
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
      clientAddress: apt.client_address || '',
      service: apt.service,
      price: apt.price != null ? String(apt.price) : '',
      status: apt.status,
      notes: apt.notes || '',
      business_info_id: apt.business_info_id,
      start_time: apt.start_time,
      end_time: apt.end_time,
      previous_start_time: apt.previous_start_time || null,
      previous_end_time: apt.previous_end_time || null,
      rescheduled_by: apt.rescheduled_by || null,
      assignedWorkerId: apt.assigned_worker_id || null,
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
function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

// Parse a date string into { date, time } parts (use UTC to match stored times)
function parseDateAndTime(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return { date: now.toISOString().split('T')[0], time: '09:00' };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { date: dateStr.split('T')[0], time: '09:00' };
  }
  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  const time = (hours === '00' && minutes === '00') ? '09:00' : `${hours}:${minutes}`;
  return { date: d.toISOString().split('T')[0], time };
}

function computeEndTime(startTime, durationMinutes) {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ─── Main Component ─────────────────────────────────────────
export default function WorkerAppointmentsPage() {
  const { t, isRTL, locale } = useLanguage();
  const { activeMembership, permissions } = useWorker();
  const { businessCategory } = useBusinessCategory();
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
  const [refreshing, setRefreshing] = useState(false);

  const businessId = activeMembership?.businessInfoId;

  const showToast = useCallback((message, type = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch appointments ──
  const fetchAppointments = useCallback(async () => {
    if (!businessId || !permissions?.canManageAppointments) {
      setEvents([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/worker/appointments?businessId=${businessId}`);
      if (res.ok) {
        const body = await res.json();
        const data = body.data || body || [];
        setEvents(data.map(toCalendarEvent));
      }
    } catch (err) {
      console.error('[Worker Appointments] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, permissions?.canManageAppointments]);

  useEffect(() => {
    setIsLoading(true);
    fetchAppointments();
  }, [fetchAppointments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/worker/appointments?businessId=${businessId}`);
      if (res.ok) {
        const body = await res.json();
        const data = body.data || body || [];
        setEvents(data.map(toCalendarEvent));
      }
    } catch (err) {
      console.error('[Worker Appointments] Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Track visible date range ──
  const handleDatesSet = useCallback((dateInfo) => {
    setVisibleRange({ start: dateInfo.start, end: dateInfo.end });
  }, []);

  const visibleRangeLabel = useMemo(() => {
    const { start, end } = visibleRange;
    if (!start || !end) return '';
    const fmt = (d, opts) => d.toLocaleDateString(locale, opts);
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    if (start.toDateString() === last.toDateString()) {
      return fmt(start, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (start.getMonth() === last.getMonth() && start.getFullYear() === last.getFullYear()) {
      return `${fmt(start, { month: 'short', day: 'numeric' })} — ${fmt(last, { day: 'numeric' })}, ${start.getFullYear()}`;
    }
    if (start.getFullYear() === last.getFullYear()) {
      return `${fmt(start, { month: 'short', day: 'numeric' })} — ${fmt(last, { month: 'short', day: 'numeric' })}, ${start.getFullYear()}`;
    }
    return `${fmt(start, { month: 'short', day: 'numeric', year: 'numeric' })} — ${fmt(last, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [visibleRange, locale]);

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

  // ── Status change handlers ──
  const handleStatusChange = useCallback(async (eventId, newStatus) => {
    const colors = STATUS_COLORS[newStatus];
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              backgroundColor: colors.bg,
              borderColor: colors.border,
              extendedProps: { ...e.extendedProps, status: newStatus },
            }
          : e
      )
    );
    try {
      await fetch('/api/worker/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, businessId, status: newStatus }),
      });
    } catch (err) {
      console.error(`[Worker Appointments] ${newStatus} update failed:`, err);
    }
  }, [businessId]);

  const handleComplete = useCallback((eventId) => handleStatusChange(eventId, 'completed'), [handleStatusChange]);
  const handleConfirmAppointment = useCallback((eventId) => handleStatusChange(eventId, 'confirmed'), [handleStatusChange]);
  const handleCancelAppointment = useCallback((eventId) => handleStatusChange(eventId, 'cancelled'), [handleStatusChange]);

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
  }, [showToast, t]);

  // ── Drag select => open new with range ──
  const handleSelect = useCallback((info) => {
    const now = new Date();
    const selectedStart = new Date(info.startStr);
    if (info.allDay) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selectedStart < todayStart) {
        showToast(t('appointments.toast.pastDate'));
        const api = calendarRef.current?.getApi();
        if (api) api.unselect();
        return;
      }
    } else {
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
    const api = calendarRef.current?.getApi();
    if (api) api.unselect();
  }, [showToast, t]);

  // ── Drag & drop => reschedule ──
  const handleEventDrop = useCallback(async (info) => {
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
    setEvents((prev) =>
      prev.map((e) =>
        e.id === info.event.id ? { ...e, start: newStart, end: newEnd } : e
      )
    );
    const api = calendarRef.current?.getApi();
    if (api) api.gotoDate(info.event.start);
    try {
      const res = await fetch('/api/worker/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: info.event.id, businessId, start_time: newStart, end_time: newEnd }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t('appointments.toast.overlap'));
        info.revert();
        setEvents((prev) =>
          prev.map((e) =>
            e.id === info.event.id ? { ...e, start: info.oldEvent.start.toISOString(), end: info.oldEvent.end?.toISOString() || info.oldEvent.start.toISOString() } : e
          )
        );
      }
    } catch (err) {
      console.error('[Worker Appointments] Drop update failed:', err);
      info.revert();
    }
  }, [showToast, events, businessId, t]);

  // ── Resize ──
  const handleEventResize = useCallback(async (info) => {
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
      const res = await fetch('/api/worker/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: info.event.id, businessId, start_time: newStart, end_time: newEnd }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || t('appointments.toast.overlap'));
        info.revert();
        setEvents((prev) =>
          prev.map((e) =>
            e.id === info.event.id ? { ...e, start: info.oldEvent.start.toISOString(), end: info.oldEvent.end?.toISOString() || info.oldEvent.start.toISOString() } : e
          )
        );
      }
    } catch (err) {
      console.error('[Worker Appointments] Resize update failed:', err);
      info.revert();
    }
  }, [showToast, events, businessId, t]);

  // ── Add new event (save to DB) ──
  const handleAddEvent = useCallback(async (eventData) => {
    if (new Date(eventData.start) < new Date()) {
      showToast(t('appointments.toast.pastDateTime'));
      return;
    }
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
      const res = await fetch('/api/worker/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          client_name: eventData.extendedProps.client,
          client_phone: eventData.extendedProps.phone,
          client_address: eventData.extendedProps.clientAddress,
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
        const appt = data.data?.appointment || data.appointment;
        if (appt) {
          const calendarEvent = toCalendarEvent(appt);
          setEvents((prev) => [...prev, calendarEvent]);
        }
        setIsNewOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || t('appointments.toast.saveFailed'));
      }
    } catch (err) {
      console.error('[Worker Appointments] Save error:', err);
      showToast(t('appointments.toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [showToast, events, businessId, t]);

  // ── View buttons config ──
  const views = [
    { key: 'timeGridDay', icon: Clock, label: t('common.day') },
    { key: 'timeGridWeek', icon: CalendarDays, label: t('common.week') },
    { key: 'dayGridMonth', icon: CalendarDays, label: t('common.month') },
    { key: 'listWeek', icon: List, label: t('common.list') },
  ];

  // Permission check
  if (!permissions?.canManageAppointments) {
    return (
      <div className="text-center py-16" dir={isRTL ? 'rtl' : 'ltr'}>
        <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-medium text-gray-900 mb-1">
          {t('worker.noPermission') || 'No Permission'}
        </h2>
        <p className="text-sm text-gray-500">
          {t('worker.noAppointmentPerm') || 'You do not have permission to view appointments.'}
        </p>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-[5px] transition-colors disabled:opacity-50"
            title={t('common.refresh') || 'Refresh'}
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex-1 sm:hidden" />
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
              <div className="flex items-center gap-2">
                <div className="h-7 w-14 bg-gray-200 rounded-lg" />
                <div className="h-7 w-7 bg-gray-100 rounded-lg" />
                <div className="h-7 w-7 bg-gray-100 rounded-lg" />
                <div className="h-4 w-40 bg-gray-200 rounded ml-1" />
              </div>
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                {[...Array(4)].map((_, i) => <div key={i} className="h-7 w-14 bg-gray-200 rounded-lg" />)}
              </div>
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
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button
                onClick={goNext}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 rounded" />
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {[...Array(7)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded border border-gray-100" />)}
              </div>
            </div>
          ) : (
            <FullCalendarWrapper
              ref={calendarRef}
              events={filteredEvents}
              locale={locale}
              noEventsText={t('common.no_events')}
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

      {/* ── Detail Modal ── */}
      <AppointmentDetailModal
        appointment={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onConfirm={handleConfirmAppointment}
        onComplete={handleComplete}
        onCancel={handleCancelAppointment}
        onReschedule={() => {
          setIsDetailOpen(false);
          fetchAppointments();
        }}
        mode="worker"
        businessId={businessId}
      />

      <NewAppointmentModal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onSave={handleAddEvent}
        defaultDate={newDefaultDate}
        defaultEndDate={newDefaultEndDate}
        isSaving={isSaving}
        businessCategory={businessCategory}
      />

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
