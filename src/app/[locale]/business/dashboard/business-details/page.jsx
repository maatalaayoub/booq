'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import {
  Building2,
  MapPin,
  Phone,
  Briefcase,
  Clock,
  Car,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Navigation,
  Map,
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

// ─── WORK LOCATION OPTIONS ─────────────────────────────────────────
const WORK_LOCATIONS = ['my_place', 'client_location', 'both'];

// ─── PROFESSIONAL TYPES ─────────────────────────────────────────
const PROFESSIONAL_TYPES = ['barber', 'hairdresser', 'makeup', 'nails', 'massage'];

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

// ─── FORM INPUT ─────────────────────────────────────────────
function FormInput({ label, icon: Icon, value, onChange, placeholder, type = 'text', disabled = false }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
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
    <div className="bg-white rounded-[5px] border border-gray-200 shadow-sm overflow-hidden">
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
  const { user, isLoaded } = useUser();
  const { t, isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [businessCategory, setBusinessCategory] = useState(null);
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
          setForm({
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
          });
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

    try {
      const res = await fetch('/api/business/details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
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

  const workLocationOptions = WORK_LOCATIONS.map((loc) => ({
    value: loc,
    label: t(`businessDetails.workLocation.${loc}`) || loc.replace(/_/g, ' '),
  }));

  const professionalTypeOptions = PROFESSIONAL_TYPES.map((type) => ({
    value: type,
    label: t(`businessDetails.professionalType.${type}`) || type.charAt(0).toUpperCase() + type.slice(1),
  }));

  if (!isLoaded || loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <DetailsSkeleton />
      </div>
    );
  }

  const isMobileService = businessCategory === 'mobile_service';

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
              <FormSelect
                label={t('businessDetails.professionalType') || 'Professional Type'}
                icon={Briefcase}
                value={form.professionalType}
                onChange={(v) => set('professionalType', v)}
                options={professionalTypeOptions}
              />
              <FormInput
                label={t('businessDetails.phone') || 'Phone Number'}
                icon={Phone}
                value={form.phone}
                onChange={(v) => set('phone', v)}
                placeholder={t('businessDetails.phonePlaceholder') || '+212 6XX-XXXXXX'}
                type="tel"
              />
            </div>
          </SectionCard>

          <SectionCard 
            title={t('businessDetails.workSettings') || 'Work Settings'} 
            icon={Clock}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          >
            <div className="space-y-4">
              <FormSelect
                label={t('businessDetails.workLocationLabel') || 'Work Location'}
                icon={MapPin}
                value={form.workLocation}
                onChange={(v) => set('workLocation', v)}
                options={workLocationOptions}
              />
              {isMobileService && (
                <>
                  <FormInput
                    label={t('businessDetails.serviceArea') || 'Service Area'}
                    icon={Car}
                    value={form.serviceArea}
                    onChange={(v) => set('serviceArea', v)}
                    placeholder={t('businessDetails.serviceAreaPlaceholder') || 'e.g. Casablanca & surroundings'}
                  />
                  <FormInput
                    label={t('businessDetails.travelRadius') || 'Travel Radius (km)'}
                    icon={Car}
                    value={form.travelRadiusKm}
                    onChange={(v) => set('travelRadiusKm', v)}
                    placeholder={t('businessDetails.travelRadiusPlaceholder') || 'e.g. 20'}
                    type="number"
                  />
                </>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SectionCard 
            title={t('businessDetails.contactLocation') || 'Location Details'} 
            icon={MapPin}
            iconColor="text-rose-600"
            iconBg="bg-rose-50"
          >
            <div className="space-y-4">
              <FormInput
                label={t('businessDetails.city') || 'City'}
                icon={MapPin}
                value={form.city}
                onChange={(v) => set('city', v)}
                placeholder={t('businessDetails.cityPlaceholder') || 'e.g. Casablanca'}
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
      <div className="mt-6 bg-white rounded-[5px] border border-gray-200 shadow-sm p-4 flex items-center justify-between sticky bottom-4">
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
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#364153] text-white rounded-[5px] text-sm font-medium hover:bg-[#364153]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? (t('businessDetails.saving') || 'Saving...') : (t('businessDetails.save') || 'Save Changes')}
        </button>
      </div>
    </div>
  );
}
