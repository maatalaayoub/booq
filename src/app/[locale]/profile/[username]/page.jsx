'use client';

import { useState, useEffect } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProfileHeader, ProfilePageNav } from '@/components/profile';
import Sidebar from '@/components/Sidebar';
import { ArrowLeft, User, Building2, Calendar, MapPin, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ViewUserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale || 'en';
  const username = params.username;
  const { user: currentUser, isLoaded: isUserLoaded } = useAuthUser();
  const { t, isRTL } = useLanguage();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the user's profile data
  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/user-profile/${username}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('User not found');
          } else {
            setError('Failed to load profile');
          }
          return;
        }
        const data = await res.json();
        setProfileUser(data);
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  // Listen for bottom navigation sidebar toggle
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsSidebarOpen(prev => !prev);
    };
    window.addEventListener('toggle-home-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-home-sidebar', handleToggleSidebar);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <ProfilePageNav
          locale={locale}
          onMenuClick={() => {}}
          isRTL={isRTL}
          t={t}
        />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#244C70]" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <ProfilePageNav
          locale={locale}
          onMenuClick={() => setIsSidebarOpen(true)}
          isRTL={isRTL}
          t={t}
        />
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex flex-col items-center justify-center pt-32 px-4">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error === 'User not found' ? t('profile.userNotFound') || 'User not found' : t('profile.loadError') || 'Failed to load profile'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {error === 'User not found' 
              ? t('profile.userNotFoundDesc') || 'This user may have been deleted or does not exist.'
              : t('profile.loadErrorDesc') || 'Please try again later.'}
          </p>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-[#244C70] text-white rounded-lg hover:bg-[#1a3a56] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('profile.goBack') || 'Go back'}
          </button>
        </div>
      </div>
    );
  }

  const displayName = profileUser.firstName && profileUser.lastName 
    ? `${profileUser.firstName} ${profileUser.lastName}`.trim()
    : profileUser.username || 'User';

  const joinedDate = profileUser.joinedAt 
    ? new Date(profileUser.joinedAt).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Navigation */}
      <ProfilePageNav
        locale={locale}
        onMenuClick={() => setIsSidebarOpen(true)}
        isRTL={isRTL}
        t={t}
      />

      {/* Cover Photo */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-r from-[#244C70] to-[#3a6d99]">
        {profileUser.coverImageUrl && (
          <img
            src={profileUser.coverImageUrl}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `center ${profileUser.coverImagePosition || 50}%` }}
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 relative z-10 pb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
          {/* Avatar */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
            {profileUser.profileImageUrl ? (
              <img
                src={profileUser.profileImageUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#244C70] to-[#3a6d99] flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left pb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {displayName}
            </h1>
            {profileUser.username && (
              <p className="text-gray-500">@{profileUser.username}</p>
            )}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-gray-500">
              {/* Role Badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                profileUser.role === 'business' 
                  ? 'bg-[#244C70]/10 text-[#244C70]' 
                  : profileUser.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                {profileUser.role === 'business' ? (
                  <Building2 className="w-3 h-3" />
                ) : (
                  <User className="w-3 h-3" />
                )}
                {profileUser.role === 'business' ? t('profile.business') || 'Business' : 
                 profileUser.role === 'admin' ? t('profile.admin') || 'Admin' : 
                 t('profile.user') || 'User'}
              </span>

              {/* Location */}
              {profileUser.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {profileUser.city}
                </span>
              )}

              {/* Joined Date */}
              {joinedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {t('profile.joined') || 'Joined'} {joinedDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Business Info Card */}
        {profileUser.role === 'business' && profileUser.business && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#244C70]" />
              {t('profile.businessInfo') || 'Business Information'}
            </h2>
            <div className="space-y-2 text-sm text-gray-600">
              {profileUser.business.business_name && (
                <p><span className="font-medium">{t('profile.businessName') || 'Business Name'}:</span> {profileUser.business.business_name}</p>
              )}
              {profileUser.business.specialty && (
                <p><span className="font-medium">{t('profile.specialty') || 'Specialty'}:</span> {profileUser.business.specialty}</p>
              )}
              {(profileUser.business.address || profileUser.business.city) && (
                <p className="flex items-start gap-1">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  {[profileUser.business.address, profileUser.business.city].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
