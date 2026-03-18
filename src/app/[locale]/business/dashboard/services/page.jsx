'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Tag,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';

// ─── CURRENCY OPTIONS ────────────────────────────────────────
const CURRENCIES = ['MAD'];

// ─── SERVICE PRESETS BY PROFESSIONAL TYPE ───────────────────────
const SERVICE_PRESETS = {
  barber: [
    'Classic Haircut', 'Fade', 'Beard Trim', 'Shave',
    'Kids Haircut', 'Line Up', 'Hot Towel Shave', 'Buzz Cut',
    'Hair Wash', 'Beard Styling',
  ],
  hairdresser: [
    'Haircut', 'Blow Dry', 'Hair Color', 'Highlights',
    'Balayage', 'Keratin Treatment', 'Hair Wash', 'Toning',
    'Perm', 'Scalp Treatment',
  ],
  makeup: [
    'Natural Makeup', 'Bridal Makeup', 'Evening Makeup', 'Party Makeup',
    'Editorial Makeup', 'Airbrush Makeup', 'Eye Makeup', 'Contouring',
    'Lash Application', 'Brow Shaping',
  ],
  nails: [
    'Manicure', 'Pedicure', 'Gel Nails', 'Acrylic Nails',
    'Nail Art', 'French Manicure', 'Nail Removal', 'Nail Fill',
    'Builder Gel', 'Cuticle Care',
  ],
  massage: [
    'Swedish Massage', 'Deep Tissue', 'Hot Stone', 'Sports Massage',
    'Relaxation Massage', 'Back Massage', 'Neck & Shoulder', 'Full Body',
    'Aromatherapy', 'Reflexology',
  ],
  default: [
    'Classic Haircut', 'Fade', 'Beard Trim', 'Shave',
    'Hair Color', 'Styling', 'Kids Haircut',
  ],
};



