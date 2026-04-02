'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';
import { sanitizeInput as sanitizeText } from '@/lib/sanitize';
import {
  X,
  Plus,
  Clock,
  CalendarDays,
  Coffee,
  Utensils,
  XCircle,
  Palmtree,
  Plane,
  HelpCircle,
  MessageSquare,
  RotateCw,
  Pencil,
  AlertTriangle,
} from 'lucide-react';

const EXCEPTION_TYPES = [
  { value: 'break', labelKey: 'exception.break', icon: Coffee, color: 'bg-blue-500' },
  { value: 'lunch_break', labelKey: 'exception.lunchBreak', icon: Utensils, color: 'bg-orange-500' },
  { value: 'closure', labelKey: 'exception.closure', icon: XCircle, color: 'bg-red-500' },
  { value: 'holiday', labelKey: 'exception.holiday', icon: Palmtree, color: 'bg-emerald-500' },
  { value: 'vacation', labelKey: 'exception.vacation', icon: Plane, color: 'bg-purple-500' },
  { value: 'other', labelKey: 'exception.other', icon: HelpCircle, color: 'bg-gray-500' },
];

const DAY_KEYS = ['days.sunday', 'days.monday', 'days.tuesday', 'days.wednesday', 'days.thursday', 'days.friday', 'days.saturday'];

// Generate 24h time options at 15-minute intervals within a range
function generateTimeOptions(minTime, maxTime) {
  const options = [];
  const [minH, minM] = (minTime || '00:00').split(':').map(Number);
  const [maxH, maxM] = (maxTime || '23:45').split(':').map(Number);
  const startMin = minH * 60 + minM;
  const endMin = maxH * 60 + maxM;
  for (let m = startMin; m <= endMin; m += 15) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    options.push(`${hh}:${mm}`);
  }
  return options;
}

