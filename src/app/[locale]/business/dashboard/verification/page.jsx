'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  FileText,
  AlertTriangle,
  CircleDashed,
  Tag,
  Globe,
  Image,
  ImagePlus,
  ChevronRight,
  Send,
  X,
  GraduationCap,
  Navigation,
  RotateCw,
} from 'lucide-react';

const STATUS_CONFIG = {
  not_submitted: { color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', icon: ShieldAlert, labelKey: 'dashboard.verification.notSubmitted' },
  pending:       { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock, labelKey: 'dashboard.verification.pending' },
  verified:      { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle2, labelKey: 'dashboard.verification.verified' },
  rejected:      { color: 'text-red-500',   bg: 'bg-red-50',   border: 'border-red-200',   icon: XCircle, labelKey: 'dashboard.verification.rejected' },
};

export default function VerificationPage() {
  const { t } = useLanguage();
  const { businessCategory } = useBusinessCategory();
  const params = useParams();
  const locale = params.locale || 'en';

  const [identityStatus, setIdentityStatus] = useState('not_submitted');
  const [businessStatus, setBusinessStatus] = useState('not_submitted');
  const [identityFile, setIdentityFile] = useState(null);
  const [businessFile, setBusinessFile] = useState(null);
  const [identityDocUrl, setIdentityDocUrl] = useState(null);
  const [businessDocUrl, setBusinessDocUrl] = useState(null);
  const [identityDocType, setIdentityDocType] = useState('');
  const [businessDocType, setBusinessDocType] = useState('');
  const [identityRejectionReason, setIdentityRejectionReason] = useState(null);
  const [businessRejectionReason, setBusinessRejectionReason] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [fileError, setFileError] = useState(null);
  const identityInputRef = useRef(null);
  const businessInputRef = useRef(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = async (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('verification.invalidFileType');
    }
    if (file.size > MAX_FILE_SIZE) {
      return t('verification.fileTooLarge');
    }
    // Check magic bytes
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    const isWEBP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
                && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    const isPDF = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
    if (!isJPEG && !isPNG && !isWEBP && !isPDF) {
      return t('verification.invalidFileType');
    }
    return null;
  };

  const IDENTITY_DOC_TYPES = [
    { value: 'national_id', labelKey: 'dashboard.verification.nationalId' },
    { value: 'passport', labelKey: 'dashboard.verification.passport' },
    { value: 'driver_license', labelKey: 'dashboard.verification.driverLicense' },
  ];

  const BUSINESS_DOC_TYPES_SHOP = [
    { value: 'business_license', labelKey: 'dashboard.verification.businessLicense' },
    { value: 'registration_cert', labelKey: 'dashboard.verification.registrationCert' },
    { value: 'tax_document', labelKey: 'dashboard.verification.taxDocument' },
  ];

  const BUSINESS_DOC_TYPES_MOBILE = [
    { value: 'professional_cert', labelKey: 'dashboard.verification.professionalCert' },
    { value: 'professional_diploma', labelKey: 'dashboard.verification.professionalDiploma' },
    { value: 'training_cert', labelKey: 'dashboard.verification.trainingCert' },
  ];

  const businessDocTypes = businessCategory === 'mobile_service' ? BUSINESS_DOC_TYPES_MOBILE : BUSINESS_DOC_TYPES_SHOP;

  // Prerequisites state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasServices, setHasServices] = useState(false);
  const [hasBusinessName, setHasBusinessName] = useState(false);
  const [hasProfileImage, setHasProfileImage] = useState(false);
  const [hasCoverImage, setHasCoverImage] = useState(false);
  const [hasServiceArea, setHasServiceArea] = useState(false);

  // Fetch existing verification status and prerequisites
  useEffect(() => {
    async function fetchData() {
      try {
        const [servicesRes, settingsRes, verificationRes, serviceAreaRes] = await Promise.all([
          fetch('/api/business/services').then(r => r.ok ? r.json() : {}),
          fetch('/api/business/public-page-settings').then(r => r.ok ? r.json() : {}),
          fetch('/api/business/verification').then(r => r.ok ? r.json() : {}),
          fetch('/api/business/service-area').then(r => r.ok ? r.json() : null),
        ]);

        const services = servicesRes.services || [];
        setHasServices(services.length > 0);

        const s = settingsRes.settings || {};
        const businessName = s.businessName?.trim() || settingsRes.fallbackBusinessName?.trim() || '';
        setHasBusinessName(!!businessName);
        setHasProfileImage(!!s.avatarUrl);
        setHasCoverImage((s.coverGallery || []).length > 0);

        // Check service area (mobile_service only)
        if (serviceAreaRes) {
          setHasServiceArea(!!(serviceAreaRes.baseLocation || serviceAreaRes.city) && serviceAreaRes.serviceRadius > 0);
        }

        // Set verification status
        const v = verificationRes.verification || {};
        setIdentityStatus(v.identity_status || 'not_submitted');
        setBusinessStatus(v.business_status || 'not_submitted');
        setIdentityDocUrl(v.identity_document_url || null);
        setBusinessDocUrl(v.business_document_url || null);
        setIdentityDocType(v.identity_document_type || '');
        setBusinessDocType(v.business_document_type || '');
        setIdentityRejectionReason(v.identity_rejection_reason || null);
        setBusinessRejectionReason(v.business_rejection_reason || null);
      } catch {
        // leave defaults
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [servicesRes, settingsRes, verificationRes, serviceAreaRes] = await Promise.all([
        fetch('/api/business/services').then(r => r.ok ? r.json() : {}),
        fetch('/api/business/public-page-settings').then(r => r.ok ? r.json() : {}),
        fetch('/api/business/verification').then(r => r.ok ? r.json() : {}),
        fetch('/api/business/service-area').then(r => r.ok ? r.json() : null),
      ]);
      const services = servicesRes.services || [];
      setHasServices(services.length > 0);
      const s = settingsRes.settings || {};
      const businessName = s.businessName?.trim() || settingsRes.fallbackBusinessName?.trim() || '';
      setHasBusinessName(!!businessName);
      setHasProfileImage(!!s.avatarUrl);
      setHasCoverImage((s.coverGallery || []).length > 0);
      if (serviceAreaRes) {
        setHasServiceArea(!!(serviceAreaRes.baseLocation || serviceAreaRes.city) && serviceAreaRes.serviceRadius > 0);
      }
      const v = verificationRes.verification || {};
      setIdentityStatus(v.identity_status || 'not_submitted');
      setBusinessStatus(v.business_status || 'not_submitted');
      setIdentityDocUrl(v.identity_document_url || null);
      setBusinessDocUrl(v.business_document_url || null);
      setIdentityDocType(v.identity_document_type || '');
      setBusinessDocType(v.business_document_type || '');
      setIdentityRejectionReason(v.identity_rejection_reason || null);
      setBusinessRejectionReason(v.business_rejection_reason || null);
    } catch (err) {
      console.error('[verification] Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const prerequisites = [
    { key: 'services', met: hasServices, icon: Tag, labelKey: 'verification.prereq.services', href: `/${locale}/business/dashboard/services` },
    { key: 'businessName', met: hasBusinessName, icon: Globe, labelKey: 'verification.prereq.businessName', href: `/${locale}/business/dashboard/public-page` },
    { key: 'profileImage', met: hasProfileImage, icon: Image, labelKey: 'verification.prereq.profileImage', href: `/${locale}/business/dashboard/public-page` },
    { key: 'coverImage', met: hasCoverImage, icon: ImagePlus, labelKey: 'verification.prereq.coverImage', href: `/${locale}/business/dashboard/public-page` },
    ...(businessCategory === 'mobile_service' ? [
      { key: 'serviceArea', met: hasServiceArea, icon: Navigation, labelKey: 'verification.prereq.serviceArea', href: `/${locale}/business/dashboard/service-area` },
    ] : []),
  ];

  const allPrerequisitesMet = prerequisites.every(p => p.met);
  const metCount = prerequisites.filter(p => p.met).length;

  const handleIdentityUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    const error = await validateFile(file);
    if (error) {
      setFileError(error);
      setTimeout(() => setFileError(null), 5000);
      e.target.value = '';
      return;
    }
    setIdentityFile(file);
    e.target.value = '';
  };

  const handleBusinessUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    const error = await validateFile(file);
    if (error) {
      setFileError(error);
      setTimeout(() => setFileError(null), 5000);
      e.target.value = '';
      return;
    }
    setBusinessFile(file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!allPrerequisitesMet) return;
    
    // Check if we have files to submit
    const needsIdentityFile = identityStatus === 'not_submitted' || identityStatus === 'rejected';
    const needsBusinessFile = businessStatus === 'not_submitted' || businessStatus === 'rejected';
    
    if ((needsIdentityFile && !identityFile) || (needsBusinessFile && !businessFile)) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const formData = new FormData();
      if (identityFile) {
        formData.append('identityFile', identityFile);
        formData.append('identityDocumentType', identityDocType);
      }
      if (businessFile) {
        formData.append('businessFile', businessFile);
        formData.append('businessDocumentType', businessDocType);
      }

      const res = await fetch('/api/business/verification', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to submit verification');
        return;
      }

      // Update state with the response
      const v = data.verification || {};
      setIdentityStatus(v.identity_status || 'pending');
      setBusinessStatus(v.business_status || 'pending');
      setIdentityDocUrl(v.identity_document_url || null);
      setBusinessDocUrl(v.business_document_url || null);
      setIdentityRejectionReason(null);
      setBusinessRejectionReason(null);
      setIdentityFile(null);
      setBusinessFile(null);
      setIdentityDocType(v.identity_document_type || identityDocType);
      setBusinessDocType(v.business_document_type || businessDocType);
      setSubmitted(true);
    } catch (err) {
      console.error('[verification] Submit error:', err);
      setSubmitError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const bothVerified = identityStatus === 'verified' && businessStatus === 'verified';
  const identityConf = STATUS_CONFIG[identityStatus] || STATUS_CONFIG.not_submitted;
  const businessConf = STATUS_CONFIG[businessStatus] || STATUS_CONFIG.not_submitted;

  const canPickIdentity = allPrerequisitesMet && (identityStatus === 'not_submitted' || identityStatus === 'rejected');
  const canPickBusiness = allPrerequisitesMet && (businessStatus === 'not_submitted' || businessStatus === 'rejected');
  
  // Can submit if prerequisites met and we have necessary files + doc types for documents that need submission
  const needsIdentityFile = identityStatus === 'not_submitted' || identityStatus === 'rejected';
  const needsBusinessFile = businessStatus === 'not_submitted' || businessStatus === 'rejected';
  const hasRequiredFiles = (!needsIdentityFile || (identityFile && identityDocType)) && (!needsBusinessFile || (businessFile && businessDocType));
  const canSubmit = allPrerequisitesMet && hasRequiredFiles && (needsIdentityFile || needsBusinessFile);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#364153]" />
            {t('dashboard.verification.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('dashboard.verification.subtitle')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-[5px] transition-colors disabled:opacity-50"
          title={t('common.refresh') || 'Refresh'}
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overall status banner */}
      {bothVerified ? (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-[5px] bg-green-50 border border-green-200">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-700">{t('dashboard.verification.allVerified')}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-[5px] bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-700">{t('dashboard.verification.incomplete')}</p>
        </div>
      )}

      {/* ── Prerequisites Checklist ── */}
      <div className="bg-white rounded-[5px] border border-gray-200 mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${allPrerequisitesMet ? 'bg-green-50' : 'bg-amber-50'}`}>
              {allPrerequisitesMet
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <CircleDashed className="w-5 h-5 text-amber-500" />
              }
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{t('verification.prereq.title')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('verification.prereq.subtitle')}</p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${allPrerequisitesMet ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
            {metCount}/{prerequisites.length}
          </span>
        </div>

        {loading ? (
          <div className="p-6 flex items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('verification.prereq.loading')}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {prerequisites.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.key} className="flex items-center gap-4 px-5 py-3.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${p.met ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <Icon className={`w-4 h-4 ${p.met ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${p.met ? 'text-gray-900' : 'text-gray-500'}`}>{t(p.labelKey)}</p>
                  </div>
                  {p.met ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Link
                      href={p.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#364153] hover:underline flex-shrink-0"
                    >
                      {t('verification.prereq.fix')}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Verification Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Identity Verification Card ── */}
        <div className={`bg-white rounded-[5px] border ${identityConf.border} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${identityConf.border} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${identityConf.bg}`}>
                <UserCheck className={`w-5 h-5 ${identityConf.color}`} />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">{t('dashboard.verification.identity')}</h2>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${identityConf.bg} ${identityConf.color}`}>
              {(() => { const Icon = identityConf.icon; return <Icon className="w-3.5 h-3.5" />; })()}
              {t(identityConf.labelKey)}
            </span>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-500">{t('dashboard.verification.identityDesc')}</p>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">{t('dashboard.verification.documentType')}</label>
              <select
                value={identityDocType}
                onChange={e => setIdentityDocType(e.target.value)}
                disabled={!canPickIdentity}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[5px] bg-white focus:outline-none focus:ring-1 focus:ring-[#364153]/30 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">{t('dashboard.verification.selectDocType')}</option>
                {IDENTITY_DOC_TYPES.map(dt => (
                  <option key={dt.value} value={dt.value}>{t(dt.labelKey)}</option>
                ))}
              </select>
            </div>

            {identityFile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-[5px] text-xs text-green-700">
                <FileText className="w-3.5 h-3.5 text-green-500" />
                <span className="truncate flex-1">{identityFile.name}</span>
                {canPickIdentity && (
                  <button type="button" onClick={() => setIdentityFile(null)} className="text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {canPickIdentity && (
              <div>
                {identityStatus === 'rejected' && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-[5px]">
                    <p className="text-xs font-medium text-red-600 mb-1">{t('dashboard.verification.rejectedHint')}</p>
                    {identityRejectionReason && (
                      <p className="text-xs text-red-500">
                        <span className="font-medium">{t('dashboard.verification.adminReason')}:</span> {identityRejectionReason}
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => identityInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 text-gray-700 rounded-[5px] hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {identityFile ? t('dashboard.verification.changeFile') : t('dashboard.verification.selectFile')}
                </button>
                <input ref={identityInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleIdentityUpload} />
              </div>
            )}

            {!allPrerequisitesMet && (identityStatus === 'not_submitted' || identityStatus === 'rejected') && (
              <p className="text-xs text-gray-400 italic">{t('verification.prereq.completeFirst')}</p>
            )}

            {identityStatus === 'pending' && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="w-4 h-4" />
                <span>{t('dashboard.verification.pendingReview')}</span>
              </div>
            )}

            {identityStatus === 'verified' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('dashboard.verification.identityVerified')}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Business / Certificate Verification Card ── */}
        <div className={`bg-white rounded-[5px] border ${businessConf.border} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${businessConf.border} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${businessConf.bg}`}>
                {businessCategory === 'mobile_service'
                  ? <GraduationCap className={`w-5 h-5 ${businessConf.color}`} />
                  : <Building2 className={`w-5 h-5 ${businessConf.color}`} />
                }
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                {t(businessCategory === 'mobile_service' ? 'dashboard.verification.certificate' : 'dashboard.verification.business')}
              </h2>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${businessConf.bg} ${businessConf.color}`}>
              {(() => { const Icon = businessConf.icon; return <Icon className="w-3.5 h-3.5" />; })()}
              {t(businessConf.labelKey)}
            </span>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-500">
              {t(businessCategory === 'mobile_service' ? 'dashboard.verification.certificateDesc' : 'dashboard.verification.businessDesc')}
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">{t('dashboard.verification.documentType')}</label>
              <select
                value={businessDocType}
                onChange={e => setBusinessDocType(e.target.value)}
                disabled={!canPickBusiness}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[5px] bg-white focus:outline-none focus:ring-1 focus:ring-[#364153]/30 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">{t('dashboard.verification.selectDocType')}</option>
                {businessDocTypes.map(dt => (
                  <option key={dt.value} value={dt.value}>{t(dt.labelKey)}</option>
                ))}
              </select>
            </div>

            {businessFile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-[5px] text-xs text-green-700">
                <FileText className="w-3.5 h-3.5 text-green-500" />
                <span className="truncate flex-1">{businessFile.name}</span>
                {canPickBusiness && (
                  <button type="button" onClick={() => setBusinessFile(null)} className="text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {canPickBusiness && (
              <div>
                {businessStatus === 'rejected' && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-[5px]">
                    <p className="text-xs font-medium text-red-600 mb-1">{t('dashboard.verification.rejectedHint')}</p>
                    {businessRejectionReason && (
                      <p className="text-xs text-red-500">
                        <span className="font-medium">{t('dashboard.verification.adminReason')}:</span> {businessRejectionReason}
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => businessInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 text-gray-700 rounded-[5px] hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {businessFile ? t('dashboard.verification.changeFile') : t('dashboard.verification.selectFile')}
                </button>
                <input ref={businessInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleBusinessUpload} />
              </div>
            )}

            {!allPrerequisitesMet && (businessStatus === 'not_submitted' || businessStatus === 'rejected') && (
              <p className="text-xs text-gray-400 italic">{t('verification.prereq.completeFirst')}</p>
            )}

            {businessStatus === 'pending' && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="w-4 h-4" />
                <span>{t('dashboard.verification.pendingReview')}</span>
              </div>
            )}

            {businessStatus === 'verified' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t(businessCategory === 'mobile_service' ? 'dashboard.verification.certificateVerified' : 'dashboard.verification.businessVerified')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Submit Button ── */}
      {(identityStatus === 'not_submitted' || identityStatus === 'rejected' || businessStatus === 'not_submitted' || businessStatus === 'rejected') && (
        <div className="mt-6 bg-white rounded-[5px] border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{t('dashboard.verification.submitTitle')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.verification.submitDesc')}</p>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-[#364153] text-white rounded-[5px] hover:bg-[#364153]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? t('dashboard.verification.submitting') : t('dashboard.verification.submitForReview')}
            </button>
          </div>
          {!canSubmit && !submitting && (
            <p className="text-xs text-gray-400 mt-3">
              {!allPrerequisitesMet
                ? t('verification.prereq.completeFirst')
                : (!needsIdentityFile && !needsBusinessFile)
                  ? null
                  : (needsIdentityFile && !identityFile) || (needsBusinessFile && !businessFile)
                    ? t('dashboard.verification.selectRequiredFiles')
                    : null
              }
            </p>
          )}
          {fileError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-500">
              <XCircle className="w-4 h-4" />
              <span>{fileError}</span>
            </div>
          )}
          {submitError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-500">
              <XCircle className="w-4 h-4" />
              <span>{submitError}</span>
            </div>
          )}
        </div>
      )}

      {submitted && (identityStatus === 'pending' || businessStatus === 'pending') && (
        <div className="mt-6 flex items-center gap-3 p-4 rounded-[5px] bg-green-50 border border-green-200">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-700">{t('dashboard.verification.submitSuccess')}</p>
        </div>
      )}
    </div>
  );
}
