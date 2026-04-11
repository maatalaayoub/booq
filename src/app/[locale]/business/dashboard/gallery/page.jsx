'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthUser } from '@/hooks/useAuthUser';
import {
  ImagePlus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Upload,
  Images,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 20;

async function validateImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Invalid file type. Use JPEG, PNG, or WebP.';
  if (file.size > MAX_FILE_SIZE) return 'File too large. Max 5MB.';
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  const isWEBP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
              && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (!isJPEG && !isPNG && !isWEBP) return 'Invalid file type.';
  return null;
}

export default function GalleryPage() {
  const { t } = useLanguage();
  const { isSignedIn, isLoaded } = useAuthUser();

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [hiddenImages, setHiddenImages] = useState(new Set());
  const [hideAllGallery, setHideAllGallery] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const fileInputRef = useRef(null);

  // Fetch existing gallery images
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      try {
        const res = await fetch('/api/business/public-page-settings');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        const settings = data.settings || data.data?.settings || {};
        setImages(settings.galleryImages || []);
        setHiddenImages(new Set(settings.hiddenGalleryImages || []));
        setHideAllGallery(settings.hideAllGallery || false);
      } catch {
        setError('Failed to load gallery images');
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn]);

  // Upload handler
  const handleUpload = async (files) => {
    const fileList = Array.from(files);
    if (!fileList.length) return;

    if (images.length + fileList.length > MAX_IMAGES) {
      setError(t('gallery.maxImages') || `Maximum ${MAX_IMAGES} images allowed.`);
      setTimeout(() => setError(null), 4000);
      return;
    }

    setError(null);
    for (const file of fileList) {
      const err = await validateImageFile(file);
      if (err) {
        setError(err);
        setTimeout(() => setError(null), 4000);
        return;
      }
    }

    setUploading(true);
    try {
      const urls = await Promise.all(
        fileList.map(async (file) => {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('type', 'gallery');
          const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          return data.url || data.data?.url;
        })
      );
      setImages(prev => [...prev, ...urls]);
      setSaved(false);
    } catch {
      setError('Failed to upload images');
      setTimeout(() => setError(null), 4000);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    handleUpload(e.target.files);
    e.target.value = '';
  };

  // Drag & drop on the upload zone
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  // Toggle image visibility
  const toggleHidden = (url) => {
    setHiddenImages(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
    setSaved(false);
  };

  // Remove image
  const removeImage = (url) => {
    setImages(prev => prev.filter(u => u !== url));
    setHiddenImages(prev => { const next = new Set(prev); next.delete(url); return next; });
    setDeleteConfirm(null);
    setSaved(false);
  };

  // Reorder drag
  const handleDragStart = (idx) => setDragIndex(idx);
  const handleDragEnter = (idx) => setDragOverIndex(idx);
  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      setImages(prev => {
        const arr = [...prev];
        const [moved] = arr.splice(dragIndex, 1);
        arr.splice(dragOverIndex, 0, moved);
        return arr;
      });
      setSaved(false);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Save to settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/business/public-page-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { galleryImages: images, hiddenGalleryImages: [...hiddenImages], hideAllGallery }, partial: true }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setSuccess(t('gallery.saved') || 'Gallery saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save gallery');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="p-6 sd:p-8 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
          <div className="grid grid-cols-2 sd:grid-cols-3 md:grid-cols-4 gap-4 mt-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sd:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('gallery.title') || 'Gallery'}
            </h1>
          </div>
          <p className="text-[14px] text-gray-500 mt-1">
            {t('gallery.description') || 'Upload photos of your work to showcase on your booking page.'}
          </p>
        </div>
      </div>

      {/* Hide all gallery toggle */}
      {images.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl mb-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <EyeOff className="w-4.5 h-4.5 text-gray-400" />
            <div>
              <p className="text-[14px] font-medium text-gray-700">{t('gallery.hideAll') || 'Hide gallery from booking page'}</p>
              <p className="text-[12px] text-gray-400">{t('gallery.hideAllDesc') || 'Photos will be saved but not visible to customers'}</p>
            </div>
          </div>
          <button
            onClick={() => { setHideAllGallery(prev => !prev); setSaved(false); }}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              hideAllGallery ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              hideAllGallery ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-6 text-[13px] text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl mb-6 text-[13px] text-green-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Upload zone - only show when no images */}
      {images.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-8 ${
            dragOver
              ? 'border-violet-400 bg-violet-50'
              : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <p className="text-[14px] font-medium text-gray-600">{t('gallery.uploading') || 'Uploading...'}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-700">
                  {t('gallery.dropHere') || 'Drop images here or click to upload'}
                </p>
                <p className="text-[12px] text-gray-400 mt-1">
                  JPG, PNG, WebP · Max 5MB · {images.length}/{MAX_IMAGES} {t('gallery.imagesLabel') || 'images'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image grid */}
      {images.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <ImagePlus className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-[15px] font-medium text-gray-400">
            {t('gallery.empty') || 'No images yet'}
          </p>
          <p className="text-[13px] text-gray-300 mt-1">
            {t('gallery.emptyHint') || 'Upload photos to showcase your work'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] text-gray-500 font-medium">
              {images.length} {images.length === 1 ? (t('gallery.photo') || 'photo') : (t('gallery.photos') || 'photos')}
            </p>
            <p className="text-[12px] text-gray-400">
              {t('gallery.dragToReorder') || 'Drag to reorder'}
            </p>
          </div>
          <div className="grid grid-cols-2 sd:grid-cols-3 md:grid-cols-4 gap-3">
            {/* Add more tile - first position */}
            {images.length < MAX_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                  dragOver
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-gray-300" />
                    <span className="text-[11px] text-gray-400 font-medium">{t('gallery.addMore') || 'Add more'}</span>
                    <span className="text-[10px] text-gray-300">{images.length}/{MAX_IMAGES}</span>
                  </>
                )}
              </button>
            )}
            {images.map((url, idx) => (
              <div
                key={url}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing ${
                  dragIndex === idx ? 'opacity-40 scale-95 border-violet-300' :
                  dragOverIndex === idx ? 'border-violet-400 scale-[1.02]' :
                  'border-transparent hover:border-gray-200'
                }`}
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                {/* Overlay with action buttons */}
                <div className="absolute inset-0 bg-black/30 sd:bg-black/0 sd:group-hover:bg-black/30 transition-colors flex items-end sd:items-center justify-center sd:justify-center p-2 sd:p-0">
                  <div className="flex items-center gap-2 sd:opacity-0 sd:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleHidden(url); }}
                      className={`w-9 h-9 rounded-xl backdrop-blur-sm flex items-center justify-center transition-colors shadow-lg ${
                        hiddenImages.has(url)
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-white/90 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={hiddenImages.has(url) ? (t('gallery.show') || 'Show on booking page') : (t('gallery.hide') || 'Hide from booking page')}
                    >
                      {hiddenImages.has(url) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(url); }}
                      className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-sm text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-white/90 backdrop-blur-sm text-gray-500 flex items-center justify-center shadow-lg">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                {/* Hidden badge */}
                {hiddenImages.has(url) && (
                  <div className="absolute top-2 ltr:right-2 rtl:left-2 px-2 py-1 bg-amber-500/90 backdrop-blur-sm rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    {t('gallery.hidden') || 'Hidden'}
                  </div>
                )}
                {/* First image badge */}
                {idx === 0 && (
                  <div className="absolute top-2 ltr:left-2 rtl:right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-bold text-gray-700 shadow-sm">
                    {t('gallery.cover') || 'COVER'}
                  </div>
                )}
              </div>
            ))}

          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setDeleteConfirm(null)} className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 text-center mb-2">
              {t('gallery.deleteTitle') || 'Delete image?'}
            </h3>
            <p className="text-[13px] text-gray-500 text-center mb-6">
              {t('gallery.deleteDesc') || 'This action cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 text-[14px] font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                {t('gallery.cancel') || 'Cancel'}
              </button>
              <button onClick={() => removeImage(deleteConfirm)}
                className="flex-1 py-2.5 text-[14px] font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">
                {t('gallery.delete') || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved changes bar */}
      {!saved && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-5 py-3 flex items-center justify-between sd:left-[72px]">
          <p className="text-[13px] text-gray-500 font-medium">
            {t('gallery.unsaved') || 'You have unsaved changes'}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#364153] text-white text-[14px] font-medium rounded-[5px] hover:bg-[#364153]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? (t('gallery.saving') || 'Saving...') : (t('gallery.save') || 'Save Changes')}
          </button>
        </div>
      )}
    </div>
  );
}