export default function AddExceptionModal({ isOpen, onClose, onSave, defaultDate, editException, businessHours }) {
  const { t } = useLanguage();
  const { businessCategory } = useBusinessCategory();
  const today = new Date().toISOString().split('T')[0];
  const isEditMode = !!editException;

  const filteredExceptionTypes = businessCategory === 'mobile_service'
    ? EXCEPTION_TYPES.filter(type => !['break', 'lunch_break', 'closure'].includes(type.value))
    : EXCEPTION_TYPES;

  const defaultType = filteredExceptionTypes[0];

  const getInitialFormData = () => {
    if (editException) {
      return {
        title: editException.title || '',
        type: editException.type || defaultType.value,
        date: editException.date || today,
        endDate: editException.end_date || '',
        startTime: editException.start_time ? editException.start_time.substring(0, 5) : '',
        endTime: editException.end_time ? editException.end_time.substring(0, 5) : '',
        isFullDay: editException.is_full_day || false,
        recurring: editException.recurring || false,
        recurringDay: editException.recurring_day ?? new Date().getDay(),
        notes: editException.notes || '',
      };
    }
    return {
      title: t(defaultType.labelKey),
      type: defaultType.value,
      date: defaultDate || today,
      endDate: '',
      startTime: '',
      endTime: '',
      isFullDay: false,
      recurring: false,
      recurringDay: new Date().getDay(),
      notes: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Helper: get current time as HH:mm string
  const getNowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // Helper: check if selected date is today
  const isToday = formData.date === today;

  // Get working hours for the selected date's day of week
  const selectedDayHours = useMemo(() => {
    if (!formData.date || !businessHours?.length) return null;
    const d = new Date(formData.date + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const dayConf = businessHours.find(h => h.dayOfWeek === dayOfWeek);
    if (!dayConf || !dayConf.isOpen) return null; // closed day
    return { openTime: dayConf.openTime || '00:00', closeTime: dayConf.closeTime || '23:45' };
  }, [formData.date, businessHours]);

  // Is the selected day a closed day?
  const isDayClosed = useMemo(() => {
    if (!formData.date || !businessHours?.length) return false;
    const d = new Date(formData.date + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const dayConf = businessHours.find(h => h.dayOfWeek === dayOfWeek);
    return dayConf ? !dayConf.isOpen : false;
  }, [formData.date, businessHours]);

  // Generate time options based on working hours
  const timeOptions = useMemo(() => {
    if (selectedDayHours) {
      return generateTimeOptions(selectedDayHours.openTime, selectedDayHours.closeTime);
    }
    // Fallback: full day range if no working hours data
    return generateTimeOptions('00:00', '23:45');
  }, [selectedDayHours]);

  // Sync form data when modal opens or editException changes
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
    }
  }, [isOpen, editException]);

  // Sync defaultDate prop when modal opens with a different date (new mode only)
  useEffect(() => {
    if (isOpen && defaultDate && !editException) {
      setFormData((prev) => ({ ...prev, date: defaultDate }));
    }
  }, [isOpen, defaultDate, editException]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-set title based on type
      if (field === 'type') {
        const typeObj = filteredExceptionTypes.find((tp) => tp.value === value);
        if (!prev.title || filteredExceptionTypes.some((tp) => prev.title === t(tp.labelKey))) {
          updated.title = typeObj ? t(typeObj.labelKey) : '';
        }
      }
      if (field === 'isFullDay' && value) {
        updated.startTime = '';
        updated.endTime = '';
      }
      if (field === 'isFullDay' && !value) {
        updated.endDate = '';
      }
      // If date changes and endDate is before date, reset endDate
      if (field === 'date' && updated.endDate && updated.endDate < value) {
        updated.endDate = '';
      }
      // If date changes, reset times if they fall outside new working hours
      if (field === 'date') {
        const d = new Date(value + 'T00:00:00');
        const dayOfWeek = d.getDay();
        const dayConf = businessHours?.find(h => h.dayOfWeek === dayOfWeek);
        if (dayConf?.isOpen) {
          const opts = generateTimeOptions(dayConf.openTime, dayConf.closeTime);
          if (updated.startTime && !opts.includes(updated.startTime)) {
            updated.startTime = '';
          }
          if (updated.endTime && !opts.includes(updated.endTime)) {
            updated.endTime = '';
          }
        }
      }
      return updated;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.title.trim()) e.title = t('addException.titleRequired');
    if (!formData.date) {
      e.date = t('addException.dateRequired');
    } else if (formData.date < today) {
      e.date = t('addException.pastDate');
    }

    // Full-day: validate endDate if provided
    if (formData.isFullDay && formData.endDate && formData.endDate < formData.date) {
      e.endDate = t('addException.endDateError');
    }

    if (!formData.isFullDay) {
      if (!formData.startTime) e.startTime = t('addException.startRequired');
      if (!formData.endTime) e.endTime = t('addException.endRequired');

      if (formData.startTime && formData.endTime) {
        // Check times are not in the past (only for today)
        if (formData.date === today) {
          const nowTime = getNowTime();
          if (formData.startTime < nowTime) {
            e.startTime = t('addException.pastTime');
          }
          if (formData.endTime < nowTime) {
            e.endTime = t('addException.pastTime');
          }
        }

        // Check end > start
        if (formData.startTime >= formData.endTime) {
          e.endTime = t('addException.endAfterStart');
        } else {
          // Check minimum 5-minute gap
          const [sh, sm] = formData.startTime.split(':').map(Number);
          const [eh, em] = formData.endTime.split(':').map(Number);
          const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
          if (diffMinutes < 5) {
            e.endTime = t('addException.minDifference');
          }
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        type: formData.type,
        date: formData.date,
        endDate: formData.isFullDay && formData.endDate ? formData.endDate : null,
        isFullDay: formData.isFullDay,
        startTime: formData.isFullDay ? null : formData.startTime,
        endTime: formData.isFullDay ? null : formData.endTime,
        recurring: formData.recurring,
        recurringDay: formData.recurring ? formData.recurringDay : null,
        notes: formData.notes,
      };
      if (isEditMode) {
        payload.id = editException.id;
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field) =>
    `w-full px-3.5 py-2.5 bg-gray-50 border rounded-[5px] text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 ${
      errors[field] ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
    }`;

  const selectClass = (field) =>
    `w-full px-3.5 py-2.5 bg-gray-50 border rounded-[5px] text-sm text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 appearance-none cursor-pointer ${
      errors[field] ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
    }`;

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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full sm:max-w-lg bg-white rounded-t-[5px] sm:rounded-[5px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-[5px] ${isEditMode ? 'bg-amber-100' : 'bg-red-100'}`}>
                    {isEditMode ? <Pencil className="w-5 h-5 text-amber-600" /> : <Plus className="w-5 h-5 text-red-600" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {isEditMode ? (t('addException.editTitle') || 'Edit Schedule Exception') : t('addException.title')}
                    </h2>
                    <p className="text-xs text-gray-400">{t('addException.subtitle')}</p>
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

            {/* Form */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto flex-1">
              {/* Type selector */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t('addException.type')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {filteredExceptionTypes.map((tp) => (
                    <button
                      key={tp.value}
                      type="button"
                      onClick={() => handleChange('type', tp.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-[5px] border text-xs font-medium transition-all ${
                        formData.type === tp.value
                          ? 'border-amber-400 bg-amber-50 text-amber-800 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <tp.icon className="w-3.5 h-3.5" />
                      {t(tp.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  {t('addException.titleLabel')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('addException.titlePlaceholder')}
                  value={formData.title}
                  onChange={(e) => handleChange('title', sanitizeText(e.target.value))}
                  className={inputClass('title')}
                />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
              </div>

              {/* Date */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                  {formData.isFullDay ? t('addException.startDate') : t('addException.date')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  min={today}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className={inputClass('date')}
                />
                {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
              </div>

              {/* End Date (only for full day) */}
              {formData.isFullDay && (
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                    {t('addException.endDate')} <span className="text-xs text-gray-400 font-normal">{t('addException.endDateOptional')}</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.date || today}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    className={inputClass('endDate')}
                  />
                  {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate}</p>}
                </div>
              )}

              {/* Full day toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    formData.isFullDay ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                  onClick={() => handleChange('isFullDay', !formData.isFullDay)}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      formData.isFullDay ? 'start-5' : 'start-0.5'
                    }`}
                  />
                </div>
                <span className="text-sm text-gray-700 font-medium">{t('addException.fullDay')}</span>
              </label>

              {/* Time range (hidden if full day) */}
              {!formData.isFullDay && (
                <>
                  {/* Closed day warning */}
                  {isDayClosed && (
                    <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-[5px]">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-amber-700">{t('addException.closedDayWarning') || 'This day is marked as closed in your weekly hours. Exception times default to full day range.'}</p>
                    </div>
                  )}

                  {/* Working hours hint */}
                  {selectedDayHours && !isDayClosed && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-[5px]">
                      <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <p className="text-xs text-blue-600">
                        {t('addException.workingHoursHint') || 'Working hours:'} {selectedDayHours.openTime} – {selectedDayHours.closeTime}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {t('addException.start')} <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={formData.startTime}
                        onChange={(e) => handleChange('startTime', e.target.value)}
                        className={selectClass('startTime')}
                      >
                        <option value="">{t('addException.selectTime') || 'Select time'}</option>
                        {timeOptions.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      {errors.startTime && <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>}
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {t('addException.end')} <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={formData.endTime}
                        onChange={(e) => handleChange('endTime', e.target.value)}
                        className={selectClass('endTime')}
                      >
                        <option value="">{t('addException.selectTime') || 'Select time'}</option>
                        {timeOptions.filter(time => !formData.startTime || time > formData.startTime).map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                      {errors.endTime && <p className="mt-1 text-xs text-red-500">{errors.endTime}</p>}
                    </div>
                  </div>
                </>
              )}

              {/* Recurring toggle */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      formData.recurring ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                    onClick={() => handleChange('recurring', !formData.recurring)}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        formData.recurring ? 'start-5' : 'start-0.5'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700 font-medium">{t('addException.repeatWeekly')}</span>
                  </div>
                </label>

                {formData.recurring && (
                  <select
                    value={formData.recurringDay}
                    onChange={(e) => handleChange('recurringDay', parseInt(e.target.value))}
                    className={inputClass('recurringDay')}
                  >
                    {DAY_KEYS.map((key, i) => (
                      <option key={i} value={i}>{t(key)}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                  {t('addException.notes')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('addException.notesPlaceholder')}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', sanitizeText(e.target.value))}
                  className={`${inputClass('notes')} resize-none`}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-[5px] font-medium text-sm transition-colors order-2 sm:order-1"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 bg-[#364153] hover:bg-[#2a3444] disabled:opacity-50 text-white rounded-[5px] font-medium text-sm transition-colors shadow-sm order-1 sm:order-2"
              >
                {saving
                  ? t('addException.saving')
                  : isEditMode
                    ? (t('addException.saveChanges') || 'Save Changes')
                    : t('addException.addException')
                }
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
