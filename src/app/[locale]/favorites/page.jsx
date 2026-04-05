'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useLanguage } from '@/contexts/LanguageContext';
import { Heart, ArrowLeft, MapPin, Star, Clock, Scissors, Sparkles, Hand, Palette, Phone, MessageCircle, Navigation, Briefcase, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const ACCENT_COLORS = {
  slate:  { bg: '#364153', light: '#e8ecf0' },
  amber:  { bg: '#D4AF37', light: '#fef9e7' },
  rose:   { bg: '#e11d48', light: '#fff1f2' },
  teal:   { bg: '#0d9488', light: '#f0fdfa' },
  violet: { bg: '#7c3aed', light: '#f5f3ff' },
  blue:   { bg: '#2563eb', light: '#eff6ff' },
};

export default function FavoritesPage() {
  const router = useRouter();
  const { t, locale, isRTL } = useLanguage();
  const { user, isSignedIn, isLoaded } = useAuthUser();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleToggleSidebar = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-home-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-home-sidebar', handleToggleSidebar);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const favKey = `favoriteBusinesses_${user.id}`;
    const favs = JSON.parse(localStorage.getItem(favKey) || '[]');
    if (favs.length === 0) {
      setLoading(false);
      return;
    }

    fetch('/api/businesses/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: favs }),
    })
      .then(res => res.json())
      .then(data => setBusinesses(data.businesses || []))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  const handleRemoveFavorite = (id) => {
    if (!user?.id) return;
    const favKey = `favoriteBusinesses_${user.id}`;
    const favs = JSON.parse(localStorage.getItem(favKey) || '[]');
    const updated = favs.filter(fId => fId !== id);
    localStorage.setItem(favKey, JSON.stringify(updated));
    setRemovedIds(prev => new Set([...prev, id]));
    setConfirmRemoveId(null);
  };

  const visibleBusinesses = businesses.filter(b => !removedIds.has(b.id));

  return (
    <div className={`min-h-screen bg-white ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => router.back()}
            className="hidden sd:flex w-9 h-9 rounded-xl bg-gray-100 items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft className={`w-4.5 h-4.5 text-gray-700 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">{t('favorites.title')}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : !isSignedIn ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Heart className="w-9 h-9 text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">{t('favorites.signInTitle') || 'Sign in to see favorites'}</h2>
            <p className="text-[14px] text-gray-400 max-w-xs">{t('favorites.signInDesc') || 'Sign in to save and view your favorite businesses.'}</p>
            <div className="flex gap-3 mt-6">
              <Link
                href={`/${locale}/auth/user/sign-in`}
                className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-[#0F172A] transition-all hover:border-[#D4AF37]"
              >
                {t('login')}
              </Link>
              <Link
                href={`/${locale}/auth/user/sign-up`}
                className="rounded-full bg-[#0F172A] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#1E293B]"
              >
                {t('signUp')}
              </Link>
            </div>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Heart className="w-9 h-9 text-red-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">{t('favorites.errorTitle') || 'Something went wrong'}</h2>
            <p className="text-[14px] text-gray-400 max-w-xs">{t('favorites.errorDesc') || 'Could not load your favorites. Please try again.'}</p>
            <button onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-[14px] font-semibold rounded-xl hover:bg-gray-800 transition-colors">
              {t('favorites.retry') || 'Retry'}
            </button>
          </div>
        ) : visibleBusinesses.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Heart className="w-9 h-9 text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">{t('favorites.empty')}</h2>
            <p className="text-[14px] text-gray-400 max-w-xs">{t('favorites.emptyDesc')}</p>
            <button onClick={() => router.push(`/${locale}`)}
              className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-[14px] font-semibold rounded-xl hover:bg-gray-800 transition-colors">
              {t('favorites.explore')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleBusinesses.map(business => {
              const accent = ACCENT_COLORS[business.accentColor] || ACCENT_COLORS.slate;
              const directionsUrl = business.latitude && business.longitude
                ? `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`
                : business.city
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.city)}`
                  : null;

              return (
                <div key={business.id}
                  onClick={() => router.push(`/${locale}/b/${business.id}`)}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all duration-200 cursor-pointer group">

                  {/* Top row: avatar + info + heart */}
                  <div className="flex items-start gap-3">
                    {/* Profile photo */}
                    {business.avatarUrl ? (
                      <img src={business.avatarUrl} alt={business.businessName}
                        className="w-12 h-12 rounded-full object-cover bg-gray-100 shrink-0 ring-2 ring-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center ring-2 ring-gray-100"
                        style={{ backgroundColor: accent.light }}>
                        <Scissors className="w-5 h-5" style={{ color: accent.bg }} />
                      </div>
                    )}

                    {/* Name & type */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-gray-900 truncate leading-tight">{business.businessName}</h3>
                      <p className="text-[12px] text-gray-400 capitalize mt-0.5">
                        {t(`home.type.${business.professionalType}`) || business.professionalType?.replace(/_/g, ' ')}
                      </p>
                    </div>

                    {/* Remove favorite */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(business.id); }}
                      className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0 -mt-0.5">
                      <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                    </button>
                  </div>

                  {/* Meta chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {business.city && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 rounded-full px-2 py-0.5">
                        <MapPin className="w-3 h-3" /> {business.city}
                      </span>
                    )}
                    {business.showRating && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                        <Star className="w-3 h-3 fill-amber-400" /> 5.0
                      </span>
                    )}
                    {business.showResponseTime && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                        <Clock className="w-3 h-3" /> {t('businessCard.fastReply')}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50" onClick={e => e.stopPropagation()}>
                    {business.showBookingButton !== false && (
                      <button
                        onClick={() => router.push(`/${locale}/b/${business.id}`)}
                        className="flex-1 py-2 text-[12px] font-bold text-white rounded-xl hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: accent.bg }}>
                        {t('businessCard.bookNow')}
                      </button>
                    )}
                    {business.phone && (
                      <a href={`tel:${business.phone}`}
                        className="w-9 h-9 bg-blue-50 hover:bg-blue-100 flex items-center justify-center rounded-xl transition-colors">
                        <Phone className="w-4 h-4 text-blue-600" />
                      </a>
                    )}
                    {business.phone && (
                      <a href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="w-9 h-9 bg-green-50 hover:bg-green-100 flex items-center justify-center rounded-xl transition-colors">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </a>
                    )}
                    {directionsUrl && (
                      <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
                        className="w-9 h-9 bg-gray-50 hover:bg-gray-100 flex items-center justify-center rounded-xl transition-colors">
                        <Navigation className="w-4 h-4 text-gray-500" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Remove confirmation modal */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setConfirmRemoveId(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 mb-1">{t('favorites.removeTitle')}</h3>
            <p className="text-[13px] text-gray-500 mb-5">{t('favorites.removeDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                {t('favorites.removeCancel')}
              </button>
              <button
                onClick={() => handleRemoveFavorite(confirmRemoveId)}
                className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">
                {t('favorites.removeConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