// ─── SKELETON ────────────────────────────────────────────────
function ServicesSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded-xl" />
      </div>
      {/* Search bar */}
      <div className="h-10 w-full bg-gray-100 rounded-xl mb-4" />
      {/* Table header */}
      <div className="hidden sm:grid grid-cols-6 gap-4 px-4 py-3 bg-gray-50 rounded-xl">
        {[3, 1, 1, 1, 1, 1].map((w, i) => (
          <div key={i} className={`h-4 bg-gray-200 rounded col-span-${w}`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid sm:grid-cols-6 grid-cols-2 gap-4 px-4 py-4 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="sm:col-span-3 space-y-2">
            <div className="h-5 w-36 bg-gray-200 rounded" />
            <div className="h-3 w-52 bg-gray-100 rounded" />
          </div>
          <div className="h-4 w-12 bg-gray-100 rounded hidden sm:block" />
          <div className="h-4 w-14 bg-gray-100 rounded hidden sm:block" />
          <div className="h-4 w-16 bg-gray-100 rounded hidden sm:block" />
          <div className="h-4 w-12 bg-gray-100 rounded hidden sm:block" />
          <div className="flex gap-2 justify-end sm:justify-start">
            <div className="h-7 w-7 bg-gray-100 rounded-lg" />
            <div className="h-7 w-7 bg-gray-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────
function EmptyState({ onAdd }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-[#364153]/10 rounded-full flex items-center justify-center mb-4">
        <Tag className="w-10 h-10 text-[#364153]/40" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{t('services.noServices')}</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-xs">
        {t('services.noServicesDesc')}
      </p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#364153] text-white rounded-[5px] text-sm font-medium hover:bg-[#364153]/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {t('services.addFirst')}
      </button>
    </div>
  );
}

// ─── SERVICE MODAL (Add / Edit) ───────────────────────────────
function ServiceModal({ service, specialty, onClose, onSave }) {
  const { t } = useLanguage();
  const presets = SERVICE_PRESETS[specialty] || SERVICE_PRESETS.default;

  // Sanitize text: strip HTML tags and control characters
  const sanitizeText = (val) => {
    if (!val) return '';
    return val
      .replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  };

  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    duration_minutes: service?.duration_minutes ?? 30,
    price: service?.price ?? '',
    currency: service?.currency || 'MAD',
    is_active: service?.is_active !== undefined ? service.is_active : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!service?.id;

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError(t('services.nameRequired'));
    const dur = parseInt(form.duration_minutes);
    if (!form.duration_minutes || isNaN(dur) || dur < 1) {
      return setError(t('services.invalidDuration'));
    }
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0) {
      return setError(t('services.invalidPrice'));
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ ...form, id: service?.id, duration_minutes: parseInt(form.duration_minutes) });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Sheet / Modal */}
      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 80 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-[5px] shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-4 sm:pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#364153]">
            {isEdit ? t('services.editService') : t('services.newService')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-[5px] hover:bg-gray-100 transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto">

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Service Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('services.serviceName')} <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {presets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('name', form.name === p ? '' : p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    form.name === p
                      ? 'bg-[#364153] text-white border-[#364153]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#364153]/40'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', sanitizeText(e.target.value))}
              placeholder={t('services.serviceNamePlaceholder')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('services.description')}</label>
            <textarea
              value={form.description}
              onChange={e => set('description', sanitizeText(e.target.value))}
              placeholder={t('services.descriptionPlaceholder')}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] resize-none"
            />
          </div>

          {/* Duration + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('services.duration')}</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="5"
                  max="480"
                  step="5"
                  value={form.duration_minutes}
                  onChange={e => set('duration_minutes', e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('services.price')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153]"
                />
              </div>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('services.currency')}</label>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('currency', c)}
                  className={`px-3 py-1.5 rounded-[5px] text-xs font-semibold border transition-colors ${
                    form.currency === c
                      ? 'bg-[#364153] text-white border-[#364153]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#364153]/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-700">{t('services.activeToggle')}</p>
              <p className="text-xs text-gray-400">{t('services.activeDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={`transition-colors ${form.is_active ? 'text-[#364153]' : 'text-gray-300'}`}
            >
              {form.is_active
                ? <ToggleRight className="w-9 h-9" />
                : <ToggleLeft className="w-9 h-9" />
              }
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-[5px] px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-[5px] text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#364153] text-white rounded-[5px] text-sm font-medium hover:bg-[#364153]/90 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? t('common.saveChanges') : t('services.addService')}
            </button>
          </div>
        </form>
        </div>{/* end scroll area */}
      </motion.div>
    </div>
  );
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────
function DeleteConfirmModal({ service, onClose, onConfirm }) {
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm(service.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">{t('services.deleteService')}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          {t('services.deleteConfirm')} <span className="font-semibold text-gray-700">&quot;{service.name}&quot;</span>? {t('services.deleteWarning')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────
function Badge({ label, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-500',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────

// Safe JSON helper — never throws on HTML error pages
async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const text = await res.text();
  throw new Error(`Server error (${res.status})`);
}

export default function ServicesPage() {
  const { t, isRTL } = useLanguage();
  const { businessCategory } = useBusinessCategory();
  const [services, setServices] = useState([]);
  const [specialty, setSpecialty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deletingService, setDeletingService] = useState(null);

  // ── Fetch ──
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/business/services');
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to load services');
      setServices(data.services || []);
      if (data.specialty) setSpecialty(data.specialty);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // ── Save (create or update) ──
  const handleSave = async (form) => {
    const method = form.id ? 'PUT' : 'POST';
    const res = await fetch('/api/business/services', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Save failed');
    await fetchServices();
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    const res = await fetch(`/api/business/services?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    await fetchServices();
  };

  // ── Toggle active ──
  const handleToggleActive = async (service) => {
    await fetch('/api/business/services', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...service, is_active: !service.is_active }),
    });
    setServices(prev =>
      prev.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s)
    );
  };

  // ── Filtered list ──
  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchActive =
      filterActive === 'all' ||
      (filterActive === 'active' && s.is_active) ||
      (filterActive === 'inactive' && !s.is_active);
    return matchSearch && matchActive;
  });

  // ── Format duration ──
  const formatDuration = (mins) => {
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  // ── Stats ──
  const activeCount = services.filter(s => s.is_active).length;
  const prices = services.map(s => parseFloat(s.price || 0));
  const minPrice = prices.length ? Math.min(...prices).toFixed(2) : '0.00';
  const maxPrice = prices.length ? Math.max(...prices).toFixed(2) : '0.00';
  const currency = services[0]?.currency || 'MAD';

  return (
    <div className={`p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#364153] flex items-center gap-2">
            <Tag className="w-6 h-6" />
            {t('services.title')}
          </h1>
          <p className="text-sm text-gray-400 mt-1">{t('services.subtitle')}</p>
        </div>
        {(loading || services.length > 0) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#364153] text-white rounded-[5px] text-sm font-medium hover:bg-[#364153]/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t('services.addService')}
          </button>
        )}
      </div>

      {/* Stats */}
      {!loading && services.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-[5px] p-4">
            <p className="text-xs text-gray-400 mb-1">{t('common.total')}</p>
            <p className="text-2xl font-bold text-[#364153]">{services.length}</p>
            <p className="text-xs text-gray-400">{t('services.services')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-[5px] p-4">
            <p className="text-xs text-gray-400 mb-1">{t('common.active')}</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-gray-400">{t('common.visible')}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-[5px] p-4">
            <p className="text-xs text-gray-400 mb-1">{t('services.priceRange')}</p>
            <p className="text-lg font-bold text-[#364153] leading-tight">
              {minPrice}
              <span className="text-gray-300 font-normal mx-1">–</span>
              {maxPrice}
            </p>
            <p className="text-xs text-gray-400">{currency}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && services.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('services.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153]"
            />
          </div>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5 shrink-0">
            {['all', 'active', 'inactive'].map(f => (
              <button
                key={f}
                onClick={() => setFilterActive(f)}
                className={`px-4 py-1.5 text-xs font-medium capitalize rounded-lg transition-all ${
                  filterActive === f
                    ? 'bg-white text-[#364153] shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <ServicesSkeleton />
      ) : error ? (
        <div className="text-center py-16 text-red-500 text-sm">{error}</div>
      ) : services.length === 0 ? (
        <EmptyState onAdd={() => setShowAddModal(true)} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">{t('services.noMatch')}</div>
      ) : (
        <>
          {/* Table header — desktop */}
          <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 rounded-xl mb-2">
            <span className="col-span-5">{t('services.tableService')}</span>
            <span className="col-span-1 text-center">{t('services.tableDuration')}</span>
            <span className="col-span-2 text-right">{t('services.tablePrice')}</span>
            <span className="col-span-1 text-center">{t('services.tableStatus')}</span>
            <span className="col-span-2 text-right">{t('services.tableActions')}</span>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {filtered.map(service => (
              <div
                key={service.id}
                className={`bg-white border rounded-[5px] px-4 py-3.5 transition-colors ${
                  service.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
                }`}
              >
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-12 gap-3 items-center">
                  {/* Name + description */}
                  <div className="col-span-5 min-w-0">
                    <p className="font-semibold text-[#364153] text-sm truncate">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{service.description}</p>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="col-span-1 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDuration(service.duration_minutes)}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold text-[#364153]">
                      {parseFloat(service.price).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{service.currency}</span>
                  </div>

                  {/* Status toggle */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => handleToggleActive(service)}
                      className={`transition-colors ${service.is_active ? 'text-[#364153]' : 'text-gray-300'}`}
                      title={service.is_active ? t('services.deactivate') : t('services.activate')}
                    >
                      {service.is_active
                        ? <ToggleRight className="w-6 h-6" />
                        : <ToggleLeft className="w-6 h-6" />
                      }
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingService(service)}
                      className="p-1.5 rounded-lg hover:bg-[#364153]/10 text-[#364153]/60 hover:text-[#364153] transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingService(service)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile row */}
                <div className="sm:hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#364153] text-sm">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{service.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDuration(service.duration_minutes)}
                        </span>
                        <Badge
                          label={service.is_active ? t('common.active') : t('common.inactive')}
                          color={service.is_active ? 'green' : 'red'}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-[#364153]">
                        {parseFloat(service.price).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">{service.currency}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => handleToggleActive(service)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-1 justify-center ${
                        service.is_active
                          ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          : 'border-green-200 text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {service.is_active ? t('services.deactivate') : t('services.activate')}
                    </button>
                    <button
                      onClick={() => setEditingService(service)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#364153]/20 text-[#364153] hover:bg-[#364153]/5 transition-colors flex-1 justify-center"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => setDeletingService(service)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-100 text-red-500 hover:bg-red-50 transition-colors flex-1 justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <ServiceModal
          specialty={specialty}
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Edit Modal */}
      {editingService && (
        <ServiceModal
          service={editingService}
          specialty={specialty}
          onClose={() => setEditingService(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm Modal */}
      {deletingService && (
        <DeleteConfirmModal
          service={deletingService}
          onClose={() => setDeletingService(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
