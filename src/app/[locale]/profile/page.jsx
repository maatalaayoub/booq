'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRole } from '@/hooks/useRole';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ProfileHeader, EditProfileDialog, ProfilePageNav } from '@/components/profile';
import Sidebar from '@/components/Sidebar';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale || 'en';
  const viewingUser = searchParams.get('user'); // Username or ID of user to view
  const { user, isLoaded: isUserLoaded, isSignedIn } = useAuthUser();
  const { isBusiness, isLoaded: isRoleLoaded } = useRole();
  const { t, isRTL } = useLanguage();

  const isLoaded = isUserLoaded && isRoleLoaded;
  const isViewingOther = !!viewingUser;
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [viewedUserData, setViewedUserData] = useState(null);
  const [viewedUserLoading, setViewedUserLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    coverImage: null,
    coverPosition: 50,
    bio: '',
    location: '',
    socialLinks: {}
  });

  // Use shared hook for own profile
  const { profile: ownProfile, refetch: refreshProfile } = useUserProfile({ refetchOnProfileUpdate: true });

  // Auto-open the edit dialog once when the user is missing essential info
  // (e.g. just signed up via Google OAuth and never set their name)
  const autoPromptedRef = useRef(false);
  useEffect(() => {
    if (isViewingOther) return;
    if (!ownProfile || autoPromptedRef.current) return;
    const missingEssentials =
      !ownProfile.firstName ||
      !ownProfile.lastName ||
      !ownProfile.phone ||
      !ownProfile.address ||
      !ownProfile.city;
    if (missingEssentials) {
      autoPromptedRef.current = true;
      setIsEditProfileOpen(true);
    }
  }, [ownProfile, isViewingOther]);

  // Sync own profile data to local state
  useEffect(() => {
    if (isViewingOther || !ownProfile) return;
    setProfileData(prev => ({
      ...prev,
      coverImage: ownProfile.coverImageUrl || null,
      coverPosition: ownProfile.coverImagePosition ?? 50,
      location: ownProfile.city || '',
    }));
  }, [ownProfile, isViewingOther]);

  // Fetch viewed user's profile if viewing another user
  useEffect(() => {
    if (!viewingUser) return;
    
    setViewedUserLoading(true);
    fetch(`/api/user-profile/${viewingUser}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        setViewedUserData(data);
        setProfileData(prev => ({
          ...prev,
          coverImage: data.coverImageUrl || null,
          coverPosition: data.coverImagePosition ?? 50,
          location: data.city || '',
        }));
      })
      .catch((e) => {
        console.error('Failed to fetch viewed user profile:', e);
        setViewedUserData(null);
      })
      .finally(() => {
        setViewedUserLoading(false);
      });
  }, [viewingUser]);

  // Redirect if not signed in (only when viewing own profile), or redirect business users to their profile
  useEffect(() => {
    if (isViewingOther) return; // Don't redirect when viewing other users
    if (isLoaded) {
      if (!isSignedIn) {
        router.push(`/${locale}/auth/user/sign-in`);
      } else if (isBusiness) {
        router.push(`/${locale}/business/profile`);
      }
    }
  }, [isLoaded, isSignedIn, isBusiness, router, locale, isViewingOther]);

  // Listen for bottom navigation sidebar toggle
  useEffect(() => {
    const handleToggleSidebar = () => {
      setIsSidebarOpen(prev => !prev);
    };
    window.addEventListener('toggle-home-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('toggle-home-sidebar', handleToggleSidebar);
  }, []);

  // Show loading state
  if (!isLoaded || (isViewingOther && viewedUserLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        {/* Actual nav */}
        <ProfilePageNav
          locale={locale}
          onMenuClick={() => {}}
          isRTL={isRTL}
          t={t}
        />
        <div className="animate-pulse">
          {/* Cover photo skeleton */}
          <div className="h-48 sm:h-64 bg-gray-200" />
          {/* Avatar + info skeleton */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-full bg-gray-300 border-4 border-white mx-auto sm:mx-0" />
              <div className="pb-2 flex-1 w-full sm:w-auto">
                <div className="h-6 w-40 max-w-full bg-gray-200 rounded mb-2 mx-auto sm:mx-0" />
                <div className="h-4 w-28 max-w-full bg-gray-100 rounded mx-auto sm:mx-0" />
              </div>
              <div className="h-9 w-28 max-w-full bg-gray-200 rounded-lg mx-auto sm:mx-0" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If viewing other user but data not found
  if (isViewingOther && !viewedUserData) {
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
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {t('profile.userNotFound') || 'User not found'}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {t('profile.userNotFoundDesc') || 'This user may have been deleted or does not exist.'}
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-[#244C70] text-white rounded-lg hover:bg-[#1a3a56] transition-colors"
            >
              {t('profile.goBack') || 'Go back'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // When viewing own profile - check auth
  if (!isViewingOther && (!isSignedIn || isBusiness)) {
    return null;
  }

  const handleEditProfile = () => {
    setIsEditProfileOpen(true);
  };

  // Create a mock user object for viewed users
  const displayUser = isViewingOther ? {
    firstName: viewedUserData.firstName || '',
    lastName: viewedUserData.lastName || '',
    username: viewedUserData.username,
    imageUrl: viewedUserData.profileImageUrl,
    hasImage: !!viewedUserData.profileImageUrl,
  } : {
    ...user,
    // Prefer DB profile names (source of truth, updated after edits) over auth metadata
    firstName: ownProfile?.firstName || user?.firstName || '',
    lastName: ownProfile?.lastName || user?.lastName || '',
    username: ownProfile?.username || user?.username,
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Floating adaptive nav – fixed, overlays the cover photo */}
      <ProfilePageNav
        locale={locale}
        onMenuClick={() => setIsSidebarOpen(true)}
        isRTL={isRTL}
        t={t}
      />

      {/* Profile Header with Cover & Avatar */}
      <ProfileHeader
        user={displayUser}
        coverImage={profileData.coverImage}
        bio={profileData.bio}
        location={profileData.location}
        socialLinks={profileData.socialLinks}
        isOwnProfile={!isViewingOther}
        isBusinessProfile={false}
        profileImageUrl={isViewingOther ? viewedUserData?.profileImageUrl : null}
        onEditProfile={isViewingOther ? undefined : handleEditProfile}
        onCoverChange={isViewingOther ? undefined : (url) => setProfileData(prev => ({ ...prev, coverImage: url }))}
        coverPosition={profileData.coverPosition ?? 50}
        onCoverPositionChange={isViewingOther ? undefined : (pos) => setProfileData(prev => ({ ...prev, coverPosition: pos }))}
      />

      {/* Edit Profile Dialog - only for own profile */}
      {!isViewingOther && (
        <EditProfileDialog 
          isOpen={isEditProfileOpen}
          initialProfile={ownProfile}
          onClose={() => {
            setIsEditProfileOpen(false);
            refreshProfile();
          }} 
        />
      )}
    </div>
  );
}
