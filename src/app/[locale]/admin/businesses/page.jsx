'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Building2, Loader2, Search, MapPin, User, Store, Truck, Briefcase,
  ChevronRight,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

const CATEGORY_ICONS = {
  salon_owner: Store,
  mobile_service: Truck,
  job_seeker: Briefcase,
};

const CATEGORY_COLORS = {
  salon_owner: 'bg-blue-50 text-blue-600',
  mobile_service: 'bg-emerald-50 text-emerald-600',
  job_seeker: 'bg-amber-50 text-amber-600',
};

export default function AdminBusinessesPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale || 'en';
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.set('search', search.trim());
      if (categoryFilter) p.set('category', categoryFilter);
      const res = await fetch(`/api/admin/businesses?${p}`);
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
      }
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const getName = (b) => {
    const info = b.business_info;
    const settings = info?.business_card_settings?.settings || {};
    if (settings.businessName) return settings.businessName;
    const shop = info?.shop_salon_info;
    const mobile = info?.mobile_service_info;
    return shop?.business_name || mobile?.business_name || b.username || b.email || '—';
  };

  const getCity = (b) => {
    const info = b.business_info;
    return info?.shop_salon_info?.city || info?.mobile_service_info?.city || b.user_profile?.city || '';
  };

  const getAvatar = (b) => {
    const settings = b.business_info?.business_card_settings?.settings;
    return settings?.avatarUrl || b.user_profile?.profile_image_url || null;
  };

  const getCategoryKey = (cat) => {
    if (cat === 'salon_owner') return 'admin.businesses.salonOwner';
    if (cat === 'mobile_service') return 'admin.businesses.mobileService';
    if (cat === 'job_seeker') return 'admin.businesses.jobSeeker';
    return '';
  };

  const getProfessionalType = (type) => {
    if (!type) return '';
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Building2 className="w-7 h-7 text-[#364153]" />
          {t('admin.businesses.title')}
        </h1>
        <p className="text-gray-500 mt-1">{t('admin.businesses.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[5px] border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.businesses.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#364153]/30"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#364153]/30 bg-white"
          >
            <option value="">{t('admin.businesses.allCategories')}</option>
            <option value="salon_owner">{t('admin.businesses.salonOwner')}</option>
            <option value="mobile_service">{t('admin.businesses.mobileService')}</option>
            <option value="job_seeker">{t('admin.businesses.jobSeeker')}</option>
          </select>
        </div>
      </div>

      {/* Business List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t('admin.loading')}</span>
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">{t('admin.businesses.noResults')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[5px] border border-gray-200 divide-y divide-gray-100">
          {businesses.map((b) => {
            const info = b.business_info;
            const category = info?.business_category;
            const CatIcon = CATEGORY_ICONS[category] || Store;
            const catColorClass = CATEGORY_COLORS[category] || 'bg-gray-50 text-gray-600';
            const statusColor = b.account_status === 'suspended' ? 'bg-red-50 text-red-600 border-red-200'
              : b.account_status === 'restricted' ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-green-50 text-green-600 border-green-200';
            const avatar = getAvatar(b);
            const city = getCity(b);

            return (
              <button
                key={b.id}
                onClick={() => router.push(`/${locale}/admin/businesses/${b.id}`)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
              >
                {/* Avatar */}
                {avatar ? (
                  <img src={avatar} alt="" className="w-11 h-11 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{getName(b)}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {getProfessionalType(info?.professional_type)}
                    {city && <> · <MapPin className="w-3 h-3 inline -mt-px" /> {city}</>}
                  </p>
                </div>

                {/* Category badge */}
                <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${catColorClass}`}>
                  <CatIcon className="w-3.5 h-3.5" />
                  {t(getCategoryKey(category))}
                </span>

                {/* Status badge */}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor}`}>
                  {b.account_status || 'active'}
                </span>

                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
