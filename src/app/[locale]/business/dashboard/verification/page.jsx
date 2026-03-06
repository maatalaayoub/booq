'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
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
} from 'lucide-react';

const STATUS_CONFIG = {
  not_submitted: { color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', icon: ShieldAlert, labelKey: 'dashboard.verification.notSubmitted' },
  pending:       { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock, labelKey: 'dashboard.verification.pending' },
  verified:      { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle2, labelKey: 'dashboard.verification.verified' },
  rejected:      { color: 'text-red-500',   bg: 'bg-red-50',   border: 'border-red-200',   icon: XCircle, labelKey: 'dashboard.verification.rejected' },
};

export default function VerificationPage() {
  const { t } = useLanguage();
  const params = useParams();
  const locale = params.locale || 'en';

  const [identityStatus, setIdentityStatus] = useState('not_submitted');
  const [businessStatus, setBusinessStatus] = useState('not_submitted');
  const [identityFile, setIdentityFile] = useState(null);
  const [businessFile, setBusinessFile] = useState(null);
  const [uploadingIdentity, setUploadingIdentity] = useState(false);
  const [uploadingBusiness, setUploadingBusiness] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const identityInputRef = useRef(null);
  const businessInputRef = useRef(null);

  // Prerequisites state
  const [loading, setLoading] = useState(true);
  const [hasServices, setHasServices] = useState(false);
  const [hasBusinessName, setHasBusinessName] = useState(false);
  const [hasProfileImage, setHasProfileImage] = useState(false);
  const [hasCoverImage, setHasCoverImage] = useState(false);

  useEffect(() => {
    async function fetchPrerequisites() {
      try {
        const [servicesRes, settingsRes] = await Promise.all([
          fetch('/api/business/services').then(r => r.ok ? r.json() : {}),
          fetch('/api/business/public-page-settings').then(r => r.ok ? r.json() : {}),
        ]);

        const services = servicesRes.services || [];
        setHasServices(services.length > 0);

        const s = settingsRes.settings || {};
        setHasBusinessName(!!s.businessName?.trim());
        setHasProfileImage(!!s.avatarUrl);
        setHasCoverImage((s.coverGallery || []).length > 0);
      } catch {
        // leave defaults (all false)
      } finally {
        setLoading(false);
      }
    }
    fetchPrerequisites();
  }, []);

  const prerequisites = [
    { key: 'services', met: hasServices, icon: Tag, labelKey: 'verification.prereq.services', href: `/${locale}/business/dashboard/services` },
    { key: 'businessName', met: hasBusinessName, icon: Globe, labelKey: 'verification.prereq.businessName', href: `/${locale}/business/dashboard/public-page` },
    { key: 'profileImage', met: hasProfileImage, icon: Image, labelKey: 'verification.prereq.profileImage', href: `/${locale}/business/dashboard/public-page` },
    { key: 'coverImage', met: hasCoverImage, icon: ImagePlus, labelKey: 'verification.prereq.coverImage', href: `/${locale}/business/dashboard/public-page` },
  ];

  const allPrerequisitesMet = prerequisites.every(p => p.met);
  const metCount = prerequisites.filter(p => p.met).length;

  const handleIdentityUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdentityFile(file);
    e.target.value = '';
  };

  const handleBusinessUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusinessFile(file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!identityFile || !businessFile || !allPrerequisitesMet) return;
    setSubmitting(true);
    try {
      // TODO: Upload files to server and create verification request
      // await fetch('/api/business/verification', { method: 'POST', body: formData });
      setIdentityStatus('pending');
      setBusinessStatus('pending');
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const bothVerified = identityStatus === 'verified' && businessStatus === 'verified';
  const identityConf = STATUS_CONFIG[identityStatus];
  const businessConf = STATUS_CONFIG[businessStatus];

  const canPickIdentity = allPrerequisitesMet && (identityStatus === 'not_submitted' || identityStatus === 'rejected');
  const canPickBusiness = allPrerequisitesMet && (businessStatus === 'not_submitted' || businessStatus === 'rejected');
  const canSubmit = allPrerequisitesMet && !!identityFile && !!businessFile && (identityStatus === 'not_submitted' || identityStatus === 'rejected') && (businessStatus === 'not_submitted' || businessStatus === 'rejected');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-[#364153]" />
          {t('dashboard.verification.title')}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('dashboard.verification.subtitle')}
        </p>
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
              <p className="text-xs font-medium text-gray-700">{t('dashboard.verification.acceptedDocs')}</p>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-gray-300" />{t('dashboard.verification.nationalId')}</li>
                <li className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-gray-300" />{t('dashboard.verification.passport')}</li>
                <li className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-gray-300" />{t('dashboard.verification.driverLicense')}</li>
              </ul>
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
                  <p className="text-xs text-red-500 mb-2">{t('dashboard.verification.rejectedHint')}</p>
                )}
                <button
                  type="button"
                  onClick={() => identityInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 text-gray-700 rounded-[5px] hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {identityFile ? t('dashboard.verification.changeFile') : t('dashboard.verification.selectFile')}
                </button>
                <input ref={identityInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleIdentityUpload} />
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

        {/* ── Business Verification Card ── */}
        <div className={`bg-white rounded-[5px] border ${businessConf.border} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${businessConf.border} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${businessConf.bg}`}>
                <Building2 className={`w-5 h-5 ${businessConf.color}`} />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">{t('dashboard.verification.business')}</h2>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${businessConf.bg} ${businessConf.color}`}>
              {(() => { const Icon = businessConf.icon; return <Icon className="w-3.5 h-3.5" />; })()}
              {t(businessConf.labelKey)}
            </span>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-500">{t('dashboard.verification.businessDesc')}</p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">{t('dashboard.verification.acceptedDocs')}</p>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-gray-300" />{t('dashboard.verification.businessLicense')}</li>
                <li className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-gray-300" />{t('dashboard.verification.registrationCert')}</li>
                <li className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-gray-300" />{t('dashboard.verification.taxDocument')}</li>
              </ul>
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
                  <p className="text-xs text-red-500 mb-2">{t('dashboard.verification.rejectedHint')}</p>
                )}
                <button
                  type="button"
                  onClick={() => businessInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 text-gray-700 rounded-[5px] hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {businessFile ? t('dashboard.verification.changeFile') : t('dashboard.verification.selectFile')}
                </button>
                <input ref={businessInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleBusinessUpload} />
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
                <span>{t('dashboard.verification.businessVerified')}</span>
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
                : !identityFile || !businessFile
                  ? t('dashboard.verification.selectBothFiles')
                  : null
              }
            </p>
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
