'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  X,
  Clock,
  User,
  Scissors,
  Phone,
  CheckCircle2,
  XCircle,
  CalendarDays,
  MessageSquare,
  AlertTriangle,
  MapPin,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
} from 'lucide-react';

export default function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
  onConfirm,
  onComplete,
  onCancel,
  onReschedule,
  onReassign,
  mode = 'business', // 'business' | 'worker'
  businessId,        // required when mode='worker'
}) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(null);
  const [dateOptions, setDateOptions] = useState([]);
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [closedMessage, setClosedMessage] = useState(null);
  const [closedDates, setClosedDates] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [reassigning, setReassigning] = useState(false);
  const { t } = useLanguage();

  // Reset state when modal closes or appointment changes
  useEffect(() => {
    if (!isOpen) {
      setRescheduleMode(false);
      setRescheduleDate(null);
      setSlots(null);
      setSelectedSlot(null);
      setRescheduleError(null);
      setClosedMessage(null);
      setClosedDates({});
      setConfirmAction(null);
      setActionLoading(false);
      setTeamMembers([]);
    }
  }, [isOpen]);

  // Fetch team members when modal opens (business mode only)
  useEffect(() => {
    if (!isOpen || mode === 'worker') return;
    fetch('/api/business/team')
      .then(async r => {
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return { members: [] };
        return r.json();
      })
      .then(data => setTeamMembers(data.members || []))
      .catch(() => setTeamMembers([]));
  }, [isOpen]);

  const handleReassign = async (workerId) => {
    if (!appointment?.id) return;
    setReassigning(true);
    try {
      const res = await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointment.id, assigned_worker_id: workerId || null }),
      });
      if (res.ok && onReassign) onReassign();
    } catch (err) {
      console.error('[AppointmentDetail] Reassign failed:', err);
    } finally {
      setReassigning(false);
    }
  };

  if (!appointment) return null;

  const statusColors = {
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: t('appointmentDetail.confirmed') },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: t('appointmentDetail.completed') },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: t('appointmentDetail.cancelled') },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: t('appointmentDetail.pending') },
  };

  const status = statusColors[appointment.extendedProps?.status] || statusColors.pending;

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  };

  const getDurationMinutes = () => {
    if (!appointment.start || !appointment.end) return null;
    const start = new Date(appointment.start);
    const end = new Date(appointment.end);
    return Math.round((end - start) / 60000);
  };

  const duration = getDurationMinutes();

  // ── Reschedule logic ──
  const formatDateStr = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

  const loadSlots = async (dateStr) => {
    setSlotsLoading(true);
    setSlots(null);
    setClosedMessage(null);
    setSelectedSlot(null);
    setRescheduleError(null);
    try {
      const bizId = appointment.extendedProps?.businessInfoId || appointment.extendedProps?.business_info_id;
      const dur = duration || 20;
      const res = await fetch(`/api/book/available-slots?businessId=${encodeURIComponent(bizId)}&date=${dateStr}&duration=${dur}`);
      const data = await res.json();

      if (data.closed) {
        setSlots([]);
        setClosedMessage(data.message || null);
        setClosedDates(prev => ({ ...prev, [dateStr]: data.message || true }));
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

  const startReschedule = () => {
    setRescheduleMode(true);
    const startDt = new Date(appointment.start);
    const dates = generateDateOptions(startDt);
    setDateOptions(dates);
    const initialDate = formatDateStr(startDt);
    setRescheduleDate(initialDate);
    loadSlots(initialDate);
  };

  const handleDateChange = (dateStr) => {
    setRescheduleDate(dateStr);
    loadSlots(dateStr);
  };

  const handleRescheduleConfirm = async () => {
    if (!selectedSlot || !rescheduleDate) return;
    setRescheduleSaving(true);
    setRescheduleError(null);
    try {
      const newStart = `${rescheduleDate}T${selectedSlot.start}:00Z`;
      const newEnd = `${rescheduleDate}T${selectedSlot.end}:00Z`;
      const apiUrl = mode === 'worker' ? '/api/worker/appointments' : '/api/business/appointments';
      const body = mode === 'worker'
        ? { id: appointment.id, businessId, start_time: newStart, end_time: newEnd }
        : { id: appointment.id, start_time: newStart, end_time: newEnd };
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to reschedule');
      }
      if (onReschedule) onReschedule();
      onClose();
    } catch (err) {
      setRescheduleError(err.message);
    } finally {
      setRescheduleSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle on mobile */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {rescheduleMode ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setRescheduleMode(false)} className="p-1 -ml-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h2 className="text-lg font-bold text-gray-900">{t('appointmentDetail.reschedule')}</h2>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-bold text-gray-900 truncate">
                        {appointment.title}
                      </h2>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 pb-4 overflow-y-auto flex-1">
              {rescheduleMode ? (
                /* ── Reschedule view ── */
                <div className="space-y-4">
                  {/* Current appointment summary */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Scissors className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-gray-900 truncate">{appointment.extendedProps?.service || appointment.title}</p>
                      {duration && <span className="text-[12px] text-gray-400">{duration} min</span>}
                    </div>
                    {appointment.extendedProps?.price && (
                      <span className="text-[13px] font-bold text-amber-600">{appointment.extendedProps.price} MAD</span>
                    )}
                  </div>

                  {/* Date picker */}
                  <div>
                    <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('appointmentDetail.selectDate')}</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                      {dateOptions.map((d) => {
                        const ds = formatDateStr(d);
                        const isSelected = ds === rescheduleDate;
                        const isClosed = closedDates[ds];
                        return (
                          <button
                            key={ds}
                            onClick={() => handleDateChange(ds)}
                            disabled={false}
                            className={`flex flex-col items-center min-w-[56px] px-2 py-2 rounded-xl border text-center transition-all shrink-0 ${
                              isSelected
                                ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200'
                                : isClosed
                                  ? 'border-gray-200 bg-gray-50 opacity-60'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="text-[10px] font-medium text-gray-400 uppercase">
                              {d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                            </span>
                            <span className={`text-[16px] font-bold ${isSelected ? 'text-amber-700' : 'text-gray-900'}`}>
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

                  {/* Closed message */}
                  {closedMessage && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-amber-700">{closedMessage}</p>
                    </div>
                  )}

                  {/* Slots */}
                  <div>
                    <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('appointmentDetail.selectTime')}</p>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                      </div>
                    ) : slots && slots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.start}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
                              selectedSlot?.start === slot.start
                                ? 'border-amber-400 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {slot.start}
                          </button>
                        ))}
                      </div>
                    ) : !closedMessage ? (
                      <div className="text-center py-6 text-[13px] text-gray-400">{t('appointmentDetail.noSlots')}</div>
                    ) : null}
                  </div>

                  {/* Reschedule error */}
                  {rescheduleError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-red-600">{rescheduleError}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Detail view (card-based like booking page) ── */
                <div className="space-y-4">
                  {/* Service card */}
                  {appointment.extendedProps?.service && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{t('appointmentDetail.service')}</p>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-50">
                          <Scissors className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-gray-900">{appointment.extendedProps.service}</p>
                          {duration && <span className="text-[12px] text-gray-400">{duration} min</span>}
                        </div>
                        {appointment.extendedProps?.price && (
                          <span className="text-[13px] font-bold text-amber-600">{appointment.extendedProps.price} MAD</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Modified by client banner */}
                  {appointment.extendedProps?.rescheduled_by === 'client' && (
                    <div className="border border-amber-300 bg-amber-50 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 flex items-start gap-3">
                        <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-amber-700">{t('appointmentDetail.modifiedByClient')}</p>
                          {appointment.extendedProps?.previous_start_time && (
                            <div className="mt-1.5 text-[12px] text-amber-600 space-y-0.5">
                              <p>
                                <span className="line-through opacity-70">
                                  {formatDate(appointment.extendedProps.previous_start_time)} · {formatTime(appointment.extendedProps.previous_start_time)}
                                  {appointment.extendedProps.previous_end_time && ` – ${formatTime(appointment.extendedProps.previous_end_time)}`}
                                </span>
                              </p>
                              <p className="font-medium text-amber-800">
                                → {formatDate(appointment.start)} · {formatTime(appointment.start)}
                                {appointment.end && ` – ${formatTime(appointment.end)}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date & Time card */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{t('appointmentDetail.dateAndTime')}</p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        <span className="text-[14px] text-gray-900">{formatDate(appointment.start)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-[14px] text-gray-900">
                          {formatTime(appointment.start)}
                          {appointment.end && ` – ${formatTime(appointment.end)}`}
                        </span>
                        {duration && <span className="text-[12px] text-gray-400">({duration} min)</span>}
                      </div>
                    </div>
                  </div>

                  {/* Client Details card */}
                  {(appointment.extendedProps?.client || appointment.extendedProps?.phone || appointment.extendedProps?.clientAddress) && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{t('appointmentDetail.clientDetails')}</p>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {appointment.extendedProps?.client && (
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-[14px] text-gray-900">{appointment.extendedProps.client}</span>
                          </div>
                        )}
                        {appointment.extendedProps?.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-[14px] text-gray-900">{appointment.extendedProps.phone}</span>
                          </div>
                        )}
                        {appointment.extendedProps?.clientAddress && (
                          <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-[14px] text-gray-900">{appointment.extendedProps.clientAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assigned Worker card */}
                  {teamMembers.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{t('appointmentDetail.assignedWorker')}</p>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {/* Current assignment */}
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-[14px] text-gray-900">
                            {appointment.extendedProps?.assignedWorkerName || t('newAppointment.noWorker')}
                          </span>
                        </div>
                        {/* Reassign buttons */}
                        {appointment.extendedProps?.status !== 'completed' && appointment.extendedProps?.status !== 'cancelled' && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {appointment.extendedProps?.assignedWorkerId && (
                              <button
                                onClick={() => handleReassign(null)}
                                disabled={reassigning}
                                className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                              >
                                {t('appointmentDetail.unassign')}
                              </button>
                            )}
                            {teamMembers.map((member) => {
                              const profile = member.users?.user_profile;
                              const name = profile?.first_name
                                ? `${profile.first_name} ${profile.last_name || ''}`.trim()
                                : member.users?.username || '';
                              const isActive = appointment.extendedProps?.assignedWorkerId === member.user_id;
                              if (isActive) return null;
                              return (
                                <button
                                  key={member.user_id}
                                  onClick={() => handleReassign(member.user_id)}
                                  disabled={reassigning}
                                  className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                                >
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes card */}
                  {appointment.extendedProps?.notes && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">{t('appointmentDetail.notes')}</p>
                      </div>
                      <div className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="text-[14px] text-gray-700">{appointment.extendedProps.notes}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Price */}
                  {appointment.extendedProps?.price && (
                    <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl">
                      <span className="text-[14px] font-medium text-gray-600">{t('appointmentDetail.totalPrice')}</span>
                      <span className="text-lg font-bold text-amber-600">{appointment.extendedProps.price} MAD</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {rescheduleMode ? (
              <div className="px-5 pb-5 pt-2">
                <button
                  onClick={handleRescheduleConfirm}
                  disabled={!selectedSlot || rescheduleSaving}
                  className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rescheduleSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarClock className="w-4 h-4" />
                  )}
                  {t('appointmentDetail.confirmReschedule')}
                </button>
              </div>
            ) : appointment.extendedProps?.status !== 'completed' && appointment.extendedProps?.status !== 'cancelled' ? (
              <div className="px-5 pb-5 pt-2 space-y-2">
                {/* Top row: Confirm / Reschedule */}
                <div className="flex flex-wrap gap-2">
                  {appointment.extendedProps?.status === 'pending' && onConfirm && (
                    <button
                      onClick={() => setConfirmAction({
                        type: 'confirm',
                        label: t('appointmentDetail.confirmTitle'),
                        message: t('appointmentDetail.confirmMessage'),
                        btnClass: 'bg-[#D4AF37] hover:bg-[#b8960c] text-white',
                        icon: <CheckCircle2 className="w-5 h-5" />,
                        action: async () => { await onConfirm(appointment.id); },
                      })}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#D4AF37] hover:bg-[#b8960c] text-white rounded-xl font-semibold text-[13px] transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t('appointmentDetail.confirm')}
                    </button>
                  )}
                  {(appointment.extendedProps?.status === 'confirmed' || appointment.extendedProps?.status === 'pending') && (appointment.extendedProps?.businessInfoId || appointment.extendedProps?.business_info_id) && (
                    <button
                      onClick={startReschedule}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-[13px] transition-colors shadow-sm"
                    >
                      <CalendarClock className="w-4 h-4" />
                      {t('appointmentDetail.reschedule')}
                    </button>
                  )}
                  {new Date(appointment.start) <= new Date() && (
                    <button
                      onClick={() => setConfirmAction({
                        type: 'complete',
                        label: t('appointmentDetail.markCompleteTitle'),
                        message: t('appointmentDetail.markCompleteMessage'),
                        btnClass: 'bg-emerald-500 hover:bg-emerald-600 text-white',
                        icon: <CheckCircle2 className="w-5 h-5" />,
                        action: async () => { await onComplete(appointment.id); },
                      })}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-[13px] transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t('appointmentDetail.markComplete')}
                    </button>
                  )}
                </div>
                {/* Cancel row */}
                <button
                  onClick={() => setConfirmAction({
                    type: 'cancel',
                    label: t('appointmentDetail.cancelTitle'),
                    message: t('appointmentDetail.cancelMessage'),
                    btnClass: 'bg-red-500 hover:bg-red-600 text-white',
                    icon: <XCircle className="w-5 h-5" />,
                    action: async () => { await onCancel(appointment.id); },
                  })}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium text-[13px] transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  {t('appointmentDetail.cancelBtn')}
                </button>
              </div>
            ) : (
              <div className="px-5 pb-5 pt-2">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-[14px] transition-colors"
                >
                  {t('appointmentDetail.close')}
                </button>
              </div>
            )}
          </motion.div>

          {/* ── Confirmation Dialog ── */}
          <AnimatePresence>
            {confirmAction && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[10000] flex items-center justify-center p-4"
                onClick={() => { if (!actionLoading) setConfirmAction(null); }}
              >
                <div className="absolute inset-0 bg-black/30" />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', duration: 0.3 }}
                  className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
                      confirmAction.type === 'cancel' ? 'bg-red-100' : confirmAction.type === 'confirm' ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                      <AlertTriangle className={`w-6 h-6 ${
                        confirmAction.type === 'cancel' ? 'text-red-500' : confirmAction.type === 'confirm' ? 'text-amber-500' : 'text-emerald-500'
                      }`} />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{confirmAction.label}</h3>
                    <p className="text-sm text-gray-500 mb-5">{confirmAction.message}</p>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => setConfirmAction(null)}
                        disabled={actionLoading}
                        className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                      >
                        {t('appointmentDetail.goBack')}
                      </button>
                      <button
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            await confirmAction.action();
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setActionLoading(false);
                            setConfirmAction(null);
                            onClose();
                          }
                        }}
                        disabled={actionLoading}
                        className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 ${confirmAction.btnClass}`}
                      >
                        {actionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          confirmAction.type === 'cancel' ? t('appointmentDetail.cancelBtn') : confirmAction.type === 'confirm' ? t('appointmentDetail.confirm') : t('appointmentDetail.complete')
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
