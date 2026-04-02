'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
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
  const { user, isSignedIn, isLoaded } = useUser();
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
          <div className="grid grid-cols-1 sd:grid-cols-2 gap-4">
            {visibleBusinesses.map(business => {
              const accent = ACCENT_COLORS[business.accentColor] || ACCENT_COLORS.slate;
              const coverUrl = business.showCoverPhoto && business.coverGallery?.length > 0
                ? business.coverGallery[0]
                : null;
              const directionsUrl = business.latitude && business.longitude
                ? `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`
                : business.city
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.city)}`
                  : null;
              const lowestPrice = business.services?.length > 0
                ? Math.min(...business.services.map(s => s.price))
                : null;

              return (
                <div key={business.id}
                  onClick={() => router.push(`/${locale}/b/${business.id}`)}
                  className="bg-white rounded-[7px] border border-gray-200 overflow-hidden hover:-translate-y-1 transition-all duration-200 cursor-pointer group">

                  {/* Cover image */}
                  <div className="relative h-36 sd:h-44 overflow-hidden">
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent.bg}22 0%, ${accent.bg}55 100%)` }}>
                        <div className="w-full h-full flex items-center justify-center">
                          <Scissors className="w-8 h-8 text-gray-300" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Remove favorite */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(business.id); }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm">
                      <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                    </button>

                    {/* Rating badge */}
                    {business.showRating && (
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-bold text-gray-800">5.0</span>
                      </div>
                    )}

                    {/* Business name on cover */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end gap-2.5">
                      {business.showProfile && business.avatarUrl && (
                        <img src={business.avatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-white object-cover shrink-0 shadow" />
                      )}
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-white truncate drop-shadow-sm">{business.businessName}</h3>
                        <p className="text-[11px] text-white/80 capitalize">{t(`home.type.${business.professionalType}`) || business.professionalType?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-3.5">
                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-[12px] text-gray-500">
                      {business.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" /> {business.city}
                        </span>
                      )}
                      {business.showResponseTime && (
                        <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                          <Clock className="w-3.5 h-3.5" /> {t('businessCard.fastReply')}
                        </span>
                      )}
                    </div>

                    {/* Services */}
                    {business.showServices && business.services?.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1">
                        {business.services.slice(0, 2).map(s => (
                          <div key={s.name} className="flex justify-between text-[12px]">
                            <span className="text-gray-600 truncate mr-3">{s.name}</span>
                            {business.showPrices && <span className="font-semibold text-gray-800 whitespace-nowrap">{s.price} {s.currency}</span>}
                          </div>
                        ))}
                        {business.totalServices > 2 && (
                          <p className="text-[11px] font-medium" style={{ color: accent.bg }}>
                            +{business.totalServices - 2} {t('home.moreServices')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {(() => {
                      const hasBooking = business.showBookingButton !== false;
                      const hasDirections = business.showGetDirections;
                      const hasCall = business.phone;
                      const hasMsg = business.phone;
                      const hasMain = hasBooking || hasDirections;
                      const contactOnly = !hasMain && (hasCall || hasMsg);

                      return (
                        <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                          {/* Booking button */}
                          {hasBooking && (
                            <button
                              onClick={() => router.push(`/${locale}/b/${business.id}`)}
                              className="flex-1 py-2 text-[12px] font-bold text-white rounded-[5px] hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: accent.bg }}>
                              {t('businessCard.bookNow')}
                            </button>
                          )}
                          {/* Get Directions button */}
                          {hasDirections && directionsUrl && (
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex-1 py-2 text-[12px] font-bold rounded-[5px] transition-opacity hover:opacity-90 flex items-center justify-center gap-1 ${
                                hasBooking ? 'border border-gray-400 text-gray-600' : 'text-white'
                              }`}
                              style={!hasBooking ? { backgroundColor: accent.bg } : undefined}>
                              <Navigation className="w-3 h-3" />
                              {t('businessCard.getDirections')}
                            </a>
                          )}
                          {/* Call */}
                          {hasCall && (
                            <a
                              href={`tel:${business.phone}`}
                              className={`flex items-center justify-center rounded-lg transition-colors ${
                                contactOnly
                                  ? 'flex-1 gap-1 py-2 text-[12px] font-bold text-white hover:opacity-90'
                                  : 'w-10 h-10 bg-blue-50 hover:bg-blue-100'
                              }`}
                              style={contactOnly ? { backgroundColor: accent.bg } : undefined}>
                              <Phone className={`w-4 h-4 ${contactOnly ? '' : 'text-blue-600'}`} />
                              {contactOnly && t('businessCard.call')}
                            </a>
                          )}
                          {/* Message */}
                          {hasMsg && (
                            <a
                              href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-center rounded-lg transition-colors ${
                                contactOnly
                                  ? 'flex-1 gap-1 py-2 text-[12px] font-bold text-white hover:opacity-90'
                                  : 'w-10 h-10 bg-green-50 hover:bg-green-100'
                              }`}
                              style={contactOnly ? { backgroundColor: accent.bg } : undefined}>
                              <MessageCircle className={`w-4 h-4 ${contactOnly ? '' : 'text-green-600'}`} />
                              {contactOnly && t('businessCard.message')}
                            </a>
                          )}
                          {/* Directions icon (when not a main button) */}
                          {!hasDirections && directionsUrl && (
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-10 h-10 bg-gray-50 hover:bg-gray-100 flex items-center justify-center rounded-lg transition-colors">
                              <Navigation className="w-4 h-4 text-gray-500" />
                            </a>
                          )}
                        </div>
                      );
                    })()}
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
