'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Navigation,
  Building2,
  DollarSign,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Map,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ServiceAreaMap = dynamic(() => import('@/components/ServiceAreaMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[350px] bg-gray-100 rounded-[5px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  ),
});

const RADIUS_OPTIONS = [5, 10, 15, 20, 30, 50, 75, 100];

const MOROCCAN_CITIES = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès',
  'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Temara', 'Safi', 'Mohammedia',
  'El Jadida', 'Béni Mellal', 'Nador', 'Taza', 'Settat', 'Berrechid',
  'Khémisset', 'Inezgane', 'Khouribga', 'Larache', 'Guelmim', 'Berkane',
  'Taourirt', 'Errachidia', 'Sidi Kacem', 'Sidi Slimane',
];

function DetailsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gradient-to-r from-[#364153] to-[#4a5568] rounded-[5px] p-6 mb-6">
        <div className="h-7 w-48 bg-white/20 rounded mb-2" />
        <div className="h-4 w-64 bg-white/10 rounded" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-[5px] border border-gray-200 p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-10 w-full bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ServiceAreaPage() {
  const { isLoaded, user } = useAuthUser();
  const { t, isRTL } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [cityInput, setCityInput] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [form, setForm] = useState({
    baseLocation: '',
    city: '',
    serviceRadius: 5,
    citiesCovered: [],
    travelFee: 0,
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    if (!isLoaded || !user) return;

    fetch('/api/business/service-area')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setForm({
            baseLocation: data.baseLocation || '',
            city: data.city || '',
            serviceRadius: data.serviceRadius || 5,
            citiesCovered: data.citiesCovered || [],
            travelFee: data.travelFee || 0,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
          });
        }
      })
      .catch((err) => console.error('Error fetching service area:', err))
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

  const addCity = useCallback((city) => {
    setForm((f) => {
      if (f.citiesCovered.includes(city)) return f;
      return { ...f, citiesCovered: [...f.citiesCovered, city] };
    });
    setCityInput('');
    setShowCityDropdown(false);
    setSaveStatus(null);
  }, []);

  const removeCity = useCallback((city) => {
    setForm((f) => ({
      ...f,
      citiesCovered: f.citiesCovered.filter((c) => c !== city),
    }));
    setSaveStatus(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch('/api/business/service-area', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseLocation: form.baseLocation,
          city: form.city,
          serviceRadius: form.serviceRadius,
          citiesCovered: form.citiesCovered,
          travelFee: form.travelFee,
          latitude: form.latitude,
          longitude: form.longitude,
        }),
      });

      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Error saving service area:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const filteredCities = MOROCCAN_CITIES.filter(
    (c) =>
      c.toLowerCase().includes(cityInput.toLowerCase()) &&
      !form.citiesCovered.includes(c)
  );

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
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">
              {t('serviceArea.title') || 'Service Area'}
            </h1>
          </div>
          <p className="text-white/70 text-sm">
            {t('serviceArea.subtitle') || 'Define where you deliver your services'}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Base Location & Radius */}
        <div className="space-y-6">
          {/* Base Location Card */}
          <div className="bg-white rounded-[5px] border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#364153]" />
              {t('serviceArea.baseLocation') || 'Base Location'}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {t('serviceArea.baseLocationHint') || 'The main location where you start from'}
            </p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">
                  {t('serviceArea.address') || 'Address'}
                </label>
                <input
                  type="text"
                  value={form.baseLocation}
                  onChange={(e) => set('baseLocation', e.target.value)}
                  placeholder={t('serviceArea.addressPlaceholder') || 'e.g. 123 Main St, Casablanca'}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">
                  {t('serviceArea.city') || 'City'}
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder={t('serviceArea.cityPlaceholder') || 'e.g. Casablanca'}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] transition-all"
                />
              </div>

              {/* Map */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Map className="w-3.5 h-3.5 text-gray-400" />
                  {t('serviceArea.pinLocation') || 'Pin Your Location'}
                </label>
                <p className="text-xs text-gray-400">
                  {t('serviceArea.mapHint') || 'Click on the map to set your starting point. The circle shows your service radius.'}
                </p>
                <ServiceAreaMap
                  latitude={form.latitude}
                  longitude={form.longitude}
                  radiusKm={form.serviceRadius || 5}
                  onLocationSelect={handleLocationSelect}
                  className="h-[350px]"
                />
                {form.latitude && form.longitude && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-[5px]">
                    <MapPin className="w-3.5 h-3.5 text-green-500" />
                    <span>
                      {t('serviceArea.coordinates') || 'Coordinates'}: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service Radius Card */}
          <div className="bg-white rounded-[5px] border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#364153]" />
              {t('serviceArea.serviceRadius') || 'Service Radius'}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {t('serviceArea.serviceRadiusHint') || 'Maximum distance you are willing to travel'}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {RADIUS_OPTIONS.map((km) => (
                <button
                  key={km}
                  onClick={() => set('serviceRadius', km)}
                  className={`py-2.5 px-3 rounded-[5px] text-sm font-medium transition-all border ${
                    form.serviceRadius === km
                      ? 'bg-[#364153] text-white border-[#364153]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#364153]/30 hover:bg-gray-50'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {t('serviceArea.radiusSelected') || 'You will serve clients within'}{' '}
              <span className="font-semibold text-[#364153]">{form.serviceRadius || 5} km</span>{' '}
              {t('serviceArea.radiusFromBase') || 'from your base location'}
            </p>
          </div>
        </div>

        {/* Right Column - Cities & Travel Fee */}
        <div className="space-y-6">
          {/* Cities Covered Card */}
          <div className="bg-white rounded-[5px] border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#364153]" />
              {t('serviceArea.citiesCovered') || 'Cities Covered'}
              <span className="text-xs font-normal text-gray-400 ml-1">
                ({t('serviceArea.optional') || 'Optional'})
              </span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {t('serviceArea.citiesCoveredHint') || 'Select cities where you offer services'}
            </p>

            {/* City Input */}
            <div className="relative mb-3">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => {
                  setCityInput(e.target.value);
                  setShowCityDropdown(true);
                }}
                onFocus={() => setShowCityDropdown(true)}
                placeholder={t('serviceArea.searchCity') || 'Search for a city...'}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] transition-all"
              />
              {showCityDropdown && cityInput && filteredCities.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-[5px] shadow-lg max-h-48 overflow-y-auto">
                  {filteredCities.slice(0, 8).map((city) => (
                    <button
                      key={city}
                      onClick={() => addCity(city)}
                      className="w-full text-left px-3.5 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Add custom city */}
            {cityInput && !MOROCCAN_CITIES.some((c) => c.toLowerCase() === cityInput.toLowerCase()) && (
              <button
                onClick={() => addCity(cityInput.trim())}
                className="flex items-center gap-1.5 text-xs text-[#364153] hover:underline mb-3"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('serviceArea.addCustomCity') || 'Add'} &quot;{cityInput}&quot;
              </button>
            )}

            {/* Selected Cities */}
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {form.citiesCovered.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">
                  {t('serviceArea.noCitiesSelected') || 'No cities selected yet'}
                </p>
              ) : (
                form.citiesCovered.map((city) => (
                  <span
                    key={city}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#364153]/5 border border-[#364153]/10 rounded-full text-sm text-[#364153]"
                  >
                    <MapPin className="w-3 h-3" />
                    {city}
                    <button
                      onClick={() => removeCity(city)}
                      className="hover:bg-[#364153]/10 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Travel Fee Card */}
          <div className="bg-white rounded-[5px] border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#364153]" />
              {t('serviceArea.travelFee') || 'Travel Fee'}
              <span className="text-xs font-normal text-gray-400 ml-1">
                ({t('serviceArea.optional') || 'Optional'})
              </span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {t('serviceArea.travelFeeHint') || 'Additional cost for traveling to the client'}
            </p>
            <div className="space-y-1.5">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  MAD
                </span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={form.travelFee || ''}
                  onChange={(e) => set('travelFee', e.target.value ? Number(e.target.value) : 0)}
                  placeholder="0"
                  className="w-full pl-14 pr-3.5 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] transition-all"
                />
              </div>
              <p className="text-xs text-gray-400">
                {t('serviceArea.travelFeeNote') || 'This fee will be added to the service price for mobile visits'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 mt-6">
        {saveStatus === 'success' && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            {t('serviceArea.saved') || 'Changes saved successfully'}
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />
            {t('serviceArea.saveError') || 'Failed to save changes'}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#364153] hover:bg-[#2a3444] disabled:opacity-50 text-white rounded-[5px] font-medium text-sm transition-colors shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving
            ? (t('serviceArea.saving') || 'Saving...')
            : (t('serviceArea.save') || 'Save Changes')}
        </button>
      </div>
    </div>
  );
}
