'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import {
  Globe,
  Eye,
  EyeOff,
  Tag,
  CalendarCheck,
  Image,
  FileText,
  Phone,
  MapPin,
  Star,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Loader2,
  Save,
  Palette,
  ToggleLeft,
  ToggleRight,
  Clock,
  DollarSign,
  Info,
  Shield,
  Camera,
  Upload,
  Trash2,
  Plus,
  Briefcase,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
function PreviewCard({ settings, user, businessData }) {
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
        <div className="h-32 overflow-hidden rounded-t-[5px]" style={{ backgroundColor: accent.light }}>
          {settings.showCoverPhoto && settings.activeCoverUrl ? (
            <img src={settings.activeCoverUrl} alt="cover" className="w-full h-full object-cover" />
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
        {settings.showProfile && (
          <>
            <p className="text-sm font-bold text-[#364153] truncate">
              {settings.businessName || 'Your Business Name'}
            </p>
            <p className="text-xs text-gray-400 truncate capitalize mb-3">
              {businessData?.professionalType?.replace(/_/g, ' ') || 'Professional Type'}
            </p>
          </>
        )}


        {/* Bio */}
        {settings.showBio && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">
            {businessData?.bio || 'A short description about your services and expertise...'}
          </p>
        )}

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
              Fast reply
            </span>
          )}
        </div>

        {/* Services preview */}
        {settings.showServices && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Services</p>
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
        )}

        {/* Booking button */}
        {settings.showBookingButton && (
          <button
            className="w-full py-2 text-xs font-semibold text-white rounded-[5px] transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent.bg }}
          >
            {settings.bookingButtonText || 'Book Now'}
          </button>
        )}

        {/* Contact */}
        {settings.showContact && (
          <div className="mt-2.5 flex gap-2">
            <button className="flex-1 py-1.5 text-xs border border-gray-200 rounded-[5px] text-gray-600 hover:bg-gray-50 transition-colors">
              <Phone className="w-3 h-3 inline mr-1" />Call
            </button>
            <button className="flex-1 py-1.5 text-xs border border-gray-200 rounded-[5px] text-gray-600 hover:bg-gray-50 transition-colors">
              Message
            </button>
          </div>
        )}
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
  showCoverPhoto:    true,
  showBio:           true,
  showServices:      true,
  showPrices:        true,
  showBookingButton: true,
  bookingButtonText: 'Book Now',
  showGallery:       true,
  showContact:       true,
  showLocation:      true,
  showRating:        true,
  showResponseTime:  true,
  accentColor:       'slate',
  activeCoverUrl:    null,
  coverGallery:      [],
  avatarUrl:         null,
};

