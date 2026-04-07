'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  Clock,
  CalendarDays,
  Save,
  Coffee,
  Utensils,
  XCircle,
  Palmtree,
  Plane,
  HelpCircle,
  Trash2,
  Loader2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  Check,
  AlertTriangle,
  Pencil,
  Users,
  Crown,
  User,
} from 'lucide-react';
import AddExceptionModal from '@/components/dashboard/AddExceptionModal';
import ExceptionDetailModal from '@/components/dashboard/ExceptionDetailModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';

// Dynamic import FullCalendar wrapper
const FullCalendarWrapper = dynamic(
  () => import('@/components/dashboard/ScheduleCalendarWrapper'),
  {
    ssr: false,
    loading: () => (
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
    ),
  }
);

// ─── Constants ──────────────────────────────────────────────
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EXCEPTION_ICONS = {
  break: Coffee,
  lunch_break: Utensils,
  closure: XCircle,
  holiday: Palmtree,
  vacation: Plane,
  other: HelpCircle,
};

const EXCEPTION_COLORS = {
  break: { bg: '#3B82F6', border: '#2563EB' },
  lunch_break: { bg: '#F97316', border: '#EA580C' },
  closure: { bg: '#EF4444', border: '#DC2626' },
  holiday: { bg: '#10B981', border: '#059669' },
  vacation: { bg: '#8B5CF6', border: '#7C3AED' },
  other: { bg: '#6B7280', border: '#4B5563' },
};

const DEFAULT_HOURS = DAY_NAMES.map((_, i) => ({
  dayOfWeek: i,
  isOpen: i >= 1 && i <= 5, // Mon-Fri open
  openTime: '09:00',
  closeTime: '19:00',
}));

/** Generate 24h time options (HH:MM) in 30-min increments, optionally bounded */
function generateTimeOptions(minTime, maxTime) {
  const options = [];
  const [minH, minM] = minTime ? minTime.split(':').map(Number) : [0, 0];
  const [maxH, maxM] = maxTime ? maxTime.split(':').map(Number) : [23, 30];
  const minTotal = minH * 60 + minM;
  const maxTotal = maxH * 60 + maxM;
  for (let m = minTotal; m <= maxTotal; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    options.push(`${hh}:${mm}`);
  }
  return options;
}

