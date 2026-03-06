'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  X,
  Coffee,
  Utensils,
  XCircle,
  Palmtree,
  Plane,
  HelpCircle,
  Trash2,
  CalendarDays,
  Clock,
  RotateCw,
  MessageSquare,
  Loader2,
} from 'lucide-react';

const EXCEPTION_ICONS = {
  break: Coffee,
  lunch_break: Utensils,
  closure: XCircle,
  holiday: Palmtree,
  vacation: Plane,
  other: HelpCircle,
};

const EXCEPTION_COLORS = {
  break: { bg: '#3B82F6', labelKey: 'exceptionDetail.break' },
  lunch_break: { bg: '#F97316', labelKey: 'exceptionDetail.lunchBreak' },
  closure: { bg: '#EF4444', labelKey: 'exceptionDetail.closure' },
  holiday: { bg: '#10B981', labelKey: 'exceptionDetail.holiday' },
  vacation: { bg: '#8B5CF6', labelKey: 'exceptionDetail.vacation' },
  other: { bg: '#6B7280', labelKey: 'exceptionDetail.other' },
};

const DAY_KEYS = ['days.sunday', 'days.monday', 'days.tuesday', 'days.wednesday', 'days.thursday', 'days.friday', 'days.saturday'];

export default function ExceptionDetailModal({ isOpen, onClose, exception, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const { t } = useLanguage();

  if (!exception) return null;

  const IconComp = EXCEPTION_ICONS[exception.type] || HelpCircle;
  const colorInfo = EXCEPTION_COLORS[exception.type] || EXCEPTION_COLORS.other;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(exception.id);
      onClose();
    } catch {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setDeleting(false);
    onClose();
  };

  const formattedDate = exception.date
    ? new Date(exception.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const formattedEndDate = exception.end_date && exception.end_date !== exception.date
    ? new Date(exception.end_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const formatTime = (t) => {
    if (!t) return '';
    const parts = t.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white w-full sm:max-w-md sm:rounded-[5px] rounded-t-[16px] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Drag handle (mobile) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header bar with type color */}
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ borderTop: `4px solid ${colorInfo.bg}` }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-[5px] flex-shrink-0"
                style={{ backgroundColor: colorInfo.bg + '18' }}
              >
                <IconComp className="w-5 h-5" style={{ color: colorInfo.bg }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{exception.title}</h3>
                <span
                  className="inline-block text-xs font-medium px-2 py-0.5 rounded-full text-white mt-0.5"
                  style={{ backgroundColor: colorInfo.bg }}
                >
                  {t(colorInfo.labelKey)}
                </span>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[5px] transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details */}
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {/* Date */}
              <div className="flex items-start gap-3">
                <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formattedDate}
                    {formattedEndDate && <> — {formattedEndDate}</>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {exception.is_full_day
                      ? (formattedEndDate ? t('exceptionDetail.multipleDays') : t('exceptionDetail.fullDay'))
                      : `${formatTime(exception.start_time)} — ${formatTime(exception.end_time)}`}
                  </p>
                </div>
              </div>

              {/* Time (if not full day) */}
              {!exception.is_full_day && exception.start_time && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(exception.start_time)} — {formatTime(exception.end_time)}
                    </p>
                    <p className="text-xs text-gray-500">{t('exceptionDetail.timeRange')}</p>
                  </div>
                </div>
              )}

              {/* Recurring */}
              {exception.recurring && (
                <div className="flex items-start gap-3">
                  <RotateCw className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('exceptionDetail.repeatsWeekly')}</p>
                    <p className="text-xs text-gray-500">
                      {t('exceptionDetail.every')} {t(DAY_KEYS[exception.recurring_day])}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {exception.notes && (
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('exceptionDetail.notes')}</p>
                    <p className="text-xs text-gray-500 whitespace-pre-wrap">{exception.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleClose}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[5px] font-medium text-sm transition-colors order-2 sm:order-1"
              >
                {t('exceptionDetail.close')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 rounded-[5px] font-medium text-sm transition-colors shadow-sm order-1 sm:order-2 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleting ? t('exceptionDetail.deleting') : t('exceptionDetail.deleteException')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
