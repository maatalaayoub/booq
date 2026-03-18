'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  X,
  Clock,
  User,
  Sparkles,
  Phone,
  CalendarDays,
  MessageSquare,
  DollarSign,
  Plus,
  ChevronDown,
  Check,
  Timer,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
} from 'lucide-react';

const sanitizeText = (val) => {
  if (typeof val !== 'string') return val;
  return val.replace(/<[^>]*>/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

function parseDateAndTime(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: '09:00',
    };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // dateStr might be just a date like "2026-02-27" without time
    return {
      date: dateStr.split('T')[0],
      time: '09:00',
    };
  }
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  // If time is midnight (00:00), it's likely just a date click — use default 09:00
  const time = (hours === '00' && minutes === '00') ? '09:00' : `${hours}:${minutes}`;
  return {
    date: d.toISOString().split('T')[0],
    time,
  };
}

function computeEndTime(startTime, durationMinutes) {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export default function NewAppointmentModal({ isOpen, onClose, onSave, defaultDate, defaultEndDate, isSaving, businessCategory }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    client: '',
    phone: '',
    clientAddress: '',
    service: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    endTime: '09:30',
    notes: '',
    price: '',
    status: 'pending',
  });

  const [errors, setErrors] = useState({});
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const serviceDropdownRef = useRef(null);

  // Fetched services from API
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);



  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target)) {
        setServiceDropdownOpen(false);
      }
    }
    if (serviceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [serviceDropdownOpen]);

  // Fetch services and schedule when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setServicesLoading(true);
    fetch('/api/business/services')
      .then(async r => {
        const ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return { services: [] };
        return r.json();
      })
      .then(data => setServices((data.services || []).filter(s => s.is_active)))
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false));

  }, [isOpen]);

  // Reset form and populate date/time whenever the modal opens or defaultDate changes
  const defaultEndDateStr = defaultEndDate || '';
  const defaultDateStr = defaultDate || '';
  useEffect(() => {
    if (isOpen) {
      const { date, time } = parseDateAndTime(defaultDateStr);
      let endTime;
      if (defaultEndDateStr) {
        // Use the drag-selected end time
        const parsed = parseDateAndTime(defaultEndDateStr);
        endTime = parsed.time;
      } else {
        endTime = computeEndTime(time, 30);
      }
      setFormData({
        client: '',
        phone: '',
        clientAddress: '',
        service: '',
        date,
        time,
        endTime,
        notes: '',
        price: '',
        status: 'pending',
      });
      setErrors({});
    }
  }, [isOpen, defaultDateStr, defaultEndDateStr]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-fill price and recalculate end time when service is selected
      if (field === 'service') {
        const svc = services.find((s) => s.name === value);
        if (svc) {
          updated.price = String(svc.price);
          updated.endTime = computeEndTime(prev.time, svc.duration_minutes);
        }
      }
      // Recalculate end time when start time changes
      if (field === 'time') {
        const svc = services.find((s) => s.name === prev.service);
        const duration = svc ? svc.duration_minutes : 30;
        updated.endTime = computeEndTime(value, duration);
      }

      return updated;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.client.trim()) newErrors.client = t('newAppointment.clientRequired');
    if (!formData.service) newErrors.service = t('newAppointment.serviceRequired');
    if (!formData.date) newErrors.date = t('newAppointment.dateRequired');
    if (!formData.time) newErrors.time = t('newAppointment.timeRequired');
    if (businessCategory === 'mobile_service' && !formData.clientAddress.trim()) newErrors.clientAddress = t('newAppointment.clientAddressRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const svc = services.find((s) => s.name === formData.service);
    const durationMinutes = svc ? svc.duration_minutes : 30;

    const start = new Date(`${formData.date}T${formData.time}:00`);
    const end = formData.endTime
      ? new Date(`${formData.date}T${formData.endTime}:00`)
      : new Date(start.getTime() + durationMinutes * 60000);

    const statusColors = {
      confirmed: { bg: '#D4AF37', border: '#B8960C' },
      pending: { bg: '#F59E0B', border: '#D97706' },
    };
    const colors = statusColors[formData.status] || statusColors.pending;

    onSave({
      title: `${formData.service} — ${formData.client}`,
      start: start.toISOString(),
      end: end.toISOString(),
      backgroundColor: colors.bg,
      borderColor: colors.border,
      extendedProps: {
        client: formData.client,
        phone: formData.phone,
        clientAddress: formData.clientAddress,
        service: formData.service,
        notes: formData.notes,
        price: formData.price || (svc ? String(svc.price) : ''),
        currency: svc ? (svc.currency || 'MAD') : 'MAD',
        status: formData.status,
      },
    });
  };

  const inputClass = (field) =>
    `w-full px-3.5 py-2.5 bg-gray-50 border rounded-[5px] text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 ${
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full sm:max-w-lg bg-white rounded-t-[5px] sm:rounded-[5px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle on mobile */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-[5px]">
                    <Plus className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{t('newAppointment.title')}</h2>
                    <p className="text-xs text-gray-400">{t('newAppointment.subtitle')}</p>
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
              {/* Client Name */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {t('newAppointment.clientName')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('newAppointment.clientPlaceholder')}
                  value={formData.client}
                  onChange={(e) => handleChange('client', sanitizeText(e.target.value))}
                  className={inputClass('client')}
                />
                {errors.client && <p className="mt-1 text-xs text-red-500">{errors.client}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {t('newAppointment.phone')}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder={t('newAppointment.phonePlaceholder')}
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+\s\-()]/g, '');
                    handleChange('phone', val);
                  }}
                  className={inputClass('phone')}
                />
              </div>

              {/* Client Address (mobile service only) */}
              {businessCategory === 'mobile_service' && (
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {t('newAppointment.clientAddress')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t('newAppointment.clientAddressPlaceholder')}
                    value={formData.clientAddress}
                    onChange={(e) => handleChange('clientAddress', sanitizeText(e.target.value))}
                    className={inputClass('clientAddress')}
                  />
                  {errors.clientAddress && <p className="mt-1 text-xs text-red-500">{errors.clientAddress}</p>}
                </div>
              )}

              {/* Service */}
              <div ref={serviceDropdownRef} className="relative">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                  {t('newAppointment.service')} <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setServiceDropdownOpen((v) => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[5px] border text-sm transition-all text-left ${
                    errors.service
                      ? 'border-red-300 ring-2 ring-red-100'
                      : serviceDropdownOpen
                        ? 'border-amber-400 ring-2 ring-amber-100'
                        : 'border-gray-200 hover:border-gray-300'
                  } bg-white`}
                >
                  {formData.service ? (
                    <span className="text-gray-900 font-medium">{formData.service}</span>
                  ) : (
                    <span className="text-gray-400">{t('newAppointment.selectService')}</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${serviceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {serviceDropdownOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-[5px] shadow-lg overflow-hidden max-h-60 overflow-y-auto"
                    >
                      {servicesLoading ? (
                        <li className="flex items-center justify-center gap-2 px-3 py-5 text-sm text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('newAppointment.loadingServices')}
                        </li>
                      ) : services.length === 0 ? (
                        <li className="flex flex-col items-center justify-center gap-1 px-3 py-5 text-center">
                          <Sparkles className="w-5 h-5 text-gray-300" />
                          <p className="text-sm text-gray-400">{t('newAppointment.noServices')}</p>
                          <p className="text-xs text-gray-300">{t('newAppointment.noServicesHint')}</p>
                        </li>
                      ) : (
                        services.map((s) => {
                          const isSelected = formData.service === s.name;
                          return (
                            <li
                              key={s.id}
                              onClick={() => {
                                handleChange('service', s.name);
                                setServiceDropdownOpen(false);
                              }}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className={`flex items-center justify-center w-8 h-8 rounded-[5px] flex-shrink-0 ${
                                isSelected ? 'bg-amber-100' : 'bg-gray-100'
                              }`}>
                                <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-600' : 'text-gray-400'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-amber-700' : 'text-gray-900'}`}>
                                  {s.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                  <span className="flex items-center gap-0.5">
                                    <Timer className="w-3 h-3" />
                                    {s.duration_minutes}min
                                  </span>
                                  <span>•</span>
                                  <span className="font-medium text-gray-500">
                                    {parseFloat(s.price).toFixed(2)} {s.currency || 'MAD'}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              )}
                            </li>
                          );
                        })
                      )}
                    </motion.ul>
                  )}
                </AnimatePresence>
                {errors.service && <p className="mt-1 text-xs text-red-500">{errors.service}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                  {t('newAppointment.status')}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('status', 'pending')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[5px] border text-sm font-medium transition-all ${
                      formData.status === 'pending'
                        ? 'bg-orange-50 border-orange-300 text-orange-700 ring-2 ring-orange-100'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t('newAppointment.pending')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('status', 'confirmed')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-[5px] border text-sm font-medium transition-all ${
                      formData.status === 'confirmed'
                        ? 'bg-amber-50 border-amber-300 text-amber-700 ring-2 ring-amber-100'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('newAppointment.confirmed')}
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                  {t('newAppointment.date')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className={inputClass('date')}
                />
                {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
              </div>

              {/* Start Time & End Time row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {t('newAppointment.startTime')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleChange('time', e.target.value)}
                    className={inputClass('time')}
                  />
                  {errors.time && <p className="mt-1 text-xs text-red-500">{errors.time}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {t('newAppointment.endTime')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    className={inputClass('endTime')}
                  />
                  {errors.endTime && <p className="mt-1 text-xs text-red-500">{errors.endTime}</p>}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                  {t('newAppointment.price')}
                </label>
                <input
                  type="number"
                  placeholder={t('newAppointment.pricePlaceholder')}
                  value={formData.price}
                  onChange={(e) => handleChange('price', e.target.value)}
                  className={inputClass('price')}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                  {t('newAppointment.notes')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('newAppointment.notesPlaceholder')}
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
                disabled={isSaving}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2.5 bg-[#364153] hover:bg-[#2a3444] text-white rounded-[5px] font-medium text-sm transition-colors shadow-sm order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('newAppointment.saving') : t('newAppointment.addAppointment')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
