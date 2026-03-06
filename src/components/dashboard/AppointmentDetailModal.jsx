'use client';

import { useState } from 'react';
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
  GripVertical,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

export default function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
  onConfirm,
  onComplete,
  onCancel,
}) {
  const [confirmAction, setConfirmAction] = useState(null);
  const { t } = useLanguage();

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
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
            className="relative w-full sm:max-w-md bg-white rounded-t-[5px] sm:rounded-[5px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle on mobile */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header with colored accent */}
            <div
              className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                    {appointment.title}
                  </h2>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[5px] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Details */}
            <div className="px-4 sm:px-6 pb-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
              {/* Date & Time */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-[5px]">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-[5px] shadow-sm">
                  <CalendarDays className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(appointment.start)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatTime(appointment.start)}
                    {appointment.end && ` — ${formatTime(appointment.end)}`}
                  </p>
                </div>
              </div>

              {/* Client */}
              {appointment.extendedProps?.client && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-[5px]">
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-[5px] shadow-sm">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{t('appointmentDetail.client')}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {appointment.extendedProps.client}
                    </p>
                  </div>
                </div>
              )}

              {/* Service */}
              {appointment.extendedProps?.service && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-[5px]">
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-[5px] shadow-sm">
                    <Scissors className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{t('appointmentDetail.service')}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {appointment.extendedProps.service}
                    </p>
                  </div>
                </div>
              )}

              {/* Phone */}
              {appointment.extendedProps?.phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-[5px]">
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-[5px] shadow-sm">
                    <Phone className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{t('appointmentDetail.phone')}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {appointment.extendedProps.phone}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {appointment.extendedProps?.notes && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-[5px]">
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-[5px] shadow-sm">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{t('appointmentDetail.notes')}</p>
                    <p className="text-sm text-gray-700">
                      {appointment.extendedProps.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Price */}
              {appointment.extendedProps?.price && (
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-[5px]">
                  <span className="text-sm font-medium text-amber-800">{t('appointmentDetail.totalPrice')}</span>
                  <span className="text-lg font-bold text-amber-700">
                    {appointment.extendedProps.price} MAD
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            {appointment.extendedProps?.status !== 'completed' &&
              appointment.extendedProps?.status !== 'cancelled' && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {appointment.extendedProps?.status === 'pending' && onConfirm && (
                    <button
                      onClick={() => setConfirmAction({
                        type: 'confirm',
                        label: t('appointmentDetail.confirmTitle'),
                        message: t('appointmentDetail.confirmMessage'),
                        btnClass: 'bg-[#D4AF37] hover:bg-[#b8960c] text-white',
                        icon: <CheckCircle2 className="w-5 h-5" />,
                        action: () => { onConfirm(appointment.id); onClose(); },
                      })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-[#D4AF37] hover:bg-[#b8960c] text-white rounded-[5px] font-medium text-sm transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t('appointmentDetail.confirm')}
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
                        action: () => { onComplete(appointment.id); onClose(); },
                      })}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[5px] font-medium text-sm transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {t('appointmentDetail.markComplete')}
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmAction({
                      type: 'cancel',
                      label: t('appointmentDetail.cancelTitle'),
                      message: t('appointmentDetail.cancelMessage'),
                      btnClass: 'bg-red-500 hover:bg-red-600 text-white',
                      icon: <XCircle className="w-5 h-5" />,
                      action: () => { onCancel(appointment.id); onClose(); },
                    })}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-[5px] font-medium text-sm transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('appointmentDetail.cancelBtn')}
                  </button>
                </div>
              )}

            {/* Completed / Cancelled footer */}
            {(appointment.extendedProps?.status === 'completed' ||
              appointment.extendedProps?.status === 'cancelled') && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-3 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[5px] font-medium text-sm transition-colors"
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
                onClick={() => setConfirmAction(null)}
              >
                <div className="absolute inset-0 bg-black/30" />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', duration: 0.3 }}
                  className="relative bg-white rounded-[5px] shadow-2xl w-full max-w-sm p-5 sm:p-6"
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
                        className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[5px] font-medium text-sm transition-colors"
                      >
                        {t('appointmentDetail.goBack')}
                      </button>
                      <button
                        onClick={() => {
                          confirmAction.action();
                          setConfirmAction(null);
                        }}
                        className={`flex-1 px-4 py-2.5 rounded-[5px] font-medium text-sm transition-colors shadow-sm ${confirmAction.btnClass}`}
                      >
                        {confirmAction.type === 'cancel' ? t('appointmentDetail.cancelBtn') : confirmAction.type === 'confirm' ? t('appointmentDetail.confirm') : t('appointmentDetail.complete')}
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
