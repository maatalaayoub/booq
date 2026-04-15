'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useParams, useRouter } from 'next/navigation';
import {
  Globe,
  Eye,
  EyeOff,
  Tag,
  CalendarCheck,
  Image,
  MapPin,
  Star,
  Check,
  ChevronRight,
  Loader2,
  Save,
  Palette,
  ToggleLeft,
  ToggleRight,
  Clock,
  DollarSign,
  Info,
  Camera,
  RotateCw,
  Upload,
  Trash2,
  Plus,
  Briefcase,
  X,
  Phone,
  MessageCircle,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';

// ─── SECTION TOGGLE ROW ──────────────────────────────────────
function SectionToggle({ icon: Icon, label, description, value, onChange, accent = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'text-blue-600' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  ring: 'text-amber-600' },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  ring: 'text-green-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'text-purple-600' },
    rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   ring: 'text-rose-600' },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   ring: 'text-teal-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'text-orange-600' },
  };
  const c = colors[accent] || colors.blue;

  return (
    <div className="flex items-center justify-between py-3.5 px-4 rounded-[5px] border border-gray-100 hover:border-gray-200 transition-colors bg-white">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-[5px] ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4.5 h-4.5 ${c.text}`} style={{ width: '1.1rem', height: '1.1rem' }} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`transition-colors flex-shrink-0 ${value ? 'text-[#364153]' : 'text-gray-300'}`}
      >
        {value ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
      </button>
    </div>
  );
}

// ─── LIVE PREVIEW CARD ────────────────────────────────────────
function PreviewCard({ settings, user, businessData, serviceMode, isHealthMedical }) {
  const { t } = useLanguage();
  const gallery = settings.coverGallery || [];
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (gallery.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % gallery.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [gallery.length]);

  useEffect(() => {
    if (slideIndex >= gallery.length) setSlideIndex(0);
  }, [gallery.length, slideIndex]);

  const accentColors = {
    slate:  { bg: '#364153', light: '#e8ecf0' },
    amber:  { bg: '#D4AF37', light: '#fef9e7' },
    rose:   { bg: '#e11d48', light: '#fff1f2' },
    teal:   { bg: '#0d9488', light: '#f0fdfa' },
    violet: { bg: '#7c3aed', light: '#f5f3ff' },
    blue:   { bg: '#2563eb', light: '#eff6ff' },
  };
  const accent = accentColors[settings.accentColor] || accentColors.slate;

  return (
    <div className="bg-white rounded-[5px] border border-gray-200 shadow-sm w-full max-w-xs">
      {/* Cover + Avatar wrapper */}
      <div className="relative">
        {/* Cover */}
        <div className="h-32 overflow-hidden rounded-t-[5px] relative" style={{ backgroundColor: accent.light }}>
          {settings.showCoverPhoto && gallery.length > 0 ? (
            gallery.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`cover ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
                style={{ opacity: i === slideIndex ? 1 : 0 }}
              />
            ))
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent.light} 0%, ${accent.bg}22 100%)` }} />
          )}
        </div>
        {/* Avatar — absolutely positioned, straddles cover bottom */}
        {settings.showProfile && (
          <div className="absolute bottom-0 left-4 translate-y-1/2 z-10">
            {settings.avatarUrl ? (
              <img
                src={settings.avatarUrl}
                alt="business"
                className="w-14 h-14 rounded-full border-2 border-white shadow object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full border-2 border-white shadow bg-gray-200 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Name — top padding accounts for avatar bleed */}
      <div className={`px-4 pb-3 ${settings.showProfile ? 'pt-10' : 'pt-3'}`}>
        <p className="text-sm font-bold text-[#364153] truncate">
          {settings.businessName || t('businessCard.previewName')}
        </p>
        <p className="text-xs text-gray-400 truncate capitalize mb-3">
          {businessData?.professionalType?.replace(/_/g, ' ') || t('businessCard.previewType')}
        </p>

        {/* Info chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {settings.showLocation && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
              <MapPin className="w-3 h-3" />
              {businessData?.city || 'City'}
            </span>
          )}
          {settings.showRating && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
              <Star className="w-3 h-3 fill-amber-400" />
              5.0
            </span>
          )}
          {settings.showResponseTime && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
              <Clock className="w-3 h-3" />
              {t('businessCard.fastReply')}
            </span>
          )}
        </div>

        {/* Services preview / Specialization description */}
        {isHealthMedical ? (
          settings.specializationDescription && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('businessCard.specializationHeading') !== 'businessCard.specializationHeading' ? t('businessCard.specializationHeading') : 'Specialization'}</p>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{settings.specializationDescription}</p>
            </div>
          )
        ) : (
          settings.showServices && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('businessCard.servicesHeading')}</p>
              <div className="space-y-1">
                {['Classic Haircut', 'Beard Trim'].map(s => (
                  <div key={s} className="flex justify-between items-center text-xs">
                    <span className="text-gray-700">{s}</span>
                    <span className="font-medium text-gray-900">
                      {settings.showPrices ? '80 MAD' : <EyeOff className="w-3 h-3 text-gray-300" />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Action buttons row */}
        {(() => {
          const hasBooking = settings.showBookingButton !== false;
          const hasDirections = serviceMode === 'walkin' || settings.showGetDirections;
          const hasCall = settings.showCallButton;
          const hasMsg = settings.showMessageButton;
          const hasMain = hasBooking || hasDirections;
          const contactOnly = !hasMain && (hasCall || hasMsg);
          return (
            <div className="flex gap-1.5">
              {/* Booking button */}
              {hasBooking && (
                <button
                  className="flex-1 py-2 text-xs font-semibold text-white rounded-[5px] transition-opacity hover:opacity-90"
                  style={{ backgroundColor: accent.bg }}
                >
                  {t('businessCard.bookNow')}
                </button>
              )}
              {/* Get Directions button */}
              {hasDirections && (
                <button
                  className={`flex-1 py-2 text-xs font-semibold rounded-[5px] transition-opacity hover:opacity-90 flex items-center justify-center gap-1 ${
                    hasBooking ? 'border border-gray-400 text-gray-600' : 'text-white'
                  }`}
                  style={!hasBooking ? { backgroundColor: accent.bg } : undefined}
                >
                  <Navigation className="w-3 h-3" />
                  {t('businessCard.getDirections')}
                </button>
              )}
              {/* Call */}
              {hasCall && (
                <button
                  className={`flex items-center justify-center rounded-[5px] transition-colors ${
                    contactOnly
                      ? 'flex-1 gap-1 py-2 text-xs font-semibold text-white hover:opacity-90'
                      : 'w-12 border border-gray-400 text-gray-600 hover:bg-gray-50'
                  }`}
                  style={contactOnly
                    ? { backgroundColor: accent.bg }
                    : undefined
                  }
                >
                  <Phone className="w-3.5 h-3.5" />
                  {contactOnly && t('businessCard.call')}
                </button>
              )}
              {/* Message */}
              {hasMsg && (
                <button
                  className={`flex items-center justify-center rounded-[5px] transition-colors ${
                    contactOnly
                      ? 'flex-1 gap-1 py-2 text-xs font-semibold text-white hover:opacity-90'
                      : 'w-12 border border-gray-400 text-gray-600 hover:bg-gray-50'
                  }`}
                  style={contactOnly
                    ? { backgroundColor: accent.bg }
                    : undefined
                  }
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {contactOnly && t('businessCard.message')}
                </button>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}

// ─── ACCENT COLOR PICKER ─────────────────────────────────────
const ACCENT_COLORS = [
  { id: 'slate',  hex: '#364153', label: 'Slate'  },
  { id: 'amber',  hex: '#D4AF37', label: 'Gold'   },
  { id: 'rose',   hex: '#e11d48', label: 'Rose'   },
  { id: 'teal',   hex: '#0d9488', label: 'Teal'   },
  { id: 'violet', hex: '#7c3aed', label: 'Violet' },
  { id: 'blue',   hex: '#2563eb', label: 'Blue'   },
];

// ─── DEFAULT SETTINGS ────────────────────────────────────────
const DEFAULT_SETTINGS = {
  pageEnabled:       true,
  showProfile:       true,
  businessName:      '',
  specializationDescription: '',
  showCoverPhoto:    true,
  showServices:      true,
  showPrices:        true,
  showLocation:      true,
  showRating:        true,
  showResponseTime:  true,
  showBookingButton: true,
  showGetDirections: false,
  showCallButton:    false,
  showMessageButton: false,
  accentColor:       'slate',
  coverGallery:      [],
  avatarUrl:         null,
};

// ─── PAGE ────────────────────────────────────────────────────
export default function PublicPageManager() {
  const { user, isLoaded } = useAuthUser();
  const params = useParams();
  const locale = params.locale || 'en';
  const { t, isRTL } = useLanguage();
  const { businessCategory, serviceMode, serviceCategorySlug } = useBusinessCategory();

  const isHealthMedical = serviceCategorySlug === 'health_medical';

  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [businessData, setBusinessData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState(null);
  const avatarInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const hasFetchedRef = useRef(false);
  const savedSettingsRef = useRef(null);
  const [savedVersion, setSavedVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [profile, savedData] = await Promise.all([
        fetch('/api/user-profile').then(r => r.ok ? r.json() : {}),
        fetch('/api/business/public-page-settings').then(r => r.ok ? r.json() : null),
      ]);
      setBusinessData(profile);
      if (savedData?.settings) {
        const mergedSettings = { ...savedData.settings };
        if (savedData.fallbackBusinessName) {
          mergedSettings.businessName = savedData.fallbackBusinessName;
        }
        setSettings(s => ({ ...s, ...mergedSettings }));
        savedSettingsRef.current = { ...DEFAULT_SETTINGS, ...mergedSettings };
      }
    } catch (e) {
      console.error('Failed to refresh public page data:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch business data & saved settings (only once)
  useEffect(() => {
    if (!isLoaded || !user || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    Promise.all([
      fetch('/api/user-profile').then(r => r.ok ? r.json() : {}),
      fetch('/api/business/public-page-settings').then(r => r.ok ? r.json() : null),
    ]).then(([profile, savedData]) => {
      setBusinessData(profile);
      let initialSettings = { ...DEFAULT_SETTINGS };
      if (savedData?.settings) {
        const mergedSettings = { ...savedData.settings };
        if (savedData.fallbackBusinessName) {
          mergedSettings.businessName = savedData.fallbackBusinessName;
        }
        initialSettings = { ...initialSettings, ...mergedSettings };
        setSettings(s => ({ ...s, ...mergedSettings }));
      } else if (savedData?.fallbackBusinessName) {
        initialSettings = { ...initialSettings, businessName: savedData.fallbackBusinessName };
        setSettings(s => ({ ...s, businessName: savedData.fallbackBusinessName }));
      }
      savedSettingsRef.current = initialSettings;
    }).catch(e => {
      console.error('Failed to load public page data:', e);
      setFetchFailed(true);
    }).finally(() => setLoading(false));
  }, [isLoaded, user]);

  // Count how many logical changes differ from saved state
  const changeCount = useMemo(() => {
    if (!savedSettingsRef.current) return 0;
    const base = savedSettingsRef.current;
    // Group related fields so preset selections count as 1 change
    const groups = [
      ['pageEnabled'],
      ['showProfile'],
      ['businessName'],
      ['specializationDescription'],
      ['showBookingButton', 'showGetDirections', 'showCallButton', 'showMessageButton'],
      ['showCoverPhoto'],
      ['showServices'],
      ['showPrices'],
      ['showLocation'],
      ['showRating'],
      ['showResponseTime'],
      ['accentColor'],
      ['coverGallery'],
      ['avatarUrl'],
    ];
    let count = 0;
    for (const group of groups) {
      const changed = group.some(key => {
        const a = base[key];
        const b = settings[key];
        if (Array.isArray(a) && Array.isArray(b)) {
          return JSON.stringify(a) !== JSON.stringify(b);
        }
        return a !== b;
      });
      if (changed) count++;
    }
    return count;
  }, [settings, savedVersion]);

  const hasUnsavedChanges = changeCount > 0;

  // Warn on browser tab close / refresh
  useEffect(() => {
    const handler = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Intercept sidebar/link clicks for unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleClick = (e) => {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('https://wa.me') || href.startsWith('https://www.google.com')) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNavUrl(href);
      setShowUnsavedDialog(true);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [hasUnsavedChanges]);

  const handleDiscardAndNavigate = () => {
    const url = pendingNavUrl;
    setShowUnsavedDialog(false);
    setPendingNavUrl(null);
    savedSettingsRef.current = { ...settings }; // prevent re-trigger
    if (url) router.push(url);
  };

  const handleSaveAndNavigate = async () => {
    await handleSave();
    const url = pendingNavUrl;
    setShowUnsavedDialog(false);
    setPendingNavUrl(null);
    if (url) router.push(url);
  };

  const set = (key, val) => {
    setSettings(s => ({ ...s, [key]: val }));
    setSaved(false);
  };

  const handleSave = async () => {
    // Block save if initial data hasn't loaded yet to prevent overwriting with defaults
    if (!savedSettingsRef.current) return;

    setSaving(true);
    setSaveError(null);
    try {
      // Compute only the fields that the user actually changed
      const base = savedSettingsRef.current;
      const changedFields = {};
      for (const key of Object.keys(settings)) {
        const a = base[key];
        const b = settings[key];
        const changed = Array.isArray(a) && Array.isArray(b)
          ? JSON.stringify(a) !== JSON.stringify(b)
          : a !== b;
        if (changed) {
          changedFields[key] = b;
        }
      }

      // Nothing changed — skip the request
      if (Object.keys(changedFields).length === 0) {
        setSaving(false);
        return;
      }

      const res = await fetch('/api/business/public-page-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: changedFields, partial: true }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Server returned an invalid response'); }
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save');
      }
      savedSettingsRef.current = { ...settings };
      setSavedVersion(v => v + 1);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('[Business Card] Save error:', err);
      setSaveError(err.message || 'Failed to save settings');
      setTimeout(() => setSaveError(null), 5000);
    }
    finally { setSaving(false); }
  };

  const uploadImage = async (file, type) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    return (await res.json()).url;
  };

  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  // Sanitize business name: strip HTML/script tags and control characters
  const sanitizeBusinessName = (value) => {
    return value
      .replace(/<[^>]*>/g, '')          // strip HTML tags
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
      .slice(0, 60);
  };

  const validateImageFile = async (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('businessCard.invalidFileType');
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('businessCard.fileTooLarge');
    }
    // Check magic bytes to prevent disguised files
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    const isWEBP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
                && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    if (!isJPEG && !isPNG && !isWEBP) {
      return t('businessCard.invalidFileType');
    }
    return null;
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const error = await validateImageFile(file);
    if (error) {
      setUploadError(error);
      setTimeout(() => setUploadError(null), 5000);
      e.target.value = '';
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, 'business_avatar');
      set('avatarUrl', url);
    } catch (err) {
      console.error('[Business Card] Avatar upload error:', err);
      setUploadError('Failed to upload avatar');
      setTimeout(() => setUploadError(null), 5000);
    }
    finally { setUploadingAvatar(false); e.target.value = ''; }
  };

  const handleGalleryCoverUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError(null);
    for (const file of files) {
      const error = await validateImageFile(file);
      if (error) {
        setUploadError(error);
        setTimeout(() => setUploadError(null), 5000);
        e.target.value = '';
        return;
      }
    }
    setUploadingGallery(true);
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f, 'gallery_cover')));
      setSettings(s => ({
        ...s,
        coverGallery: [...(s.coverGallery || []), ...urls],
      }));
      setSaved(false);
    } catch (err) {
      console.error('[Business Card] Gallery upload error:', err);
      setUploadError('Failed to upload cover photos');
      setTimeout(() => setUploadError(null), 5000);
    }
    finally { setUploadingGallery(false); e.target.value = ''; }
  };

  const removeGalleryCover = (url) => {
    setSettings(s => ({
      ...s,
      coverGallery: s.coverGallery.filter(u => u !== url),
    }));
    setSaved(false);
  };

  const handleRetryFetch = () => {
    setFetchFailed(false);
    setLoading(true);
    hasFetchedRef.current = false;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-56 bg-gray-200 rounded" />
        <div className="h-4 w-80 bg-gray-100 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-[5px]" />)}
          </div>
          <div className="h-80 bg-gray-100 rounded-[5px]" />
        </div>
      </div>
    );
  }

  if (fetchFailed) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <X className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {t('businessCard.fetchErrorTitle') || 'Failed to load settings'}
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            {t('businessCard.fetchErrorDesc') || 'Your settings could not be loaded. Please check your connection and try again.'}
          </p>
          <button
            onClick={handleRetryFetch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-sm font-medium bg-[#364153] text-white hover:bg-[#364153]/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('businessCard.retry') || 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`}>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#364153] flex items-center gap-2">
              <Globe className="w-6 h-6" />
              Business Card
            </h1>
            <p className="text-sm text-gray-400 mt-1">{t('businessCard.subtitle')}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="sm:hidden p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-[5px] transition-colors disabled:opacity-50"
            title={t('common.refresh') || 'Refresh'}
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {saveError && (
            <span className="text-sm text-red-500">{saveError}</span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="hidden sm:block p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-[5px] transition-colors disabled:opacity-50"
            title={t('common.refresh') || 'Refresh'}
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-sm font-medium transition-colors shrink-0 ${
              hasUnsavedChanges
                ? 'bg-[#364153] text-white hover:bg-[#364153]/90'
                : saved
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-default'
            } disabled:opacity-60`}
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved
                ? <Check className="w-4 h-4" />
                : <Save className="w-4 h-4" />
            }
            {saved ? t('common.saved') : t('common.saveChanges')}
            {hasUnsavedChanges && (
              <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {changeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Settings ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Business Identity */}
          <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">{t('businessCard.businessIdentity')}</h2>
            </div>
            <div className="p-4 space-y-4">

              {/* Show / hide profile photo */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{t('businessCard.showProfile')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t('businessCard.showProfileDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('showProfile', !settings.showProfile)}
                  className={`transition-colors flex-shrink-0 ${settings.showProfile ? 'text-[#364153]' : 'text-gray-300'}`}
                >
                  {settings.showProfile ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {/* Business name input — always visible */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('businessCard.businessName')}</label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={e => set('businessName', sanitizeBusinessName(e.target.value))}
                  maxLength={60}
                  placeholder="e.g. Ayoub Cuts, Studio Maatala..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153]"
                />
                <p className="text-xs text-gray-400 mt-1">{settings.businessName.length}/60</p>
              </div>

              {/* Specialization description — health_medical only */}
              {isHealthMedical && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('businessCard.specializationDescription') || 'Specialization Description'}</label>
                  <textarea
                    value={settings.specializationDescription || ''}
                    onChange={e => set('specializationDescription', e.target.value.replace(/<[^>]*>/g, '').slice(0, 300))}
                    maxLength={300}
                    rows={3}
                    placeholder={t('businessCard.specializationDescriptionPlaceholder') || 'Describe your medical specialization, expertise, and services...'}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153] resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{(settings.specializationDescription || '').length}/300</p>
                </div>
              )}

            </div>
          </div>

          {/* Contact & Booking */}
          <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                {(serviceMode === 'both' || serviceMode === 'walkin')
                  ? t('businessCard.contactBookingDirectionsSection')
                  : t('businessCard.contactBookingSection')}
              </h2>
            </div>
            <div className="p-4 space-y-2">

              {/* ── service_mode = both → preset radio options ── */}
              {serviceMode === 'both' && (() => {
                // Determine which preset is active
                const preset =
                  settings.showBookingButton && settings.showGetDirections && !settings.showCallButton && !settings.showMessageButton
                    ? 'booking+directions'
                    : settings.showBookingButton && !settings.showGetDirections && settings.showCallButton && settings.showMessageButton
                      ? 'booking+contact'
                      : !settings.showBookingButton && settings.showGetDirections && settings.showCallButton && settings.showMessageButton
                        ? 'directions+contact'
                        : !settings.showBookingButton && !settings.showGetDirections && settings.showCallButton && settings.showMessageButton
                          ? 'contact-only'
                          : 'booking+directions';

                const presets = [
                  { id: 'booking+directions', icon: CalendarCheck, label: t('businessCard.presetBookingDirections'), color: 'blue' },
                  { id: 'booking+contact',    icon: CalendarCheck, label: t('businessCard.presetBookingContact'),    color: 'green' },
                  { id: 'directions+contact', icon: Navigation,    label: t('businessCard.presetDirectionsContact'), color: 'purple' },
                  { id: 'contact-only',       icon: Phone,         label: t('businessCard.presetContactOnly'),       color: 'orange' },
                ];

                const applyPreset = (id) => {
                  const map = {
                    'booking+directions': { showBookingButton: true,  showGetDirections: true,  showCallButton: false, showMessageButton: false },
                    'booking+contact':    { showBookingButton: true,  showGetDirections: false, showCallButton: true,  showMessageButton: true },
                    'directions+contact': { showBookingButton: false, showGetDirections: true,  showCallButton: true,  showMessageButton: true },
                    'contact-only':       { showBookingButton: false, showGetDirections: false, showCallButton: true,  showMessageButton: true },
                  };
                  setSettings(s => ({ ...s, ...map[id] }));
                  setSaved(false);
                };

                return presets.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] border transition-colors text-left ${
                      preset === p.id
                        ? 'border-[#364153] bg-[#364153]/5'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      preset === p.id ? 'border-[#364153]' : 'border-gray-300'
                    }`}>
                      {preset === p.id && <div className="w-2 h-2 rounded-full bg-[#364153]" />}
                    </div>
                    <p.icon className={`w-4 h-4 flex-shrink-0 ${preset === p.id ? 'text-[#364153]' : 'text-gray-400'}`} />
                    <span className={`text-sm ${preset === p.id ? 'font-medium text-[#364153]' : 'text-gray-600'}`}>{p.label}</span>
                  </button>
                ));
              })()}

              {/* ── service_mode = walkin → preset radio options ── */}
              {serviceMode === 'walkin' && (() => {
                const preset =
                  settings.showGetDirections && !settings.showCallButton && !settings.showMessageButton
                    ? 'directions-only'
                    : settings.showGetDirections && settings.showCallButton && settings.showMessageButton
                      ? 'directions+contact'
                      : !settings.showGetDirections && settings.showCallButton && settings.showMessageButton
                        ? 'contact-only'
                        : 'directions-only';

                const presets = [
                  { id: 'directions-only',    icon: Navigation, label: t('businessCard.presetDirectionsOnly'),  color: 'blue' },
                  { id: 'directions+contact', icon: Navigation, label: t('businessCard.presetDirectionsContact'), color: 'purple' },
                  { id: 'contact-only',       icon: Phone,      label: t('businessCard.presetContactOnly'),     color: 'orange' },
                ];

                const applyPreset = (id) => {
                  const map = {
                    'directions-only':    { showBookingButton: false, showGetDirections: true,  showCallButton: false, showMessageButton: false },
                    'directions+contact': { showBookingButton: false, showGetDirections: true,  showCallButton: true,  showMessageButton: true },
                    'contact-only':       { showBookingButton: false, showGetDirections: false, showCallButton: true,  showMessageButton: true },
                  };
                  setSettings(s => ({ ...s, ...map[id] }));
                  setSaved(false);
                };

                return presets.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] border transition-colors text-left ${
                      preset === p.id
                        ? 'border-[#364153] bg-[#364153]/5'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      preset === p.id ? 'border-[#364153]' : 'border-gray-300'
                    }`}>
                      {preset === p.id && <div className="w-2 h-2 rounded-full bg-[#364153]" />}
                    </div>
                    <p.icon className={`w-4 h-4 flex-shrink-0 ${preset === p.id ? 'text-[#364153]' : 'text-gray-400'}`} />
                    <span className={`text-sm ${preset === p.id ? 'font-medium text-[#364153]' : 'text-gray-600'}`}>{p.label}</span>
                  </button>
                ));
              })()}

              {/* ── service_mode = booking → preset radio options ── */}
              {serviceMode !== 'walkin' && serviceMode !== 'both' && (() => {
                const preset =
                  settings.showBookingButton !== false && !settings.showCallButton && !settings.showMessageButton
                    ? 'booking-only'
                    : settings.showBookingButton !== false && settings.showCallButton && settings.showMessageButton
                      ? 'booking+contact'
                      : !settings.showBookingButton && settings.showCallButton && settings.showMessageButton
                        ? 'contact-only'
                        : 'booking-only';

                const presets = [
                  { id: 'booking-only',    icon: CalendarCheck, label: t('businessCard.presetBookingOnly'),    color: 'blue' },
                  { id: 'booking+contact', icon: CalendarCheck, label: t('businessCard.presetBookingContact'), color: 'green' },
                  { id: 'contact-only',    icon: Phone,         label: t('businessCard.presetContactOnly'),    color: 'orange' },
                ];

                const applyPreset = (id) => {
                  const map = {
                    'booking-only':    { showBookingButton: true,  showGetDirections: false, showCallButton: false, showMessageButton: false },
                    'booking+contact': { showBookingButton: true,  showGetDirections: false, showCallButton: true,  showMessageButton: true },
                    'contact-only':    { showBookingButton: false, showGetDirections: false, showCallButton: true,  showMessageButton: true },
                  };
                  setSettings(s => ({ ...s, ...map[id] }));
                  setSaved(false);
                };

                return (
                  <>
                    {presets.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] border transition-colors text-left ${
                          preset === p.id
                            ? 'border-[#364153] bg-[#364153]/5'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          preset === p.id ? 'border-[#364153]' : 'border-gray-300'
                        }`}>
                          {preset === p.id && <div className="w-2 h-2 rounded-full bg-[#364153]" />}
                        </div>
                        <p.icon className={`w-4 h-4 flex-shrink-0 ${preset === p.id ? 'text-[#364153]' : 'text-gray-400'}`} />
                        <span className={`text-sm ${preset === p.id ? 'font-medium text-[#364153]' : 'text-gray-600'}`}>{p.label}</span>
                      </button>
                    ))}
                    {preset === 'contact-only' && (
                      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-[5px] mt-1">
                        <Phone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-amber-700 leading-relaxed">{t('businessCard.contactOnlyInfo')}</p>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Contact-only notice for both & walkin modes */}
              {(serviceMode === 'both' || serviceMode === 'walkin') && !settings.showBookingButton && !settings.showGetDirections && settings.showCallButton && settings.showMessageButton && (
                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-[5px] mt-1">
                  <Phone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-amber-700 leading-relaxed">{t('businessCard.contactOnlyInfo')}</p>
                </div>
              )}

            </div>
          </div>

          {/* Photos Management */}
          <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-700">{t('businessCard.photos')}</h2>
              </div>
              {uploadError && (
                <span className="text-xs text-red-500">{uploadError}</span>
              )}
            </div>
            <div className="p-4 space-y-5">

              {/* Profile photo */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">{t('businessCard.profilePhoto')}</p>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0 group">
                    {(settings.avatarUrl) ? (
                      <>
                        <img
                          src={settings.avatarUrl}
                          alt="avatar"
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => { set('avatarUrl', null); }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex shadow-sm"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-[5px] hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingAvatar ? t('businessCard.uploading') : (settings.avatarUrl ? t('businessCard.changePhoto') : t('businessCard.uploadPhoto'))}
                    </button>
                    <p className="text-xs text-gray-400">{t('businessCard.photoHint')}</p>
                  </div>
                  <input ref={avatarInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleAvatarUpload} />
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Cover gallery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">{t('businessCard.coverGallery')}</p>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingGallery}
                    className="flex items-center gap-1 text-xs text-[#364153] font-medium hover:underline disabled:opacity-50"
                  >
                    {uploadingGallery
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Plus className="w-3 h-3" />
                    }
                    {t('businessCard.addPhotos')}
                  </button>
                  <input ref={galleryInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" multiple className="hidden" onChange={handleGalleryCoverUpload} />
                </div>
                <p className="text-xs text-gray-400 mb-3">{t('businessCard.coverGalleryHint')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {(settings.coverGallery || []).map((url, i) => (
                    <div key={i} className="relative group aspect-video rounded-[5px] overflow-hidden border border-gray-200">
                      <img src={url} alt={`cover ${i+1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryCover(url)}
                        className="absolute bottom-1 right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center flex sm:hidden sm:group-hover:flex"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {/* Empty slot — upload trigger */}
                  <div
                    className="aspect-video rounded-[5px] border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-300 transition-colors"
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <Plus className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Content Sections */}
          <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">{t('businessCard.contentSections')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('businessCard.contentSectionsDesc')}</p>
            </div>
            <div className="p-4 space-y-2">
              <SectionToggle
                icon={Image}
                label={t('businessCard.coverPhoto')}
                description={t('businessCard.coverPhotoDesc')}
                value={settings.showCoverPhoto}
                onChange={v => set('showCoverPhoto', v)}
                accent="blue"
              />
              {!isHealthMedical && (
                <SectionToggle
                  icon={DollarSign}
                  label={t('businessCard.prices')}
                  description={t('businessCard.pricesDesc')}
                  value={settings.showPrices}
                  onChange={v => set('showPrices', v)}
                  accent="green"
                />
              )}
              <SectionToggle
                icon={Star}
                label={t('businessCard.rating')}
                description={t('businessCard.ratingDesc')}
                value={settings.showRating}
                onChange={v => set('showRating', v)}
                accent="amber"
              />
              <SectionToggle
                icon={MapPin}
                label={t('businessCard.location')}
                description={t('businessCard.locationDesc')}
                value={settings.showLocation}
                onChange={v => set('showLocation', v)}
                accent="rose"
              />
              <SectionToggle
                icon={Clock}
                label={t('businessCard.responseTime')}
                description={t('businessCard.responseTimeDesc')}
                value={settings.showResponseTime}
                onChange={v => set('showResponseTime', v)}
                accent="teal"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">{t('businessCard.accentColor')}</h2>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-3">{t('businessCard.accentColorDesc')}</p>
              <div className="flex flex-wrap gap-2.5">
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set('accentColor', c.id)}
                    title={c.label}
                    className={`w-8 h-8 rounded-full transition-all border-2 ${
                      settings.accentColor === c.id
                        ? 'border-[#364153] scale-110 shadow-md'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {settings.accentColor === c.id && (
                      <Check className="w-4 h-4 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-[5px]">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('businessCard.infoNotice') }} />
          </div>
        </div>

        {/* ── Right: Live Preview (hidden on small screens) ── */}
        <div className="hidden lg:flex space-y-4 flex-col items-center lg:items-stretch">
          <div className="sticky top-24 w-full flex flex-col items-center lg:items-stretch">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5 self-start">
              <Eye className="w-3.5 h-3.5" />
              {t('businessCard.livePreview')}
            </p>

            {!settings.pageEnabled ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-[5px] text-center w-full max-w-xs lg:max-w-none">
                <EyeOff className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-400">{t('businessCard.cardHidden')}</p>
                <p className="text-xs text-gray-300 mt-1">{t('businessCard.enableVisibility')}</p>
              </div>
            ) : (
              <PreviewCard
                settings={serviceMode === 'walkin' ? { ...settings, showBookingButton: false, showGetDirections: true } : settings}
                user={user}
                businessData={businessData}
                serviceMode={serviceMode}
                isHealthMedical={isHealthMedical}
              />
            )}


          </div>
        </div>
      </div>

      {/* ── FAB for Live Preview (visible only on small screens) ── */}
      <button
        onClick={() => setShowMobilePreview(true)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#364153] text-white rounded-full shadow-lg hover:bg-[#364153]/90 transition-all flex items-center justify-center z-40 hover:scale-105 active:scale-95"
        aria-label="Live Preview"
      >
        <Eye className="w-6 h-6" />
        {hasUnsavedChanges && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {changeCount}
          </span>
        )}
      </button>

      {/* ── Mobile Preview Modal ── */}
      {showMobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobilePreview(false)}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowMobilePreview(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Preview Header */}
            <div className="bg-white rounded-t-[5px] px-4 py-3 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                {t('businessCard.livePreview')}
              </p>
            </div>

            {/* Preview Content */}
            <div className="bg-gray-50 p-4 rounded-b-[5px]">
              {!settings.pageEnabled ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-[5px] text-center bg-white">
                  <EyeOff className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-400">{t('businessCard.cardHidden')}</p>
                  <p className="text-xs text-gray-300 mt-1">{t('businessCard.enableVisibility')}</p>
                </div>
              ) : (
                <div className="flex justify-center">
                  <PreviewCard
                    settings={serviceMode === 'walkin' ? { ...settings, showBookingButton: false, showGetDirections: true } : settings}
                    user={user}
                    businessData={businessData}
                    serviceMode={serviceMode}
                    isHealthMedical={isHealthMedical}
                  />
                </div>
              )}


            </div>
          </div>
        </div>
      )}

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