// ─── PAGE ────────────────────────────────────────────────────
export default function PublicPageManager() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const locale = params.locale || 'en';
  const { isRTL } = useLanguage();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [businessData, setBusinessData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Build the public page URL (slug will come from business profile in future)
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${locale}/pro/${user?.username || user?.id || 'your-page'}`
    : '';

  // Fetch business data & saved settings
  useEffect(() => {
    if (!isLoaded || !user) return;
    Promise.all([
      fetch('/api/user-profile').then(r => r.ok ? r.json() : {}),
      fetch('/api/business/public-page-settings').then(r => r.ok ? r.json() : null),
    ]).then(([profile, savedSettings]) => {
      setBusinessData(profile);
      if (savedSettings?.settings) {
        setSettings(s => ({ ...s, ...savedSettings.settings }));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isLoaded, user]);

  const set = (key, val) => {
    setSettings(s => ({ ...s, [key]: val }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/business/public-page-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    finally { setSaving(false); }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const uploadImage = async (file, type) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    return (await res.json()).url;
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, 'avatar');
      set('avatarUrl', url);
    } catch {}
    finally { setUploadingAvatar(false); e.target.value = ''; }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadImage(file, 'cover');
      setSettings(s => ({
        ...s,
        activeCoverUrl: url,
        coverGallery: s.coverGallery.some(u => u === url) ? s.coverGallery : [url, ...s.coverGallery],
      }));
      setSaved(false);
    } catch {}
    finally { setUploadingCover(false); e.target.value = ''; }
  };

  const handleGalleryCoverUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingGallery(true);
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f, 'gallery_cover')));
      setSettings(s => ({
        ...s,
        coverGallery: [...(s.coverGallery || []), ...urls],
        activeCoverUrl: s.activeCoverUrl || urls[0],
      }));
      setSaved(false);
    } catch {}
    finally { setUploadingGallery(false); e.target.value = ''; }
  };

  const removeGalleryCover = (url) => {
    setSettings(s => ({
      ...s,
      coverGallery: s.coverGallery.filter(u => u !== url),
      activeCoverUrl: s.activeCoverUrl === url
        ? s.coverGallery.find(u => u !== url) || null
        : s.activeCoverUrl,
    }));
    setSaved(false);
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

  return (
    <div className={`p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`}>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#364153] flex items-center gap-2">
            <Globe className="w-6 h-6" />
            Public Page
          </h1>
          <p className="text-sm text-gray-400 mt-1">Control what clients see on your public profile</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#364153] text-white rounded-[5px] text-sm font-medium hover:bg-[#364153]/90 transition-colors disabled:opacity-60 shrink-0"
        >
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : saved
              ? <Check className="w-4 h-4" />
              : <Save className="w-4 h-4" />
          }
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* ── Public URL bar ── */}
      <div className="flex items-center gap-2 mb-6 p-3 bg-gray-50 border border-gray-200 rounded-[5px]">
        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-500 truncate flex-1">{publicUrl}</span>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-[5px] hover:bg-gray-50 transition-colors flex-shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#364153] bg-white border border-gray-200 rounded-[5px] hover:bg-gray-50 transition-colors flex-shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Settings ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Page Visibility */}
          <div className="bg-white border border-gray-200 rounded-[5px] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center ${settings.pageEnabled ? 'bg-green-50' : 'bg-gray-100'}`}>
                  {settings.pageEnabled
                    ? <Eye className="w-5 h-5 text-green-600" />
                    : <EyeOff className="w-5 h-5 text-gray-400" />
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Public Page</p>
                  <p className="text-xs text-gray-400">
                    {settings.pageEnabled ? 'Visible to everyone — clients can find and book you' : 'Hidden — only you can see this page'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => set('pageEnabled', !settings.pageEnabled)}
                className={`transition-colors ${settings.pageEnabled ? 'text-[#364153]' : 'text-gray-300'}`}
              >
                {settings.pageEnabled
                  ? <ToggleRight className="w-9 h-9" />
                  : <ToggleLeft className="w-9 h-9" />
                }
              </button>
            </div>

            {settings.pageEnabled && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-[5px]">
                <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-700">Your page is live and accepting bookings</p>
              </div>
            )}
          </div>

          {/* Business Identity */}
          <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Business Identity</h2>
            </div>
            <div className="p-4 space-y-4">

              {/* Show / hide profile section */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Show Profile Section</p>
                  <p className="text-xs text-gray-400 mt-0.5">Display your name and avatar on the public page</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('showProfile', !settings.showProfile)}
                  className={`transition-colors flex-shrink-0 ${settings.showProfile ? 'text-[#364153]' : 'text-gray-300'}`}
                >
                  {settings.showProfile ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {/* Business name input */}
              {settings.showProfile && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={settings.businessName}
                    onChange={e => set('businessName', e.target.value)}
                    maxLength={60}
                    placeholder="e.g. Ayoub Cuts, Studio Maatala..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153]"
                  />
                  <p className="text-xs text-gray-400 mt-1">{settings.businessName.length}/60</p>
                </div>
              )}

            </div>
          </div>

          {/* Photos Management */}
          <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Camera className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Photos</h2>
            </div>
            <div className="p-4 space-y-5">

              {/* Profile photo */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Business Profile Photo</p>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {(settings.avatarUrl) ? (
                      <img
                        src={settings.avatarUrl}
                        alt="avatar"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      />
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
                      {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                    </button>
                    <p className="text-xs text-gray-400">JPG, PNG or WebP · max 5 MB</p>
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Cover photo */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Cover Photo</p>
                <div
                  className="relative w-full h-24 rounded-[5px] overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-gray-300 transition-colors group"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {settings.activeCoverUrl ? (
                    <img
                      src={settings.activeCoverUrl}
                      alt="cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <Image className="w-6 h-6 text-gray-300" />
                      <p className="text-xs text-gray-400">Click to upload cover</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    {uploadingCover
                      ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                      : <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    }
                  </div>
                </div>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </div>

              <div className="border-t border-gray-100" />

              {/* Cover gallery */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-600">Cover Gallery</p>
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
                    Add photos
                  </button>
                  <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryCoverUpload} />
                </div>
                <p className="text-xs text-gray-400 mb-3">Upload multiple covers. Click one to set as active.</p>
                <div className="grid grid-cols-4 gap-2">
                  {(settings.coverGallery || []).map((url, i) => (
                    <div key={i} className="relative group aspect-video rounded-[5px] overflow-hidden border-2 cursor-pointer transition-all"
                      style={{ borderColor: settings.activeCoverUrl === url ? '#364153' : 'transparent' }}
                      onClick={() => { setSettings(s => ({ ...s, activeCoverUrl: url })); setSaved(false); }}
                    >
                      <img src={url} alt={`cover ${i+1}`} className="w-full h-full object-cover" />
                      {settings.activeCoverUrl === url && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-[#364153] rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeGalleryCover(url); }}
                        className="absolute bottom-1 right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex"
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
              <h2 className="text-sm font-semibold text-gray-700">Content Sections</h2>
              <p className="text-xs text-gray-400 mt-0.5">Choose what appears on your public page</p>
            </div>
            <div className="p-4 space-y-2">
              <SectionToggle
                icon={Image}
                label="Cover Photo"
                description="Hero banner at the top of your page"
                value={settings.showCoverPhoto}
                onChange={v => set('showCoverPhoto', v)}
                accent="blue"
              />
              <SectionToggle
                icon={FileText}
                label="Bio / About"
                description="Short description about you and your work"
                value={settings.showBio}
                onChange={v => set('showBio', v)}
                accent="purple"
              />
              <SectionToggle
                icon={Tag}
                label="Services List"
                description="Show the services you offer"
                value={settings.showServices}
                onChange={v => set('showServices', v)}
                accent="amber"
              />
              <SectionToggle
                icon={DollarSign}
                label="Prices"
                description="Display pricing alongside services"
                value={settings.showPrices}
                onChange={v => set('showPrices', v)}
                accent="green"
              />
              <SectionToggle
                icon={Image}
                label="Photo Gallery"
                description="Show your portfolio images"
                value={settings.showGallery}
                onChange={v => set('showGallery', v)}
                accent="teal"
              />
              <SectionToggle
                icon={Star}
                label="Rating & Reviews"
                description="Display client reviews and star rating"
                value={settings.showRating}
                onChange={v => set('showRating', v)}
                accent="amber"
              />
              <SectionToggle
                icon={MapPin}
                label="Location"
                description="Show your city or address"
                value={settings.showLocation}
                onChange={v => set('showLocation', v)}
                accent="rose"
              />
              <SectionToggle
                icon={Phone}
                label="Contact Buttons"
                description="Call and message buttons for clients"
                value={settings.showContact}
                onChange={v => set('showContact', v)}
                accent="blue"
              />
              <SectionToggle
                icon={Clock}
                label="Response Time"
                description="Show how quickly you typically reply"
                value={settings.showResponseTime}
                onChange={v => set('showResponseTime', v)}
                accent="teal"
              />
            </div>
          </div>

          {/* Booking Button */}
          <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Booking Button</h2>
            </div>
            <div className="p-4 space-y-3">
              <SectionToggle
                icon={CalendarCheck}
                label="Show Booking Button"
                description="Let clients book directly from your page"
                value={settings.showBookingButton}
                onChange={v => set('showBookingButton', v)}
                accent="green"
              />
              {settings.showBookingButton && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Button Label</label>
                  <input
                    type="text"
                    value={settings.bookingButtonText}
                    onChange={e => set('bookingButtonText', e.target.value)}
                    maxLength={30}
                    placeholder="e.g. Book Now, Reserve, Schedule"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Accent Color */}
          <div className="bg-white border border-gray-200 rounded-[5px] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Accent Color</h2>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-3">Applied to buttons and highlights on your public page</p>
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
            <p className="text-xs text-blue-700 leading-relaxed">
              Changes are previewed live on the right. Click <strong>Save Changes</strong> to publish them to your public page.
            </p>
          </div>
        </div>

        {/* ── Right: Live Preview ── */}
        <div className="space-y-4 flex flex-col items-center lg:items-stretch">
          <div className="sticky top-24 w-full flex flex-col items-center lg:items-stretch">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5 self-start">
              <Eye className="w-3.5 h-3.5" />
              Live Preview
            </p>

            {!settings.pageEnabled ? (
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-[5px] text-center w-full max-w-xs lg:max-w-none">
                <EyeOff className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-400">Page is hidden</p>
                <p className="text-xs text-gray-300 mt-1">Enable the public page to see the preview</p>
              </div>
            ) : (
              <PreviewCard
                settings={settings}
                user={user}
                businessData={businessData}
              />
            )}

            {/* Quick stats summary */}
            <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-xs lg:max-w-none">
              {[
                { label: 'Sections on',    value: Object.entries(settings).filter(([k, v]) => k.startsWith('show') && v === true).length },
                { label: 'Sections off',   value: Object.entries(settings).filter(([k, v]) => k.startsWith('show') && v === false).length },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-gray-200 rounded-[5px] p-3 text-center">
                  <p className="text-lg font-bold text-[#364153]">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
