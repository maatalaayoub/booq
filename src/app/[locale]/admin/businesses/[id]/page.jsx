'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ArrowLeft, Loader2, MapPin, Star, Clock, Phone, Briefcase,
  EyeOff, Calendar, CheckCircle, XCircle, AlertCircle, Users,
  DollarSign, Timer, Store, Truck, Mail, Globe,
  Palmtree, Coffee, Utensils, Plane, HelpCircle,
} from 'lucide-react';

// ─── ACCENT COLORS ──────────────────────────────────────
const ACCENT_COLORS = {
  slate:  { bg: '#364153', light: '#e8ecf0' },
  amber:  { bg: '#D4AF37', light: '#fef9e7' },
  rose:   { bg: '#e11d48', light: '#fff1f2' },
  teal:   { bg: '#0d9488', light: '#f0fdfa' },
  violet: { bg: '#7c3aed', light: '#f5f3ff' },
  blue:   { bg: '#2563eb', light: '#eff6ff' },
};

const EXCEPTION_ICONS = {
  break: Coffee,
  lunch_break: Utensils,
  closure: XCircle,
  holiday: Palmtree,
  vacation: Plane,
  other: HelpCircle,
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── BUSINESS CARD (matching the real public preview) ────
function BusinessCard({ business }) {
  const { t } = useLanguage();
  const info = business.business_info;
  const settings = info?.business_card_settings?.settings || {};
  const services = (info?.business_services || []).filter(s => s.is_active);
  const shop = info?.shop_salon_info;
  const mobile = info?.mobile_service_info;

  const businessName = settings.businessName || shop?.business_name || mobile?.business_name || business.username || '—';
  const professionalType = info?.professional_type?.replace(/_/g, ' ') || '';
  const city = shop?.city || mobile?.city || business.user_profile?.city || '';
  const bio = settings.bio || '';
  const avatarUrl = settings.avatarUrl || business.user_profile?.profile_image_url;

  const accent = ACCENT_COLORS[settings.accentColor] || ACCENT_COLORS.slate;
  const gallery = settings.coverGallery || [];

  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    if (gallery.length <= 1) return;
    const timer = setInterval(() => setSlideIndex(p => (p + 1) % gallery.length), 3000);
    return () => clearInterval(timer);
  }, [gallery.length]);

  return (
    <div className="bg-white rounded-[5px] border border-gray-200 shadow-sm w-full sticky top-6">
      <div className="relative">
        <div className="h-32 overflow-hidden rounded-t-[5px] relative" style={{ backgroundColor: accent.light }}>
          {settings.showCoverPhoto !== false && gallery.length > 0 ? (
            gallery.map((url, i) => (
              <img key={url} src={url} alt={`cover ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
                style={{ opacity: i === slideIndex ? 1 : 0 }} />
            ))
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent.light} 0%, ${accent.bg}22 100%)` }} />
          )}
        </div>
        {settings.showProfile !== false && (
          <div className="absolute bottom-0 left-4 translate-y-1/2 z-10">
            {avatarUrl ? (
              <img src={avatarUrl} alt="business" className="w-14 h-14 rounded-full border-2 border-white shadow object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full border-2 border-white shadow bg-gray-200 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`px-4 pb-3 ${settings.showProfile !== false ? 'pt-10' : 'pt-3'}`}>
        <p className="text-sm font-bold text-[#364153] truncate">{businessName}</p>
        <p className="text-xs text-gray-400 truncate capitalize mb-3">{professionalType}</p>

        {settings.showBio !== false && bio && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2">{bio}</p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          {settings.showLocation !== false && city && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
              <MapPin className="w-3 h-3" /> {city}
            </span>
          )}
          {settings.showRating && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
              <Star className="w-3 h-3 fill-amber-400" /> 5.0
            </span>
          )}
          {settings.showResponseTime && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
              <Clock className="w-3 h-3" /> {t('businessCard.fastReply')}
            </span>
          )}
        </div>

        {settings.showServices !== false && services.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('businessCard.servicesHeading')}</p>
            <div className="space-y-1">
              {services.map(s => (
                <div key={s.id} className="flex justify-between items-center text-xs">
                  <span className="text-gray-700">{s.name}</span>
                  <span className="font-medium text-gray-900">
                    {settings.showPrices !== false ? `${Number(s.price).toFixed(0)} ${s.currency || 'MAD'}` : <EyeOff className="w-3 h-3 text-gray-300" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="w-full py-2 text-xs font-semibold text-white rounded-[5px] cursor-default" style={{ backgroundColor: accent.bg }}>
          {t('businessCard.bookNow')}
        </button>

        {settings.showContact && (
          <div className="mt-2.5 flex gap-2">
            <span className="flex-1 py-1.5 text-xs border border-gray-200 rounded-[5px] text-gray-600 text-center">
              <Phone className="w-3 h-3 inline mr-1" />{t('businessCard.call')}
            </span>
            <span className="flex-1 py-1.5 text-xs border border-gray-200 rounded-[5px] text-gray-600 text-center">
              {t('businessCard.message')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN DETAIL PAGE ────────────────────────────────────
export default function AdminBusinessDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale || 'en';
  const businessId = params.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/businesses/${businessId}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // leave null
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">{t('admin.loading')}</span>
      </div>
    );
  }

  if (!data?.business) {
    return (
      <div className="text-center py-32 text-gray-400">
        <p className="text-sm">{t('admin.businessDetail.notFound')}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#364153] underline">{t('admin.businessDetail.goBack')}</button>
      </div>
    );
  }

  const { business, appointments, scheduleExceptions, appointmentStats } = data;
  const info = business.business_info;
  const shop = info?.shop_salon_info;
  const mobile = info?.mobile_service_info;
  const jobSeeker = info?.job_seeker_info;
  const services = (info?.business_services || []).filter(s => s.is_active);
  const businessHours = shop?.business_hours || mobile?.business_hours || [];

  const businessName = info?.business_card_settings?.settings?.businessName || shop?.business_name || mobile?.business_name || business.username || '—';
  const city = shop?.city || mobile?.city || business.user_profile?.city || '';
  const phone = shop?.phone || mobile?.phone || business.user_profile?.phone || '';
  const address = shop?.address || mobile?.address || '';
  const category = info?.business_category;

  const categoryLabel = category === 'salon_owner' ? t('admin.businesses.salonOwner')
    : category === 'mobile_service' ? t('admin.businesses.mobileService')
    : category === 'job_seeker' ? t('admin.businesses.jobSeeker') : '';

  const statusColor = business.account_status === 'suspended' ? 'bg-red-50 text-red-600 border-red-200'
    : business.account_status === 'restricted' ? 'bg-amber-50 text-amber-600 border-amber-200'
    : 'bg-green-50 text-green-600 border-green-200';

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.push(`/${locale}/admin/businesses`)}
          className="p-2 rounded-[5px] hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{businessName}</h1>
          <p className="text-sm text-gray-400">{business.email}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
          {business.account_status || 'active'}
        </span>
      </div>

      {/* Two-column layout: Card on left, details on right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left — Business Card */}
        <div className="lg:w-80 flex-shrink-0">
          <BusinessCard business={business} />

          {/* Quick info below card */}
          <div className="mt-4 bg-white rounded-[5px] border border-gray-200 p-4 space-y-2.5 text-xs">
            <div className="flex items-center gap-2 text-gray-600">
              {category === 'mobile_service' ? <Truck className="w-3.5 h-3.5 text-gray-400" /> : <Store className="w-3.5 h-3.5 text-gray-400" />}
              <span>{categoryLabel}</span>
            </div>
            {city && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{address ? `${address}, ${city}` : city}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{phone}</span>
              </div>
            )}
            {business.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span className="truncate">{business.email}</span>
              </div>
            )}
            {business.username && (
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <span>@{business.username}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('admin.businessDetail.joined')} {new Date(business.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Right — Details */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('admin.businessDetail.totalAppts'), value: appointmentStats.total, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: t('admin.businessDetail.completed'), value: appointmentStats.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
              { label: t('admin.businessDetail.pending'), value: appointmentStats.pending, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: t('admin.businessDetail.cancelled'), value: appointmentStats.cancelled, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-[5px] border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Section Tab Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'appointments', label: t('admin.businessDetail.recentAppointments'), icon: Users },
              { key: 'exceptions', label: t('admin.businessDetail.exceptions'), icon: Palmtree },
              { key: 'hours', label: t('admin.businessDetail.businessHours'), icon: Clock },
              { key: 'services', label: t('admin.businessDetail.services'), icon: DollarSign },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(activeTab === tab.key ? null : tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-[5px] text-sm font-medium border transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-[#364153] text-white border-[#364153] shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Services Table */}
          {activeTab === 'services' && (
            <div className="bg-white rounded-[5px] border border-gray-200 animate-in fade-in duration-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  {t('admin.businessDetail.services')}
                </h2>
              </div>
              {services.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {services.map(s => (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-900">{Number(s.price).toFixed(0)} {s.currency || 'MAD'}</p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 justify-end">
                          <Timer className="w-3 h-3" /> {s.duration_minutes} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-gray-400">{t('admin.businessDetail.noServices')}</p>
              )}
            </div>
          )}

          {/* Business Hours */}
          {activeTab === 'hours' && (
            <div className="bg-white rounded-[5px] border border-gray-200 animate-in fade-in duration-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {t('admin.businessDetail.businessHours')}
                </h2>
              </div>
              {businessHours.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {businessHours.map((day, i) => (
                    <div key={i} className="px-5 py-2.5 flex items-center justify-between">
                      <span className="text-sm text-gray-700 w-28">{t(`admin.businessDetail.day${day.dayOfWeek}`) || DAY_NAMES[day.dayOfWeek]}</span>
                      {day.isOpen ? (
                        <span className="text-sm text-gray-600">{day.openTime} — {day.closeTime}</span>
                      ) : (
                        <span className="text-xs text-red-400 font-medium">{t('admin.businessDetail.closed')}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-gray-400">{t('admin.businessDetail.noHours')}</p>
              )}
            </div>
          )}

          {/* Schedule Exceptions / Holidays */}
          {activeTab === 'exceptions' && (
            <div className="bg-white rounded-[5px] border border-gray-200 animate-in fade-in duration-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Palmtree className="w-4 h-4 text-gray-400" />
                  {t('admin.businessDetail.exceptions')}
                </h2>
              </div>
              {scheduleExceptions.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {scheduleExceptions.map(ex => {
                    const ExIcon = EXCEPTION_ICONS[ex.type] || HelpCircle;
                    const typeColors = {
                      break: 'bg-orange-50 text-orange-600',
                      lunch_break: 'bg-yellow-50 text-yellow-600',
                      closure: 'bg-red-50 text-red-600',
                      holiday: 'bg-green-50 text-green-600',
                      vacation: 'bg-blue-50 text-blue-600',
                      other: 'bg-gray-50 text-gray-500',
                    };
                    const colorClass = typeColors[ex.type] || typeColors.other;

                    return (
                      <div key={ex.id} className="px-5 py-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <ExIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{ex.title}</p>
                          <p className="text-xs text-gray-400">
                            {ex.date}{ex.end_date && ex.end_date !== ex.date ? ` → ${ex.end_date}` : ''}
                            {!ex.is_full_day && ex.start_time && ` · ${ex.start_time} - ${ex.end_time}`}
                            {ex.is_full_day && ` · ${t('admin.businessDetail.fullDay')}`}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${colorClass}`}>
                          {ex.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-gray-400">{t('admin.businessDetail.noExceptions')}</p>
              )}
            </div>
          )}

          {/* Recent Appointments */}
          {activeTab === 'appointments' && (
            <div className="bg-white rounded-[5px] border border-gray-200 animate-in fade-in duration-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  {t('admin.businessDetail.recentAppointments')}
                </h2>
              </div>
              {appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left px-5 py-2.5 font-medium">{t('admin.businessDetail.client')}</th>
                        <th className="text-left px-3 py-2.5 font-medium">{t('admin.businessDetail.service')}</th>
                        <th className="text-left px-3 py-2.5 font-medium">{t('admin.businessDetail.dateTime')}</th>
                        <th className="text-left px-3 py-2.5 font-medium">{t('admin.businessDetail.price')}</th>
                        <th className="text-left px-3 py-2.5 font-medium">{t('admin.businessDetail.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {appointments.map(a => {
                        const statusMap = {
                          confirmed: 'bg-blue-50 text-blue-600',
                          completed: 'bg-green-50 text-green-600',
                          cancelled: 'bg-red-50 text-red-600',
                          pending: 'bg-amber-50 text-amber-600',
                        };
                        return (
                          <tr key={a.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-2.5">
                              <p className="font-medium text-gray-800">{a.client_name}</p>
                              {a.client_phone && <p className="text-xs text-gray-400">{a.client_phone}</p>}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">{a.service}</td>
                            <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                              {new Date(a.start_time).toLocaleDateString()}
                              <span className="text-gray-400 ml-1">{new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-700 font-medium">
                              {a.price ? `${Number(a.price).toFixed(0)} MAD` : '—'}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusMap[a.status] || 'bg-gray-50 text-gray-500'}`}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-gray-400">{t('admin.businessDetail.noAppointments')}</p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
