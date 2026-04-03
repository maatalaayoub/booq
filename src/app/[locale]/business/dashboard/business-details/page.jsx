'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  Phone,
  Briefcase,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Navigation,
  Map,
  Store,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-gray-100 rounded-[5px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
});

// ─── PROFESSIONAL TYPES ─────────────────────────────────────────
const PROFESSIONAL_TYPES = ['barber', 'hairdresser', 'makeup', 'nails', 'massage'];

// ─── MOROCCAN CITIES ─────────────────────────────────────────
const MOROCCAN_CITIES = [
  '', 'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès',
  'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Temara', 'Safi', 'Mohammedia',
  'El Jadida', 'Béni Mellal', 'Nador', 'Taza', 'Settat', 'Berrechid',
  'Khémisset', 'Inezgane', 'Khouribga', 'Larache', 'Guelmim', 'Berkane',
  'Taourirt', 'Errachidia', 'Sidi Kacem', 'Sidi Slimane',
];

// ─── SKELETON ────────────────────────────────────────────────
function DetailsSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="bg-gradient-to-r from-[#364153] to-[#4a5568] rounded-[5px] p-6 mb-6">
        <div className="h-7 w-48 bg-white/20 rounded mb-2" />
        <div className="h-4 w-64 bg-white/10 rounded" />
      </div>
      {/* Cards skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[5px] border border-gray-200 p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-10 w-full bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-[5px] border border-gray-200 p-6">
          <div className="h-[300px] bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── SANITIZATION HELPERS ────────────────────────────────────
function sanitizeText(value) {
  if (!value) return '';
  return value
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip control chars
}

function sanitizePhone(value) {
  if (!value) return '';
  return value.replace(/[^0-9+\-\s()]/g, ''); // keep digits, +, -, spaces, parens
}

// ─── FORM INPUT ─────────────────────────────────────────────
function FormInput({ label, icon: Icon, value, onChange, placeholder, type = 'text', disabled = false }) {
  const isPhone = type === 'tel';
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(isPhone ? sanitizePhone(raw) : sanitizeText(raw));
        }}
        placeholder={placeholder}
        disabled={disabled}
        {...(isPhone ? { inputMode: 'tel', pattern: '[0-9+\\-\\s()]*' } : {})}
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] disabled:bg-gray-50 disabled:text-gray-500 transition-all"
      />
    </div>
  );
}

// ─── FORM SELECT ─────────────────────────────────────────────
function FormSelect({ label, icon: Icon, value, onChange, options, disabled = false }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] disabled:bg-gray-50 disabled:text-gray-500 bg-white transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────
function SectionCard({ title, icon: Icon, iconColor = 'text-[#364153]', iconBg = 'bg-[#364153]/10', children }) {
  return (
    <div className="bg-white rounded-[5px] border border-gray-300 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-8 h-8 ${iconBg} rounded-[5px] flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────
export default function BusinessDetailsPage() {
  const { user, isLoaded } = useAuthUser();
  const { t, isRTL } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState(null);
  const savedFormRef = useRef(null);
  const [businessCategory, setBusinessCategory] = useState(null);
  const [specialtyName, setSpecialtyName] = useState('');
  const [serviceCategoryName, setServiceCategoryName] = useState('');
  const [form, setForm] = useState({
    businessName: '',
    address: '',
    city: '',
    phone: '',
    professionalType: 'barber',
    workLocation: 'my_place',
    serviceArea: '',
    travelRadiusKm: '',
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    if (!isLoaded || !user) return;

    fetch('/api/business/details')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setBusinessCategory(data.businessCategory);
          setSpecialtyName(data.specialtyName || '');
          setServiceCategoryName(data.serviceCategoryName || '');
          const formData = {
            businessName: data.businessName || '',
            address: data.address || '',
            city: data.city || '',
            phone: data.phone || '',
            professionalType: data.professionalType || 'barber',
            workLocation: data.workLocation || 'my_place',
            serviceArea: data.serviceArea || '',
            travelRadiusKm: data.travelRadiusKm || '',
            latitude: data.latitude || null,
            longitude: data.longitude || null,
          };
          setForm(formData);
          savedFormRef.current = JSON.parse(JSON.stringify(formData));
        }
      })
      .catch((err) => console.error('Error fetching business details:', err))
      .finally(() => setLoading(false));
  }, [isLoaded, user]);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaveStatus(null);
  }, []);

  const handleLocationSelect = useCallback((lat, lng) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
    setSaveStatus(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    const sanitizedForm = {
      ...form,
      businessName: sanitizeText(form.businessName),
      address: sanitizeText(form.address),
      phone: sanitizePhone(form.phone),
      serviceArea: sanitizeText(form.serviceArea),
    };

    try {
      const res = await fetch('/api/business/details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedForm),
      });

      if (res.ok) {
        savedFormRef.current = JSON.parse(JSON.stringify(form));
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Error saving business details:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // ── Track changes ──
  const changeCount = useMemo(() => {
    if (!savedFormRef.current) return 0;
    let count = 0;
    const keys = Object.keys(form);
    for (const key of keys) {
      const curr = form[key] ?? '';
      const orig = savedFormRef.current[key] ?? '';
      if (String(curr) !== String(orig)) count++;
    }
    return count;
  }, [form, saveStatus]);

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
    savedFormRef.current = JSON.parse(JSON.stringify(form));
    if (url) router.push(url);
  };

  const handleSaveAndNavigate = async () => {
    await handleSave();
    const url = pendingNavUrl;
    setShowUnsavedDialog(false);
    setPendingNavUrl(null);
    if (url) router.push(url);
  };

  const professionalTypeOptions = PROFESSIONAL_TYPES.map((type) => ({
    value: type,
    label: t(`businessDetails.professionalType.${type}`) || type.charAt(0).toUpperCase() + type.slice(1),
  }));

  const cityOptions = MOROCCAN_CITIES.map((c) => ({
    value: c,
    label: c || (t('businessDetails.selectCity') || 'Select a city'),
  }));

  if (!isLoaded || loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <DetailsSkeleton />
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#364153] to-[#4a5568] rounded-[5px] p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full" />
          <div className="absolute -right-5 -bottom-5 w-24 h-24 bg-white rounded-full" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-[5px] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {t('businessDetails.title') || 'Business Details'}
            </h1>
          </div>
          <p className="text-sm text-white/70 ml-13">
            {t('businessDetails.subtitle') || 'View and update your business information'}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <SectionCard 
            title={t('businessDetails.basicInfo') || 'Basic Information'} 
            icon={Briefcase}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          >
            <div className="space-y-4">
              <FormInput
                label={t('businessDetails.businessName') || 'Business Name'}
                icon={Building2}
                value={form.businessName}
                onChange={(v) => set('businessName', v)}
                placeholder={t('businessDetails.businessNamePlaceholder') || 'e.g. Ayoub Barbershop'}
              />
              <FormInput
                label={t('businessDetails.serviceCategory') || 'Service Category'}
                icon={Store}
                value={serviceCategoryName}
                onChange={() => {}}
                disabled
              />
              <FormSelect
                label={t('businessDetails.professionalType') || 'Professional Type'}
                icon={Briefcase}
                value={form.professionalType}
                onChange={() => {}}
                options={professionalTypeOptions}
                disabled
              />
              <FormInput
                label={t('businessDetails.specialty') || 'Specialty'}
                icon={Sparkles}
                value={specialtyName}
                onChange={() => {}}
                disabled
              />
              <FormSelect
                label={t('businessDetails.businessType') || 'Business Type'}
                icon={Store}
                value={businessCategory || ''}
                onChange={() => {}}
                options={[
                  { value: 'salon_owner', label: t('businessDetails.category.salon_owner') || 'Salon / Shop Owner' },
                  { value: 'mobile_service', label: t('businessDetails.category.mobile_service') || 'Mobile Service' },
                  { value: 'job_seeker', label: t('businessDetails.category.job_seeker') || 'Job Seeker' },
                ]}
                disabled
              />
              <FormInput
                label={t('businessDetails.phone') || 'Phone Number'}
                icon={Phone}
                value={form.phone}
                onChange={(v) => set('phone', v)}
                placeholder={t('businessDetails.phonePlaceholder') || '+212 6XX-XXXXXX'}
                type="tel"
              />
              <FormSelect
                label={t('businessDetails.city') || 'City'}
                icon={MapPin}
                value={form.city}
                onChange={(v) => set('city', v)}
                options={cityOptions}
              />
              <FormInput
                label={t('businessDetails.address') || 'Address'}
                icon={Navigation}
                value={form.address}
                onChange={(v) => set('address', v)}
                placeholder={t('businessDetails.addressPlaceholder') || 'Full street address'}
              />
            </div>
          </SectionCard>

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SectionCard 
            title={t('businessDetails.mapLocation') || 'Pin Your Location'} 
            icon={Map}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          >
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                {t('businessDetails.mapHint') || 'Click on the map to set your exact business location'}
              </p>
              <div className="rounded-[5px] overflow-hidden border border-gray-200">
                <LocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onLocationSelect={handleLocationSelect}
                  className="h-[280px]"
                />
              </div>
              {form.latitude && form.longitude && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-[5px]">
                  <MapPin className="w-3.5 h-3.5 text-green-500" />
                  <span>
                    {t('businessDetails.coordinates') || 'Coordinates'}: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                  </span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="mt-6 bg-white rounded-[5px] border border-gray-300 p-4 flex items-center justify-between sticky bottom-4">
        <div className="flex items-center gap-2 text-sm">
          {saveStatus === 'success' && (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-600">{t('businessDetails.saveSuccess') || 'Saved successfully'}</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-600">{t('businessDetails.saveError') || 'Error saving changes'}</span>
            </>
          )}
          {!saveStatus && (
            <span className="text-gray-400 text-xs hidden sm:block">
              {t('businessDetails.unsavedHint') || 'Changes will be saved when you click the button'}
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="relative flex items-center gap-2 px-6 py-2.5 bg-[#364153] text-white rounded-[5px] text-sm font-medium hover:bg-[#364153]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? (t('businessDetails.saving') || 'Saving...') : (t('businessDetails.save') || 'Save Changes')}
          {hasChanges && !saving && (
            <span className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center px-1 text-[11px] font-bold bg-red-500 text-white rounded-full">
              {changeCount}
            </span>
          )}
        </button>
      </div>

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