function TimeSelect({ value, onChange, minTime, maxTime, disabled, className }) {
  const options = generateTimeOptions(minTime, maxTime);
  const hasValue = options.includes(value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={className || "border border-gray-200 rounded-md px-2 py-1.5 text-sm w-[90px] focus:ring-1 focus:ring-amber-400/30 outline-none bg-white appearance-none"}
    >
      {!hasValue && <option value={value}>{value}</option>}
      {options.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function SchedulePage() {
  const { t, isRTL, locale } = useLanguage();
  const { businessCategory } = useBusinessCategory();
  const router = useRouter();
  const calendarRef = useRef(null);
  const [businessHours, setBusinessHours] = useState(DEFAULT_HOURS);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState(null);
  const [editingException, setEditingException] = useState(null);
  const [activeTab, setActiveTab] = useState('hours'); // 'hours' | 'workerHours' | 'calendar'
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [deletingId, setDeletingId] = useState(null);
  const [selectedExc, setSelectedExc] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState(null);
  const savedHoursRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Team member schedule state ──
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [workerSchedule, setWorkerSchedule] = useState(null);
  const [workerBusinessHours, setWorkerBusinessHours] = useState([]);
  const [loadingWorkerSchedule, setLoadingWorkerSchedule] = useState(false);
  const [savingWorkerSchedule, setSavingWorkerSchedule] = useState(false);
  const [workerSaveStatus, setWorkerSaveStatus] = useState(null);
  const [hasCustomSchedule, setHasCustomSchedule] = useState(false);
  const [workerDropdownOpen, setWorkerDropdownOpen] = useState(false);
  const workerDropdownRef = useRef(null);

  const WORKER_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DEFAULT_WORKER_WEEK = WORKER_DAY_KEYS.map((_, i) => ({
    dayOfWeek: i,
    isOpen: i >= 1 && i <= 5,
    openTime: '09:00',
    closeTime: '18:00',
  }));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/business/schedule');
      if (res.ok) {
        const data = await res.json();
        if (data.businessHours?.length > 0) {
          setBusinessHours(data.businessHours);
          savedHoursRef.current = JSON.parse(JSON.stringify(data.businessHours));
        }
        setExceptions(data.exceptions || []);
      }
    } catch (err) {
      console.error('Failed to refresh schedule:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Fetch data from API ──
  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch('/api/business/schedule');
        if (res.ok) {
          const data = await res.json();
          if (data.businessHours?.length > 0) {
            setBusinessHours(data.businessHours);
            savedHoursRef.current = JSON.parse(JSON.stringify(data.businessHours));
          } else {
            savedHoursRef.current = JSON.parse(JSON.stringify(DEFAULT_HOURS));
          }
          setExceptions(data.exceptions || []);
        }
      } catch (err) {
        console.error('Failed to fetch schedule:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  // ── Fetch team members ──
  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch('/api/business/team');
        if (res.ok) {
          const data = await res.json();
          setTeamMembers((data.members || []).filter(m => m.role === 'owner' || m.role === 'worker'));
        }
      } catch {
        // silent
      }
    }
    fetchTeam();
  }, []);

  // ── Close worker dropdown on outside click ──
  useEffect(() => {
    function handleClick(e) {
      if (workerDropdownRef.current && !workerDropdownRef.current.contains(e.target)) {
        setWorkerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Load worker schedule when selected ──
  const loadWorkerSchedule = useCallback(async (workerId) => {
    setLoadingWorkerSchedule(true);
    setWorkerSaveStatus(null);
    try {
      const res = await fetch(`/api/business/team/schedules?workerId=${workerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.businessHours) setWorkerBusinessHours(data.businessHours);
        if (data.schedule && data.schedule.length > 0) {
          const merged = WORKER_DAY_KEYS.map((_, i) => {
            const existing = data.schedule.find(s => s.day_of_week === i);
            return existing ? {
              dayOfWeek: i,
              isOpen: existing.is_open,
              openTime: existing.open_time?.substring(0, 5) || '09:00',
              closeTime: existing.close_time?.substring(0, 5) || '18:00',
            } : { dayOfWeek: i, isOpen: false, openTime: '09:00', closeTime: '18:00' };
          });
          setWorkerSchedule(merged);
          setHasCustomSchedule(true);
        } else {
          setWorkerSchedule(DEFAULT_WORKER_WEEK);
          setHasCustomSchedule(false);
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingWorkerSchedule(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWorkerId) {
      loadWorkerSchedule(selectedWorkerId);
    } else {
      setWorkerSchedule(null);
      setHasCustomSchedule(false);
    }
  }, [selectedWorkerId, loadWorkerSchedule]);

  const saveWorkerSchedule = async () => {
    if (!selectedWorkerId || !workerSchedule) return;
    setSavingWorkerSchedule(true);
    setWorkerSaveStatus(null);
    try {
      const res = await fetch('/api/business/team/schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: selectedWorkerId, schedule: workerSchedule }),
      });
      if (res.ok) {
        setWorkerSaveStatus('saved');
        setHasCustomSchedule(true);
        setTimeout(() => setWorkerSaveStatus(null), 3000);
      } else {
        setWorkerSaveStatus('error');
      }
    } catch {
      setWorkerSaveStatus('error');
    } finally {
      setSavingWorkerSchedule(false);
    }
  };

  const updateWorkerDay = (dayIndex, field, value) => {
    setWorkerSchedule(prev => prev?.map(d =>
      d.dayOfWeek === dayIndex ? { ...d, [field]: value } : d
    ) || null);
  };

  const selectedMember = teamMembers.find(m => m.user_id === selectedWorkerId);
  const selectedMemberRole = selectedMember?.role;

  // ── Save working hours ──
  const saveHours = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/business/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessHours }),
      });
      if (res.ok) {
        savedHoursRef.current = JSON.parse(JSON.stringify(businessHours));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save hours:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Update a day's hours ──
  const updateDay = (dayIndex, field, value) => {
    setBusinessHours((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayIndex ? { ...d, [field]: value } : d
      )
    );
  };

  // Count how many day settings differ from saved state
  const changeCount = useMemo(() => {
    if (!savedHoursRef.current) return 0;
    let count = 0;
    for (let i = 0; i < businessHours.length; i++) {
      const curr = businessHours[i];
      const orig = savedHoursRef.current[i];
      if (!orig) { count++; continue; }
      if (curr.isOpen !== orig.isOpen || curr.openTime !== orig.openTime || curr.closeTime !== orig.closeTime) {
        count++;
      }
    }
    return count;
  }, [businessHours, saved]);

  const hasChanges = changeCount > 0;

  // Warn on browser tab close / refresh
  useEffect(() => {
    const handler = (e) => {
      if (!hasChanges) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  // Intercept sidebar/link clicks for unsaved changes
  useEffect(() => {
    if (!hasChanges) return;
    const handleClick = (e) => {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('https://')) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavUrl(href);
      setShowUnsavedDialog(true);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [hasChanges]);

  const handleDiscardAndNavigate = () => {
    const url = pendingNavUrl;
    setShowUnsavedDialog(false);
    setPendingNavUrl(null);
    savedHoursRef.current = JSON.parse(JSON.stringify(businessHours));
    if (url) router.push(url);
  };

  const handleSaveAndNavigate = async () => {
    await saveHours();
    const url = pendingNavUrl;
    setShowUnsavedDialog(false);
    setPendingNavUrl(null);
    if (url) router.push(url);
  };

  // ── Add or update exception via API ──
  const addException = async (exceptionData) => {
    if (exceptionData.id) {
      // Update existing
      const res = await fetch('/api/business/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exceptionData),
      });
      if (res.ok) {
        const { exception } = await res.json();
        setExceptions((prev) => prev.map((e) => e.id === exception.id ? exception : e));
      } else {
        throw new Error('Failed to update exception');
      }
    } else {
      // Create new
      const res = await fetch('/api/business/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exceptionData),
      });
      if (res.ok) {
        const { exception } = await res.json();
        setExceptions((prev) => [...prev, exception]);
      } else {
        throw new Error('Failed to add exception');
      }
    }
  };

  // ── Open edit modal for an exception ──
  const openEditModal = (exc) => {
    setEditingException(exc);
    setModalDefaultDate(null);
    setIsModalOpen(true);
  };

  // ── Delete exception via API ──
  const deleteException = async (id) => {
    setDeletingId(id);
    // Allow spinner to render before fetch
    await new Promise((r) => setTimeout(r, 0));
    try {
      const res = await fetch(`/api/business/schedule?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        // Brief delay so the user sees the spinner
        await new Promise((r) => setTimeout(r, 400));
        setExceptions((prev) => prev.filter((e) => e.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  // ── Calendar navigation ──
  const goToday = () => calendarRef.current?.getApi()?.today();
  const goPrev = () => calendarRef.current?.getApi()?.prev();
  const goNext = () => calendarRef.current?.getApi()?.next();
  const changeView = (view) => {
    calendarRef.current?.getApi()?.changeView(view);
    setCurrentView(view);
  };

  // ── Build calendar events from working hours + exceptions ──
  const calendarEvents = useMemo(() => {
    const events = [];

    // Generate working hours as background events for the next 8 weeks
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    for (let w = 0; w < 8; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + w * 7 + d);
        const dayOfWeek = date.getDay();
        const dayConf = businessHours.find((h) => h.dayOfWeek === dayOfWeek);

        if (dayConf?.isOpen && dayConf.openTime && dayConf.closeTime) {
          const dateStr = date.toISOString().split('T')[0];
          events.push({
            id: `wh_${dateStr}`,
            title: 'Working Hours',
            start: `${dateStr}T${dayConf.openTime}:00`,
            end: `${dateStr}T${dayConf.closeTime}:00`,
            display: 'background',
            backgroundColor: '#D4AF3720',
            borderColor: 'transparent',
          });
        }
      }
    }

    // Add exceptions as real events
    exceptions.forEach((ex) => {
      const color = EXCEPTION_COLORS[ex.type] || EXCEPTION_COLORS.other;
      // Normalize time: DB may return HH:mm:ss or HH:mm
      const normalizeTime = (t) => {
        if (!t) return null;
        const parts = t.split(':');
        return parts.length >= 2 ? `${parts[0]}:${parts[1]}:00` : `${t}:00`;
      };

      if (ex.is_full_day) {
        // Multi-day: use end_date + 1 day (FullCalendar exclusive end)
        let endDate = ex.date;
        if (ex.end_date) {
          const d = new Date(ex.end_date + 'T00:00:00');
          d.setDate(d.getDate() + 1);
          endDate = d.toISOString().split('T')[0];
        }
        events.push({
          id: ex.id,
          title: ex.title,
          start: ex.date,
          end: ex.end_date ? endDate : undefined,
          allDay: true,
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: { ...ex },
        });
      } else if (ex.start_time && ex.end_time) {
        const startT = normalizeTime(ex.start_time);
        const endT = normalizeTime(ex.end_time);
        events.push({
          id: ex.id,
          title: ex.title,
          start: `${ex.date}T${startT}`,
          end: `${ex.date}T${endT}`,
          backgroundColor: color.bg,
          borderColor: color.border,
          extendedProps: { ...ex },
        });
      }
    });

    return events;
  }, [businessHours, exceptions]);

  // ── Date click => open exception modal ──
  const handleDateClick = useCallback((info) => {
    setEditingException(null);
    setModalDefaultDate(info.dateStr);
    setIsModalOpen(true);
  }, []);

  // ── Event click => show exception detail ──
  const handleEventClick = useCallback((info) => {
    const ex = info.event.extendedProps;
    // Ignore background working-hour events
    if (!ex || !ex.id) return;
    setSelectedExc(ex);
    setIsDetailOpen(true);
  }, []);

  // ── Delete from detail modal ──
  const deleteFromDetail = async (id) => {
    const res = await fetch(`/api/business/schedule?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setExceptions((prev) => prev.filter((e) => e.id !== id));
    } else {
      throw new Error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-7 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-72 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-[5px]" />
        </div>

        {/* Tab switcher skeleton */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-[5px] w-fit">
          <div className="h-9 w-36 bg-gray-200 rounded-[5px]" />
          <div className="h-9 w-36 bg-gray-200 rounded-[5px]" />
        </div>

        {/* Working hours card skeleton */}
        <div className="bg-white rounded-[5px] border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="h-5 w-44 bg-gray-200 rounded" />
            <div className="h-9 w-32 bg-gray-200 rounded-[5px]" />
          </div>
          <div className="divide-y divide-gray-50">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 sm:px-6 py-4">
                <div className="flex items-center gap-3 w-44">
                  <div className="w-10 h-5 bg-gray-200 rounded-full" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-32 bg-gray-100 rounded-[5px]" />
                  <div className="h-3 w-6 bg-gray-100 rounded" />
                  <div className="h-9 w-32 bg-gray-100 rounded-[5px]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exceptions card skeleton */}
        <div className="bg-white rounded-[5px] border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="h-5 w-40 bg-gray-200 rounded mb-1.5" />
            <div className="h-3 w-64 bg-gray-100 rounded" />
          </div>
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-1.5" />
                  <div className="h-3 w-48 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('schedule.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('schedule.subtitle')}
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
              setEditingException(null);
              setModalDefaultDate(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#364153] hover:bg-[#2a3444] text-white rounded-[5px] font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('schedule.addException')}
          </button>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-[5px] w-fit">
        <button
          onClick={() => setActiveTab('hours')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-all ${
            activeTab === 'hours'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          {t('schedule.activityHoursTab')}
        </button>
        <button
          onClick={() => setActiveTab('workerHours')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-all ${
            activeTab === 'workerHours'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          {t('schedule.workerHoursTab')}
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-all ${
            activeTab === 'calendar'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          {t('schedule.calendarView')}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB: Working Hours
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'hours' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Working Hours Card */}
          <div className="bg-white rounded-[5px] border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{t('schedule.weeklyHours')}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{t('schedule.weeklyHoursDesc')}</p>
              </div>
              <button
                onClick={saveHours}
                disabled={!hasChanges || saving}
                className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-all ${
                  hasChanges
                    ? 'bg-[#364153] hover:bg-[#2a3444] text-white shadow-sm'
                    : saved
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? t('common.saved') : t('common.saveChanges')}
                {hasChanges && changeCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {changeCount}
                  </span>
                )}
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {businessHours.map((day) => {
                const isToday = new Date().getDay() === day.dayOfWeek;
                return (
                <div
                  key={day.dayOfWeek}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 transition-colors ${
                    isToday ? 'bg-amber-50/60 border-l-2 border-l-amber-500' : day.isOpen ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  {/* Day name + toggle */}
                  <div className="flex items-center gap-3 sm:w-44">
                    <div
                      className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                        day.isOpen ? 'bg-amber-500' : 'bg-gray-300'
                      }`}
                      onClick={() => updateDay(day.dayOfWeek, 'isOpen', !day.isOpen)}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          day.isOpen ? 'start-5' : 'start-0.5'
                        }`}
                      />
                    </div>
                    <span className={`text-sm font-semibold ${day.isOpen ? 'text-gray-900' : 'text-gray-400'}`}>
                      {t(`days.${['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][day.dayOfWeek]}`)}
                    </span>
                  </div>

                  {/* Time inputs or Closed label */}
                  {day.isOpen ? (
                    <div className="flex items-center gap-2 flex-1">
                      <TimeSelect
                        value={day.openTime || '09:00'}
                        onChange={(val) => updateDay(day.dayOfWeek, 'openTime', val)}
                      />
                      <span className="text-gray-400 text-sm">{t('common.to')}</span>
                      <TimeSelect
                        value={day.closeTime || '19:00'}
                        onChange={(val) => updateDay(day.dayOfWeek, 'closeTime', val)}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">{t('schedule.closed')}</span>
                  )}
                </div>
              )})}
            </div>
          </div>

          {/* Exceptions List */}
          <div className="bg-white rounded-[5px] border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">{t('schedule.exceptions')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('schedule.exceptionsDesc')}</p>
            </div>

            {exceptions.length === 0 ? (
              <div className="px-4 sm:px-6 py-12 text-center">
                <Coffee className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{t('schedule.noExceptions')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('schedule.noExceptionsHint')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {exceptions.map((ex) => {
                  const IconComp = EXCEPTION_ICONS[ex.type] || HelpCircle;
                  const color = EXCEPTION_COLORS[ex.type] || EXCEPTION_COLORS.other;
                  return (
                    <div key={ex.id} className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-gray-50 transition-colors">
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-[5px] flex-shrink-0"
                        style={{ backgroundColor: color.bg + '20' }}
                      >
                        <IconComp className="w-4 h-4" style={{ color: color.bg }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{ex.title}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(ex.date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {ex.end_date && ex.end_date !== ex.date && (
                            <> — {new Date(ex.end_date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}</>
                          )}
                          {ex.is_full_day
                            ? (!ex.end_date || ex.end_date === ex.date ? ` — ${t('schedule.fullDay')}` : '')
                            : <>{' — '}<span dir="ltr">{ex.start_time} {t('common.to')} {ex.end_time}</span></>}
                          {ex.recurring && (
                            <span className="ml-1 text-amber-600">
                              <RotateCw className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                              {t('schedule.weekly')}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => openEditModal(ex)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-[5px] transition-colors flex-shrink-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteException(ex.id)}
                        disabled={deletingId === ex.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-[5px] transition-colors flex-shrink-0 disabled:opacity-50"
                      >
                        {deletingId === ex.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: Worker Hours
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'workerHours' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-[5px] border border-gray-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-0.5">
                <Users className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-base font-semibold text-gray-900">{t('schedule.teamSchedules')}</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{t('schedule.teamSchedulesDesc')}</p>
            </div>

            {teamMembers.length === 0 ? (
              <div className="px-4 sm:px-6 py-10 text-center">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{t('schedule.noTeamMembers')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('schedule.noTeamMembersHint')}</p>
              </div>
            ) : (
              <div className="px-4 sm:px-6 py-4">
                {/* Member selector */}
                <div className="relative" ref={workerDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setWorkerDropdownOpen(!workerDropdownOpen)}
                    className="w-full flex items-center gap-3 border border-gray-200 rounded-[5px] p-2.5 text-sm focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none bg-white text-left"
                  >
                    {selectedWorkerId ? (() => {
                      const m = teamMembers.find(m => m.user_id === selectedWorkerId);
                      if (!m) return <span className="text-gray-400">{t('schedule.selectMember')}</span>;
                      const profile = m.users?.user_profile;
                      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || m.users?.username || 'Member';
                      const avatarUrl = profile?.profile_image_url;
                      return (
                        <>
                          <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : m.role === 'owner' ? (
                              <Crown className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </div>
                          <span className="flex-1 truncate font-medium text-gray-900">{name}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                            m.role === 'owner' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {m.role === 'owner' ? t('schedule.ownerRole') : t('schedule.workerRole')}
                          </span>
                        </>
                      );
                    })() : (
                      <>
                        <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gray-100 flex items-center justify-center">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <span className="flex-1 text-gray-400">{t('schedule.selectMember')}</span>
                      </>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${workerDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {workerDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-[5px] shadow-lg py-1 max-h-60 overflow-y-auto">
                      {teamMembers.map(m => {
                        const profile = m.users?.user_profile;
                        const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || m.users?.username || 'Member';
                        const avatarUrl = profile?.profile_image_url;
                        const isSelected = selectedWorkerId === m.user_id;
                        return (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => {
                              setSelectedWorkerId(m.user_id);
                              setWorkerDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                              isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : m.role === 'owner' ? (
                                <Crown className="w-4 h-4 text-amber-600" />
                              ) : (
                                <User className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-start">
                              <p className={`font-medium truncate ${isSelected ? 'text-amber-900' : 'text-gray-900'}`}>{name}</p>
                            </div>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                              m.role === 'owner' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {m.role === 'owner' ? t('schedule.ownerRole') : t('schedule.workerRole')}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedWorkerId && (
                  <div className="mt-4 space-y-3">
                    {/* Role badge */}
                    <div className="flex items-center gap-2">
                      {selectedMemberRole === 'owner' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                          <Crown className="w-3 h-3" />
                          {t('schedule.ownerScheduleLabel')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          <User className="w-3 h-3" />
                          {t('schedule.workerScheduleLabel')}
                        </span>
                      )}
                    </div>

                    {loadingWorkerSchedule ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : workerSchedule ? (
                      <>
                        {!hasCustomSchedule && (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-[5px] text-xs text-blue-600">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {t('schedule.usingBusinessHours')}
                          </div>
                        )}

                        {/* Day schedule rows */}
                        <div className="space-y-1">
                          {workerSchedule.map((day) => {
                            const bizDay = workerBusinessHours.find(b => b.dayOfWeek === day.dayOfWeek);
                            const businessClosed = bizDay ? !bizDay.isOpen : false;
                            const bizOpen = bizDay?.openTime?.substring(0, 5) || null;
                            const bizClose = bizDay?.closeTime?.substring(0, 5) || null;

                            return (
                              <div key={day.dayOfWeek} className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 rounded-[5px] transition-colors ${
                                businessClosed ? 'bg-gray-100/70' : day.isOpen ? 'bg-amber-50/40' : 'bg-gray-50 hover:bg-gray-100'
                              }`}>
                                <div className="flex items-center gap-3 sm:w-44">
                                  <div
                                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                                      businessClosed ? 'bg-gray-300 cursor-not-allowed opacity-60' :
                                      day.isOpen ? 'bg-amber-500' : 'bg-gray-300'
                                    }`}
                                    onClick={() => !businessClosed && updateWorkerDay(day.dayOfWeek, 'isOpen', !day.isOpen)}
                                  >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                      day.isOpen && !businessClosed ? 'start-5' : 'start-0.5'
                                    }`} />
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    businessClosed ? 'text-gray-400' : day.isOpen ? 'text-gray-900' : 'text-gray-400'
                                  }`}>
                                    {t(`days.${['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][day.dayOfWeek]}`)}
                                  </span>
                                </div>
                                {businessClosed ? (
                                  <span className="text-xs text-gray-400 italic flex-1 ps-[52px] sm:ps-0">{t('schedule.businessClosedDay')}</span>
                                ) : day.isOpen ? (
                                  <div className="flex items-center gap-2 flex-1 min-w-0 ps-[52px] sm:ps-0">
                                    <TimeSelect
                                      value={day.openTime}
                                      onChange={(v) => updateWorkerDay(day.dayOfWeek, 'openTime', v)}
                                      minTime={bizOpen}
                                      maxTime={bizClose}
                                      className="border border-gray-200 rounded-[5px] px-2 py-1.5 text-sm w-[80px] sm:w-[90px] focus:ring-1 focus:ring-amber-400/30 outline-none bg-white appearance-none"
                                    />
                                    <span className="text-gray-400 text-sm">{t('common.to')}</span>
                                    <TimeSelect
                                      value={day.closeTime}
                                      onChange={(v) => updateWorkerDay(day.dayOfWeek, 'closeTime', v)}
                                      minTime={bizOpen}
                                      maxTime={bizClose}
                                      className="border border-gray-200 rounded-[5px] px-2 py-1.5 text-sm w-[80px] sm:w-[90px] focus:ring-1 focus:ring-amber-400/30 outline-none bg-white appearance-none"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 flex-1 ps-[52px] sm:ps-0">{t('schedule.dayOff')}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Save button */}
                        <div className="flex items-center justify-between pt-2">
                          {workerSaveStatus === 'saved' && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              {t('schedule.memberScheduleSaved')}
                            </span>
                          )}
                          {workerSaveStatus === 'error' && (
                            <span className="text-xs text-red-500">{t('schedule.memberScheduleError')}</span>
                          )}
                          {!workerSaveStatus && <div />}
                          <button
                            onClick={saveWorkerSchedule}
                            disabled={savingWorkerSchedule}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-medium transition-all ${
                              savingWorkerSchedule
                                ? 'bg-gray-100 text-gray-400'
                                : 'bg-[#364153] hover:bg-[#2a3444] text-white shadow-sm'
                            }`}
                          >
                            {savingWorkerSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {savingWorkerSchedule ? t('common.saving') : t('common.saveChanges')}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: Calendar View
          ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[5px] border border-gray-200 overflow-hidden"
        >
          {/* Toolbar */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToday}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-[5px] transition-colors"
                >
                  {t('common.today')}
                </button>
                <button
                  onClick={goPrev}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-[5px] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goNext}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-[5px] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* View switcher */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-[5px]">
                {[
                  { key: 'dayGridMonth', label: t('common.month') },
                  { key: 'timeGridWeek', label: t('common.week') },
                  { key: 'timeGridDay', label: t('common.day') },
                  { key: 'listMonth', label: t('common.list') },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => changeView(key)}
                    className={`px-3 py-1.5 rounded-[5px] text-xs font-medium transition-all ${
                      currentView === key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-300" />
                  <span className="text-xs text-gray-500">{t('schedule.working')}</span>
                </div>
                {Object.entries(EXCEPTION_COLORS).slice(0, 4).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color.bg }} />
                    <span className="text-xs text-gray-500">{t(`exception.${type === 'lunch_break' ? 'lunchBreak' : type}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="p-2 sm:p-4 fc-custom">
            <FullCalendarWrapper
              ref={calendarRef}
              events={calendarEvents}
              locale={locale}
              noEventsText={t('common.no_events')}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
            />
          </div>
        </motion.div>
      )}

      {/* ── Exception Modal ── */}
      <AddExceptionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingException(null); }}
        onSave={addException}
        defaultDate={modalDefaultDate}
        editException={editingException}
        businessHours={businessHours}
      />

      {/* ── Exception Detail Modal ── */}
      <ExceptionDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedExc(null);
        }}
        exception={selectedExc}
        onDelete={deleteFromDetail}
        onEdit={(exc) => openEditModal(exc)}
      />

      {/* ── Unsaved Changes Dialog ── */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`bg-white rounded-[5px] shadow-xl max-w-sm w-full mx-4 overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">{t('common.unsavedTitle')}</h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{t('common.unsavedMessage')}</p>
              <p className="text-xs text-gray-400 mt-1.5">
                {changeCount} {t('common.changes')}
              </p>
            </div>
            <div className={`flex gap-2 px-5 pb-5 pt-2 ${isRTL ? '' : 'flex-row-reverse'}`}>
              <button
                onClick={() => { setShowUnsavedDialog(false); setPendingNavUrl(null); }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-[5px] hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDiscardAndNavigate}
                className="flex-1 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-[5px] hover:bg-red-50 transition-colors"
              >
                {t('common.discard')}
              </button>
              <button
                onClick={handleSaveAndNavigate}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-[#364153] rounded-[5px] hover:bg-[#364153]/90 transition-colors disabled:opacity-60"
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
