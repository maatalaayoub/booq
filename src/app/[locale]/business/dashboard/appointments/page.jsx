'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
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
  AlertTriangle,
  Check,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import AppointmentDetailModal from '@/components/dashboard/AppointmentDetailModal';
import NewAppointmentModal from '@/components/dashboard/NewAppointmentModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';

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

// Compute end time from start + duration
function computeEndTime(startTime, durationMinutes) {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

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
  const { businessCategory } = useBusinessCategory();
  const params = useParams();
  const locale = params?.locale || 'en';
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
  const [conflictDialog, setConflictDialog] = useState(null);

  // Schedule data for calendar-level validation
  const [schedule, setSchedule] = useState({ businessHours: [], exceptions: [] });

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

    // Fetch schedule for calendar-level validation
    fetch('/api/business/schedule')
      .then(async r => {
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return { businessHours: [], exceptions: [] };
        return r.json();
      })
      .then(data => setSchedule({ businessHours: data.businessHours || [], exceptions: data.exceptions || [] }))
      .catch(() => setSchedule({ businessHours: [], exceptions: [] }));
  }, []);

  // ── Check if a date/time conflicts with the business schedule ──
  const checkScheduleConflict = useCallback((dateStr, startTime, endTime) => {
    if (!dateStr || !startTime) return '';
    const { businessHours, exceptions } = schedule;
    const dateObj = new Date(`${dateStr}T${startTime}:00Z`);
    const dayOfWeek = dateObj.getUTCDay();

    // 1. Check working hours
    if (businessHours.length > 0) {
      const daySchedule = businessHours.find(h => h.dayOfWeek === dayOfWeek);
      if (!daySchedule || !daySchedule.isOpen) {
        return t('newAppointment.closedDay') || 'This day is not a working day';
      }
      if (endTime && (startTime < daySchedule.openTime || endTime > daySchedule.closeTime)) {
        return (t('newAppointment.outsideHours') || 'Appointment must be within working hours') + ` (${daySchedule.openTime}–${daySchedule.closeTime})`;
      }
    }

    // 2. Check exceptions
    const date = dateStr.split('T')[0];
    for (const ex of exceptions) {
      if (ex.recurring && ex.recurring_day === dayOfWeek) {
        if (ex.is_full_day) return `${t('newAppointment.blockedDay') || 'This day is blocked'}: ${ex.title}`;
        if (ex.start_time && ex.end_time && endTime) {
          const exStart = ex.start_time.substring(0, 5);
          const exEnd = ex.end_time.substring(0, 5);
          if (startTime < exEnd && endTime > exStart) {
            return `${t('newAppointment.conflictsWith') || 'Conflicts with'}: ${ex.title} (${exStart}–${exEnd})`;
          }
        }
        continue;
      }
      const exDate = ex.date;
      const exEndDate = ex.end_date || exDate;
      if (date >= exDate && date <= exEndDate) {
        if (ex.is_full_day) return `${t('newAppointment.blockedDay') || 'This day is blocked'}: ${ex.title}`;
        if (ex.start_time && ex.end_time && endTime) {
          const exStart = ex.start_time.substring(0, 5);
          const exEnd = ex.end_time.substring(0, 5);
          if (startTime < exEnd && endTime > exStart) {
            return `${t('newAppointment.conflictsWith') || 'Conflicts with'}: ${ex.title} (${exStart}–${exEnd})`;
          }
        }
      }
    }
    return '';
  }, [schedule, t]);

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

    // Check schedule conflict before opening modal
    const { date, time } = parseDateAndTime(info.dateStr);
    const endTime = computeEndTime(time, 30);
    const conflict = checkScheduleConflict(date, time, endTime);
    if (conflict) {
      showToast(conflict, 'warning');
      return;
    }

    setNewDefaultDate(info.dateStr);
    setNewDefaultEndDate(null);
    setIsNewOpen(true);
  }, [showToast, checkScheduleConflict]);

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

    // Check schedule conflict before opening modal
    const { date, time } = parseDateAndTime(info.startStr);
    const parsedEnd = parseDateAndTime(info.endStr);
    const endTime = parsedEnd.time;
    const conflict = checkScheduleConflict(date, time, endTime);
    if (conflict) {
      showToast(conflict, 'warning');
      const api = calendarRef.current?.getApi();
      if (api) api.unselect();
      return;
    }

    setNewDefaultDate(info.startStr);
    setNewDefaultEndDate(info.endStr);
    setIsNewOpen(true);
    // Unselect the calendar highlight
    const api = calendarRef.current?.getApi();
    if (api) api.unselect();
  }, [showToast, checkScheduleConflict]);

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
      const res = await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: info.event.id, start_time: newStart, end_time: newEnd }),
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
      const res = await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: info.event.id, start_time: newStart, end_time: newEnd }),
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

  // ── Confirm (persist to DB) — with conflict detection ──
  const handleConfirmAppointment = useCallback(async (eventId) => {
    const booking = events.find(e => e.id === eventId);
    if (!booking) return;

    // Find overlapping pending appointments
    const conflicts = events.filter(e =>
      e.id !== eventId &&
      e.extendedProps?.status === 'pending' &&
      new Date(e.start) < new Date(booking.end) &&
      new Date(e.end) > new Date(booking.start)
    );

    if (conflicts.length > 0) {
      // Map calendar events to the shape expected by conflict dialog
      const conflictData = conflicts.map(e => ({
        id: e.id,
        client_name: e.extendedProps.client,
        service: e.extendedProps.service,
        start_time: e.start,
        end_time: e.end,
        business_info_id: e.extendedProps.business_info_id,
      }));
      setConflictDialog({ approvedId: eventId, conflicts: conflictData });
      return;
    }

    // No conflicts — confirm directly
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              backgroundColor: STATUS_COLORS.confirmed.bg,
              borderColor: STATUS_COLORS.confirmed.border,
              editable: false,
              extendedProps: { ...e.extendedProps, status: 'confirmed', rescheduled_by: null, previous_start_time: null, previous_end_time: null },
            }
          : e
      )
    );
    try {
      await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: 'confirmed', rescheduled_by: null, previous_start_time: null, previous_end_time: null }),
      });
    } catch (err) {
      console.error('[Appointments] Confirm update failed:', err);
    }
  }, [events]);

  // ── Conflict resolution helpers ──
  const setDecision = (id, decision) => {
    setConflictDialog(prev => ({
      ...prev,
      decisions: { ...(prev.decisions || {}), [id]: decision },
    }));
  };

  const proceedFromDecisions = () => {
    if (!conflictDialog) return;
    const decisions = conflictDialog.decisions || {};
    const toReschedule = conflictDialog.conflicts.filter(c => decisions[c.id] === 'reschedule');
    if (toReschedule.length === 0) {
      setConflictDialog(prev => ({ ...prev, step: 'confirm', rescheduleResults: {} }));
    } else {
      setConflictDialog(prev => ({ ...prev, step: 'reschedule', rescheduleQueue: toReschedule, rescheduleQueueIdx: 0, rescheduleResults: {}, rescheduledRanges: [] }));
      loadSlotsForReschedule(toReschedule[0], []);
    }
  };

  const generateDateOptions = (startDate) => {
    const dates = [];
    const base = new Date(startDate);
    base.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const formatDateStr = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadSlotsForReschedule = async (conflict, existingRanges, dateOverride) => {
    setConflictDialog(prev => ({ ...prev, slotsLoading: true, slots: null, rescheduleError: null, closedMessage: null }));
    try {
      const startDt = new Date(conflict.start_time);
      const endDt = new Date(conflict.end_time);
      const duration = Math.round((endDt - startDt) / 60000);
      const date = dateOverride || formatDateStr(startDt);
      const bizId = conflict.business_info_id;
      const res = await fetch(`/api/book/available-slots?businessId=${encodeURIComponent(bizId)}&date=${date}&duration=${duration}`);
      const data = await res.json();

      if (data.closed) {
        setConflictDialog(prev => ({
          ...prev,
          slots: [],
          slotsLoading: false,
          rescheduleSelectedDate: date,
          rescheduleDateOptions: prev.rescheduleDateOptions || generateDateOptions(new Date(conflict.start_time)),
          closedMessage: data.message || null,
          closedDates: { ...(prev.closedDates || {}), [date]: data.message || true },
        }));
        return;
      }

      let availableSlots = (data.slots || []).filter(s => s.available);

      // Filter out the approved booking's time range
      const approvedEvent = events.find(e => e.id === conflictDialog.approvedId);
      const reservedRanges = [];
      if (approvedEvent) {
        const aStart = new Date(approvedEvent.start);
        const aEnd = new Date(approvedEvent.end);
        const approvedDate = formatDateStr(aStart);
        if (date === approvedDate) {
          reservedRanges.push({
            start: `${String(aStart.getUTCHours()).padStart(2, '0')}:${String(aStart.getUTCMinutes()).padStart(2, '0')}`,
            end: `${String(aEnd.getUTCHours()).padStart(2, '0')}:${String(aEnd.getUTCMinutes()).padStart(2, '0')}`,
          });
        }
      }
      if (existingRanges) {
        for (const r of existingRanges) {
          if (r.date === date) reservedRanges.push(r);
        }
      }
      if (reservedRanges.length > 0) {
        availableSlots = availableSlots.filter(slot =>
          !reservedRanges.some(r => slot.start < r.end && slot.end > r.start)
        );
      }

      setConflictDialog(prev => ({
        ...prev,
        slots: availableSlots,
        slotsLoading: false,
        rescheduleSelectedDate: date,
        rescheduleDateOptions: prev.rescheduleDateOptions || generateDateOptions(new Date(conflict.start_time)),
        closedMessage: null,
      }));
    } catch (err) {
      console.error('Failed to fetch slots:', err);
      setConflictDialog(prev => ({ ...prev, slots: [], slotsLoading: false }));
    }
  };

  const handleConflictDateChange = (dateStr) => {
    if (!conflictDialog) return;
    const conflict = conflictDialog.rescheduleQueue[conflictDialog.rescheduleQueueIdx];
    setConflictDialog(prev => ({ ...prev, rescheduleSelectedDate: dateStr }));
    loadSlotsForReschedule(conflict, conflictDialog.rescheduledRanges || [], dateStr);
  };

  const handleSlotPick = (slot) => {
    if (!conflictDialog) return;
    const conflict = conflictDialog.rescheduleQueue[conflictDialog.rescheduleQueueIdx];
    const date = conflictDialog.rescheduleSelectedDate;
    const newStart = `${date}T${slot.start}:00Z`;
    const newEnd = `${date}T${slot.end}:00Z`;
    const newRange = { start: slot.start, end: slot.end, date };

    const updatedResults = { ...conflictDialog.rescheduleResults, [conflict.id]: { newStart, newEnd, slotLabel: `${slot.start} → ${slot.end}`, dateLabel: date } };
    const updatedRanges = [...(conflictDialog.rescheduledRanges || []), newRange];
    const nextIdx = conflictDialog.rescheduleQueueIdx + 1;

    if (nextIdx < conflictDialog.rescheduleQueue.length) {
      setConflictDialog(prev => ({
        ...prev,
        rescheduleResults: updatedResults,
        rescheduledRanges: updatedRanges,
        rescheduleQueueIdx: nextIdx,
        slots: null,
        slotsLoading: true,
        rescheduleError: null,
      }));
      loadSlotsForReschedule(conflictDialog.rescheduleQueue[nextIdx], updatedRanges);
    } else {
      setConflictDialog(prev => ({
        ...prev,
        rescheduleResults: updatedResults,
        rescheduledRanges: updatedRanges,
        step: 'confirm',
      }));
    }
  };

  const executeConflictResolution = async () => {
    if (!conflictDialog) return;
    setConflictDialog(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      // 1. Confirm the approved appointment
      const confirmRes = await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conflictDialog.approvedId, status: 'confirmed', rescheduled_by: null, previous_start_time: null, previous_end_time: null }),
      });
      if (!confirmRes.ok) throw new Error('Failed to confirm appointment');

      const decisions = conflictDialog.decisions || {};
      const rescheduleResults = conflictDialog.rescheduleResults || {};

      // 2. Process each conflict
      for (const c of conflictDialog.conflicts) {
        if (decisions[c.id] === 'cancel') {
          await fetch(`/api/business/appointments?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
        } else if (decisions[c.id] === 'reschedule' && rescheduleResults[c.id]) {
          const r = rescheduleResults[c.id];
          const res = await fetch('/api/business/appointments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: c.id, start_time: r.newStart, end_time: r.newEnd, status: 'confirmed' }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Failed to reschedule ${c.client_name}`);
          }
        }
      }

      // 3. Refresh events from DB
      setConflictDialog(null);
      try {
        const res = await fetch('/api/business/appointments');
        if (res.ok) {
          const data = await res.json();
          setEvents((data.appointments || []).map(toCalendarEvent));
        }
      } catch (_) {}
    } catch (err) {
      console.error('Failed to execute resolution:', err);
      setConflictDialog(prev => ({ ...prev, saving: false, saveError: err.message }));
    }
  };

  // ── Cancel (delete from DB) ──
  const handleCancelAppointment = useCallback(async (eventId) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    try {
      await fetch(`/api/business/appointments?id=${eventId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('[Appointments] Delete failed:', err);
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
        onReschedule={() => {
          setIsDetailOpen(false);
          // Refetch appointments to get updated times
          fetch('/api/business/appointments')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setEvents((data.appointments || []).map(toCalendarEvent)); })
            .catch(() => {});
        }}
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

      {/* ── Conflict Resolution Dialog ── */}
      <AnimatePresence>
        {conflictDialog && (() => {
          const currentStep = conflictDialog.step || 'decide';
          const steps = ['decide', 'reschedule', 'confirm'];
          const hasReschedules = conflictDialog.conflicts?.some(c => conflictDialog.decisions?.[c.id] === 'reschedule');
          const activeSteps = hasReschedules ? steps : ['decide', 'confirm'];
          const stepIndex = activeSteps.indexOf(currentStep);

          return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !conflictDialog.saving && setConflictDialog(null)} />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative bg-white rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] w-full max-w-[440px] max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with step indicator */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-center gap-2 mb-5">
                  {activeSteps.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i < stepIndex ? 'bg-[#D4AF37]' :
                        i === stepIndex ? 'bg-[#D4AF37] w-6 rounded-full' :
                        'bg-gray-200'
                      }`} />
                      {i < activeSteps.length - 1 && (
                        <div className={`w-8 h-[2px] rounded transition-colors duration-300 ${
                          i < stepIndex ? 'bg-[#D4AF37]' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-center text-center">
                  {currentStep === 'decide' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-3 shadow-sm">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-[17px] font-bold text-gray-900">
                        {t?.('dashboard.conflictTitle') || 'Time Conflict Detected'}
                      </h3>
                      <p className="text-[13px] text-gray-400 mt-1">
                        {t?.('dashboard.conflictDesc2') || 'Choose what to do with each overlapping appointment:'}
                      </p>
                    </>
                  )}
                  {currentStep === 'reschedule' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-3 shadow-sm">
                        <CalendarDays className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-[17px] font-bold text-gray-900">
                        {t?.('dashboard.rescheduleTitle') || 'Reschedule Appointment'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[13px] text-gray-400">
                          {t?.('dashboard.rescheduleDesc') || 'Pick a new time slot for'}
                        </span>
                        <span className="text-[13px] font-semibold text-gray-700">
                          {conflictDialog.rescheduleQueue?.[conflictDialog.rescheduleQueueIdx]?.client_name}
                        </span>
                      </div>
                      {conflictDialog.rescheduleQueue?.length > 1 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {conflictDialog.rescheduleQueue.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                              i <= conflictDialog.rescheduleQueueIdx ? 'bg-blue-500 w-4' : 'bg-gray-200 w-1.5'
                            }`} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {currentStep === 'confirm' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center mb-3 shadow-sm">
                        <Check className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-[17px] font-bold text-gray-900">
                        {t?.('dashboard.confirmChangesTitle') || 'Confirm Changes'}
                      </h3>
                      <p className="text-[13px] text-gray-400 mt-1">
                        {t?.('dashboard.confirmChangesDesc') || 'Please review the changes before saving:'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* STEP 1: Choose action per conflict */}
              {currentStep === 'decide' && (
                <div className="space-y-3">
                  {conflictDialog.conflicts.map(c => {
                    const start = new Date(c.start_time);
                    const decision = conflictDialog.decisions?.[c.id];
                    return (
                      <div key={c.id} className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                        decision === 'cancel' ? 'border-red-300 bg-red-50/50' :
                        decision === 'reschedule' ? 'border-[#D4AF37]/60 bg-amber-50/50' :
                        'border-gray-150 bg-white hover:border-gray-200'
                      }`}>
                        <div className="flex items-center gap-3 p-3.5">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors duration-200 ${
                            decision === 'cancel' ? 'bg-red-100 text-red-600' :
                            decision === 'reschedule' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {(c.client_name || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-semibold text-gray-900 truncate">{c.client_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{c.service}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums text-gray-700">
                              {start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex border-t border-gray-100">
                          <button
                            onClick={() => setDecision(c.id, 'cancel')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                              decision === 'cancel'
                                ? 'bg-red-500 text-white shadow-inner'
                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            {t?.('dashboard.actionCancel') || 'Cancel'}
                          </button>
                          <div className="w-px bg-gray-100" />
                          <button
                            onClick={() => setDecision(c.id, 'reschedule')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                              decision === 'reschedule'
                                ? 'bg-[#D4AF37] text-white shadow-inner'
                                : 'text-gray-400 hover:text-[#D4AF37] hover:bg-amber-50'
                            }`}
                          >
                            <CalendarDays className="w-4 h-4" />
                            {t?.('dashboard.actionReschedule') || 'Reschedule'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 2: Reschedule with date picker */}
              {currentStep === 'reschedule' && conflictDialog.rescheduleQueue && (
                <div className="space-y-4">
                  {/* Date strip */}
                  {conflictDialog.rescheduleDateOptions && (
                    <div>
                      <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {t?.('dashboard.selectDate') || 'Select Date'}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {conflictDialog.rescheduleDateOptions.map(d => {
                          const ds = formatDateStr(d);
                          const isSelected = ds === conflictDialog.rescheduleSelectedDate;
                          const isClosed = !!conflictDialog.closedDates?.[ds];
                          return (
                            <button
                              key={ds}
                              onClick={() => handleConflictDateChange(ds)}
                              className={`flex flex-col items-center min-w-[56px] px-2 py-2 rounded-xl border text-center transition-all shrink-0 ${
                                isSelected
                                  ? isClosed
                                    ? 'border-gray-300 bg-gray-100 opacity-60'
                                    : 'border-amber-400 bg-amber-50 ring-1 ring-amber-200'
                                  : isClosed
                                    ? 'border-gray-200 bg-gray-50 opacity-60'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <span className="text-[10px] font-medium text-gray-400 uppercase">
                                {d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                              </span>
                              <span className={`text-[16px] font-bold ${isSelected && !isClosed ? 'text-amber-700' : 'text-gray-900'}`}>
                                {d.getUTCDate()}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Closed message */}
                  {conflictDialog.closedMessage && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-amber-700">{conflictDialog.closedMessage}</p>
                    </div>
                  )}

                  {conflictDialog.rescheduleError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-red-600">{conflictDialog.rescheduleError}</p>
                    </div>
                  )}

                  {/* Slots */}
                  <div>
                    <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {t?.('dashboard.selectTime') || 'Select Time'}
                    </p>
                    {conflictDialog.slotsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                      </div>
                    ) : conflictDialog.slots?.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                        {conflictDialog.slots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => handleSlotPick(slot)}
                            className="px-3 py-2.5 rounded-xl text-[13px] font-medium border border-gray-200 text-gray-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-all"
                          >
                            {slot.start}
                          </button>
                        ))}
                      </div>
                    ) : !conflictDialog.closedMessage ? (
                      <div className="text-center py-6 text-[13px] text-gray-400">
                        {t?.('dashboard.noSlotsAvailable') || 'No available slots for this day.'}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* STEP 3: Confirmation summary */}
              {currentStep === 'confirm' && (
                <div className="space-y-2.5">
                  {/* Approved appointment */}
                  {(() => {
                    const approved = events.find(e => e.id === conflictDialog.approvedId);
                    if (!approved) return null;
                    return (
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/60">
                        <div className="w-9 h-9 bg-emerald-200/70 rounded-full flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-gray-900 truncate">{approved.extendedProps?.client}</p>
                          <p className="text-xs text-emerald-600 font-medium">{t?.('dashboard.willConfirm') || 'Will be confirmed'}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {conflictDialog.conflicts.map(c => {
                    const decision = conflictDialog.decisions?.[c.id];
                    const resched = conflictDialog.rescheduleResults?.[c.id];
                    return (
                      <div key={c.id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                        decision === 'cancel'
                          ? 'bg-red-50 border-red-200/60'
                          : 'bg-blue-50 border-blue-200/60'
                      }`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          decision === 'cancel' ? 'bg-red-200/70' : 'bg-blue-200/70'
                        }`}>
                          {decision === 'cancel'
                            ? <XCircle className="w-4 h-4 text-red-700" />
                            : <CalendarDays className="w-4 h-4 text-blue-700" />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.client_name}</p>
                          {decision === 'cancel' ? (
                            <p className="text-xs text-red-600 font-medium">{t?.('dashboard.willCancel') || 'Will be cancelled'}</p>
                          ) : resched ? (
                            <p className="text-xs text-blue-600 font-medium">
                              {t?.('dashboard.willReschedule') || 'Move to'} {resched.dateLabel} · {resched.slotLabel}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {conflictDialog.saveError && (
                    <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{conflictDialog.saveError}</p>
                    </div>
                  )}
                </div>
              )}

              </div>

              {/* Footer with actions */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                {currentStep === 'decide' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConflictDialog(null)}
                      className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-medium text-sm transition-colors"
                    >
                      {t?.('dashboard.cancelBtn') || 'Cancel'}
                    </button>
                    <button
                      onClick={proceedFromDecisions}
                      disabled={!conflictDialog.decisions || Object.keys(conflictDialog.decisions).length !== conflictDialog.conflicts.length}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c9a432] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-[#D4AF37]/20"
                    >
                      {t?.('dashboard.continueBtn') || 'Continue'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {currentStep === 'reschedule' && (
                  <button
                    onClick={() => setConflictDialog(prev => ({ ...prev, step: 'decide', rescheduleQueue: null, rescheduleQueueIdx: null, slots: null }))}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-medium text-sm transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t?.('dashboard.back') || 'Back'}
                  </button>
                )}
                {currentStep === 'confirm' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setConflictDialog(prev => ({ ...prev, step: 'decide', rescheduleQueue: null, rescheduleQueueIdx: null, slots: null, saving: false, saveError: null }));
                      }}
                      disabled={conflictDialog.saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 rounded-xl font-medium text-sm transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t?.('dashboard.back') || 'Back'}
                    </button>
                    <button
                      onClick={executeConflictResolution}
                      disabled={conflictDialog.saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-emerald-600/20"
                    >
                      {conflictDialog.saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t?.('dashboard.saving') || 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {t?.('dashboard.confirmSave') || 'Confirm & Save'}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

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
                : toast.type === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="w-4 h-4 flex-shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
