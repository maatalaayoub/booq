'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Building2, Loader2, Search, User, Eye, MapPin,
  ExternalLink, Globe, X,
} from 'lucide-react';
import { useParams } from 'next/navigation';

export default function AdminBusinessesPage() {
  const { t } = useLanguage();
  const params = useParams();
  const locale = params.locale || 'en';
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewCard, setViewCard] = useState(null); // business card settings to preview

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
    const shop = info?.shop_salon_info;
    const mobile = info?.mobile_service_info;
    const bizName = shop?.business_name || mobile?.business_name;
    if (bizName) return bizName;
    const p = b.user_profile;
    if (p?.first_name || p?.last_name) return `${p.first_name || ''} ${p.last_name || ''}`.trim();
    return b.username || b.email || '—';
  };

  const getLocation = (b) => {
    const info = b.business_info;
    const shop = info?.shop_salon_info;
    const mobile = info?.mobile_service_info;
    return shop?.city || mobile?.city || b.user_profile?.city || '—';
  };

  const getCardSettings = (b) => {
    return b.business_info?.business_card_settings?.settings || null;
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

      {/* Businesses List */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {businesses.map((b) => {
            const info = b.business_info;
            const cardSettings = getCardSettings(b);
            const statusColor = b.account_status === 'active' ? 'bg-green-50 text-green-700' : b.account_status === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700';

            return (
              <div key={b.id} className="bg-white rounded-[5px] border border-gray-200 overflow-hidden">
                {/* Cover area */}
                <div className="h-24 bg-gradient-to-r from-gray-100 to-gray-200 relative">
                  {cardSettings?.coverGallery?.[0] && (
                    <img src={cardSettings.coverGallery[0]} alt="" className="w-full h-full object-cover" />
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
                    {b.account_status}
                  </span>
                </div>

                {/* Profile */}
                <div className="px-4 pb-4 -mt-6 relative">
                  <div className="flex items-end gap-3 mb-3">
                    {b.user_profile?.profile_image_url || cardSettings?.avatarUrl ? (
                      <img
                        src={cardSettings?.avatarUrl || b.user_profile?.profile_image_url}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-white shadow flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{getName(b)}</p>
                      <p className="text-xs text-gray-400">{info?.professional_type} &bull; {info?.business_category?.replace('_', ' ')}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {getLocation(b)}
                    </div>
                    {b.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Globe className="w-3 h-3 text-gray-400" />
                        {b.email}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    {cardSettings && (
                      <button
                        onClick={() => setViewCard({ name: getName(b), settings: cardSettings })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#364153] border border-gray-200 rounded-[5px] hover:bg-gray-50 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        {t('admin.businesses.viewCard')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Business Card Preview Modal */}
      {viewCard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{viewCard.name} — {t('admin.businesses.businessCard')}</h3>
              <button onClick={() => setViewCard(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {viewCard.settings.coverGallery?.length > 0 && (
                <div className="rounded-lg overflow-hidden h-40">
                  <img src={viewCard.settings.coverGallery[0]} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {viewCard.settings.avatarUrl && (
                <div className="flex items-center gap-3">
                  <img src={viewCard.settings.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                  <div>
                    <p className="font-semibold text-gray-900">{viewCard.settings.businessName || viewCard.name}</p>
                    {viewCard.settings.bio && <p className="text-xs text-gray-500 mt-1">{viewCard.settings.bio}</p>}
                  </div>
                </div>
              )}
              {viewCard.settings.businessName && !viewCard.settings.avatarUrl && (
                <p className="font-semibold text-gray-900 text-lg">{viewCard.settings.businessName}</p>
              )}
              {viewCard.settings.bio && !viewCard.settings.avatarUrl && (
                <p className="text-sm text-gray-600">{viewCard.settings.bio}</p>
              )}
              <div className="text-xs text-gray-400 space-y-1">
                <p><strong>Theme:</strong> {viewCard.settings.theme || 'default'}</p>
                <p><strong>Visible:</strong> {viewCard.settings.isVisible ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
