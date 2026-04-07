'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, Link as LinkIcon, Instagram, Twitter, Facebook, Linkedin, Edit3, BadgeCheck, Settings, Loader2, Move, Trash2, ChevronDown } from 'lucide-react';
// Account settings handled in-app
import { useLanguage } from '@/contexts/LanguageContext';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';

export default function ProfileHeader({ 
  user, 
  coverImage = null,
  coverPosition: coverPositionProp = 50,
  isOwnProfile = true,
  socialLinks = {},
  location = '',
  bio = '',
  isBusinessProfile = false,
  businessName = '',
  profileImageUrl = null,
  onEditProfile,
  onEditCover,
  onEditProfilePicture,
  onCoverChange,
  onAvatarChange,
  onCoverPositionChange,
}) {
  const { t, isRTL } = useLanguage();
  const { isVerified } = useVerificationStatus();
  const [isHoveringProfile, setIsHoveringProfile] = useState(false);
  const [localCoverImage, setLocalCoverImage] = useState(coverImage);
  const [localProfileImage, setLocalProfileImage] = useState(profileImageUrl);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [coverPosition, setCoverPosition] = useState(coverPositionProp ?? 50);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [savedPosition, setSavedPosition] = useState(coverPositionProp ?? 50);
  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const coverDivRef = useRef(null);
  const dragStartRef = useRef(null);
  const coverMenuRef = useRef(null);

  // Sync cover image when prop changes (e.g. after page fetches it from DB)
  useEffect(() => {
    if (coverImage !== undefined) setLocalCoverImage(coverImage);
  }, [coverImage]);

  // Sync profile image when prop changes
  useEffect(() => {
    if (profileImageUrl !== undefined) setLocalProfileImage(profileImageUrl);
  }, [profileImageUrl]);

  // Sync position from prop
  useEffect(() => {
    setCoverPosition(coverPositionProp ?? 50);
    setSavedPosition(coverPositionProp ?? 50);
  }, [coverPositionProp]);

  // Close cover menu on outside click
  useEffect(() => {
    if (!showCoverMenu) return;
    const handler = (e) => {
      if (coverMenuRef.current && !coverMenuRef.current.contains(e.target)) {
        setShowCoverMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCoverMenu]);

  // Attach non-passive touchmove to document to block page scroll during reposition
  useEffect(() => {
    if (!isRepositioning) return;
    const prevent = (e) => e.preventDefault();
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent);
  }, [isRepositioning]);

  // ── Reposition handlers ──────────────────────────────────────────
  const startDrag = useCallback((clientY) => {
    dragStartRef.current = { y: clientY, position: coverPosition };
  }, [coverPosition]);

  const onDrag = useCallback((clientY) => {
    if (!dragStartRef.current) return;
    const delta = clientY - dragStartRef.current.y;
    const containerH = coverDivRef.current?.clientHeight || 200;
    // Negate delta: dragging up (negative delta) should pan the image up (higher %)
    const pct = Math.max(0, Math.min(100,
      dragStartRef.current.position - (delta / containerH) * 100
    ));
    setCoverPosition(pct);
  }, []);

  const stopDrag = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  const cancelReposition = useCallback(() => {
    setCoverPosition(savedPosition);
    setIsRepositioning(false);
    dragStartRef.current = null;
  }, [savedPosition]);

  const savePosition = useCallback(async () => {
    const rounded = Math.round(coverPosition);
    setIsRepositioning(false);
    setSavedPosition(rounded);
    dragStartRef.current = null;
    try {
      await fetch('/api/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImagePosition: rounded }),
      });
      onCoverPositionChange?.(rounded);
      window.dispatchEvent(new CustomEvent('profile-photo-updated'));
    } catch (err) {
      console.error('Failed to save cover position', err);
    }
  }, [coverPosition, onCoverPositionChange]);

  // ── Delete cover ─────────────────────────────────────────────────
  const handleDeleteCover = useCallback(async () => {
    setShowCoverMenu(false);
    setLocalCoverImage(null);
    setCoverPosition(50);
    setSavedPosition(50);
    try {
      await fetch('/api/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: null, coverImagePosition: 50 }),
      });
      onCoverChange?.(null);
      onCoverPositionChange?.(50);
      window.dispatchEvent(new CustomEvent('profile-photo-updated'));
    } catch (err) {
      console.error('Failed to delete cover', err);
    }
  }, [onCoverChange, onCoverPositionChange]);

  // ─────────────────────────────────────────────────────────────────
  const handleCoverChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'cover');
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Non-JSON response');
      const data = await res.json();
      if (data.url) {
        setLocalCoverImage(data.url);
        onCoverChange?.(data.url);
      }
    } catch (err) {
      console.error('Cover upload failed', err);
    } finally {
      setIsUploadingCover(false);
    }
  }, [onCoverChange]);

  const handleAvatarChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsUploadingAvatar(true);
    try {
      // Update profile image in our DB
      if (user?.setProfileImage) {
        await user.setProfileImage({ file });
      }
      // Also store in our DB
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const ct2 = res.headers.get('content-type') || '';
      if (!ct2.includes('application/json')) throw new Error('Non-JSON response');
      const data = await res.json();
      if (data.url) {
        setLocalProfileImage(data.url);
        // Notify header to refresh avatar
        window.dispatchEvent(new CustomEvent('profile-photo-updated'));
      }
      onAvatarChange?.();
    } catch (err) {
      console.error('Avatar upload failed', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [user, onAvatarChange]);

  const socialIcons = {
    instagram: Instagram,
    twitter: Twitter,
    facebook: Facebook,
    linkedin: Linkedin,
    website: LinkIcon,
  };

  const displayName = isBusinessProfile && businessName 
    ? businessName 
    : (`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User');

  return (
    <div className="relative">
      {/* Cover Photo */}
      <div ref={coverDivRef} className="relative h-44 sm:h-56 md:h-64 lg:h-72 w-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 overflow-hidden border-b border-gray-300">

        {/* Placeholder logo — shown only when no cover is uploaded */}
        {!localCoverImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/images/booka(dark).png"
              alt="Booka.ma"
              className="h-16 sm:h-20 md:h-24 w-auto opacity-20"
              style={{ filter: 'grayscale(1)' }}
            />
          </div>
        )}

        {localCoverImage && (
          <img
            src={localCoverImage}
            alt=""
            aria-hidden="true"
            className={`w-full h-full object-cover select-none ${isRepositioning ? 'cursor-move' : ''}`}
            style={{ objectPosition: `center ${coverPosition}%` }}
            draggable={false}
            onError={() => setLocalCoverImage(null)}
          />
        )}

        {/* Bottom fade — only needed when a cover image is shown */}
        {localCoverImage && !isRepositioning && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        )}

        {/* Reposition instruction bar (top) */}
        {isRepositioning && (
          <div className="absolute top-0 inset-x-0 flex items-center justify-center gap-2 py-2 bg-black/70 text-white text-xs font-medium pointer-events-none">
            <Move className="w-3.5 h-3.5" />
            <span>{t('profile.dragToReposition')}</span>
          </div>
        )}

        {/* Reposition drag overlay */}
        {isRepositioning && (
          <div
            className="absolute inset-0 cursor-move"
            onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientY); }}
            onMouseMove={(e) => { if (e.buttons === 1) onDrag(e.clientY); }}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onTouchStart={(e) => { startDrag(e.touches[0].clientY); }}
            onTouchMove={(e) => { onDrag(e.touches[0].clientY); }}
            onTouchEnd={stopDrag}
          />
        )}

        {/* Cover upload loading overlay */}
        {isUploadingCover && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Reposition Save / Cancel bar (bottom) */}
        {isRepositioning && (
          <div className={`absolute bottom-3 ${isRTL ? 'left-3' : 'right-3'} flex items-center gap-2 z-10`}>
            <button
              onClick={cancelReposition}
              className="pointer-events-auto px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20 transition-all"
            >
              {t('profile.cancel')}
            </button>
            <button
              onClick={savePosition}
              className="pointer-events-auto px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-900 bg-white/90 hover:bg-white border border-gray-300 transition-all"
            >
              {t('profile.savePosition')}
            </button>
          </div>
        )}

        {/* Cover menu button — hidden while repositioning */}
        {isOwnProfile && !isRepositioning && (
          <div ref={coverMenuRef} className={`absolute bottom-3 ${isRTL ? 'left-3' : 'right-3'}`}>
            <button
              onClick={() => setShowCoverMenu(v => !v)}
              disabled={isUploadingCover}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/70 disabled:opacity-50 backdrop-blur-sm rounded-lg text-xs font-medium text-white transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('profile.editCover')}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showCoverMenu && (
              <div className={`absolute bottom-full mb-1.5 ${isRTL ? 'left-0' : 'right-0'} min-w-[160px] bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20`}>
                <button
                  onClick={() => { setShowCoverMenu(false); coverInputRef.current?.click(); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Camera className="w-4 h-4 text-gray-500" />
                  {t('profile.changePhoto')}
                </button>
                {localCoverImage && (
                  <button
                    onClick={() => { setShowCoverMenu(false); setIsRepositioning(true); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Move className="w-4 h-4 text-gray-500" />
                    {t('profile.reposition')}
                  </button>
                )}
                {localCoverImage && (
                  <button
                    onClick={handleDeleteCover}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('profile.removeCover')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hidden cover file input */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleCoverChange}
        />
      </div>

      {/* Profile Section */}
      <div className="bg-white border-b border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row">
            
            {/* Profile Photo */}
            <div className={`relative -mt-12 sm:-mt-16 ${isRTL ? 'ml-6 sm:ml-6' : 'mr-6 sm:mr-6'} flex-shrink-0 self-start`}>
              <motion.div
                className="relative group"
                onMouseEnter={() => setIsHoveringProfile(true)}
                onMouseLeave={() => setIsHoveringProfile(false)}
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-white bg-gradient-to-br from-[#D4AF37] to-[#B8963A] shadow-lg overflow-hidden">
                  {(localProfileImage || (user?.imageUrl && user?.hasImage)) ? (
                    <img 
                      src={localProfileImage || user.imageUrl} 
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Upload loading overlay */}
                {isOwnProfile && isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full z-10">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}

                {/* Edit Photo Overlay (hover only, hidden during upload) */}
                {isOwnProfile && !isUploadingAvatar && (
                  <motion.button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </motion.button>
                )}

                {/* Hidden avatar file input */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                
                {/* Verified Badge */}
                {isBusinessProfile && isVerified && (
                  <div className={`absolute -bottom-0.5 ${isRTL ? '-left-0.5' : '-right-0.5'} bg-white rounded-full p-0.5`}>
                    <BadgeCheck className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Info & Actions */}
            <div className={`flex-1 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4`}>
              
              {/* Name & Location */}
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  {displayName}
                </h1>
                {user?.username && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    @{user.username}
                  </p>
                )}
                {location && (
                  <p className={`flex items-center gap-1 mt-1 text-sm text-gray-500`}>
                    <MapPin className="w-3.5 h-3.5" />
                    {location}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className={`flex items-center gap-2`}>
                {/* Social Links */}
                {Object.entries(socialLinks).length > 0 && (
                  <div className={`flex items-center gap-1.5`}>
                    {Object.entries(socialLinks).map(([platform, url]) => {
                      const Icon = socialIcons[platform] || LinkIcon;
                      return url ? (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-[#D4AF37] transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                        </a>
                      ) : null;
                    })}
                  </div>
                )}
                
                {/* Edit Profile + Account Settings */}
                {isOwnProfile && onEditProfile && (
                  <div className={`flex items-center gap-2`}>
                    <button
                      onClick={onEditProfile}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors`}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>{t('profile.editProfile')}</span>
                    </button>
                    <button
                      onClick={onEditProfile}
                      className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"
                      title={t('profile.accountSettings')}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
