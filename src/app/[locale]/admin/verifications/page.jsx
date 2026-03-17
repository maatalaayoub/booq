'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ShieldCheck, Loader2, CheckCircle2, XCircle, Clock,
  FileText, User, Eye, X, Search, RefreshCw, Info, MapPin, Phone, Mail, Building2, Briefcase, GraduationCap,
} from 'lucide-react';

const STATUS_BADGE = {
  pending: { label: 'admin.verifications.pending', color: 'bg-amber-50 text-amber-700', icon: Clock },
  verified: { label: 'admin.verifications.verified', color: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'admin.verifications.rejected', color: 'bg-red-50 text-red-700', icon: XCircle },
};

export default function AdminVerificationsPage() {
  const { t } = useLanguage();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [viewDoc, setViewDoc] = useState(null); // { url, title }
  const [viewUserDetails, setViewUserDetails] = useState(null); // verification object
  const [rejectModal, setRejectModal] = useState(null); // { verificationId, field }
  const [rejectReason, setRejectReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/verifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVerifications(data.verifications || []);
      }
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchVerifications(); }, [fetchVerifications]);

  const handleAction = async (verificationId, field, action, reason) => {
    setActionLoading(`${verificationId}-${field}`);
    try {
      const res = await fetch('/api/admin/verifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId, field, action, reason }),
      });
      if (res.ok) {
        fetchVerifications();
      }
    } finally {
      setActionLoading(null);
      setRejectModal(null);
      setRejectReason('');
    }
  };

  const getName = (v) => {
    const p = v.users?.user_profile;
    if (p?.first_name || p?.last_name) return `${p.first_name || ''} ${p.last_name || ''}`.trim();
    return v.users?.username || v.users?.email || '—';
  };

  // Helper to extract business details from shop_salon_info, mobile_service_info, or business_card_settings
  const getBusinessDetails = (v) => {
    const bi = v.business_info;
    if (!bi) return {};
    // These are one-to-one relations, so access directly (not as arrays)
    const shop = bi.shop_salon_info;
    const mobile = bi.mobile_service_info;
    const cardSettings = bi.business_card_settings?.settings;
    return {
      businessName: cardSettings?.businessName || shop?.business_name || mobile?.business_name || null,
      avatarUrl: cardSettings?.avatarUrl || null,
      address: shop?.address || null,
      city: shop?.city || null,
      phone: shop?.phone || mobile?.phone || null,
      serviceArea: mobile?.service_area || null,
    };
  };

  const renderStatusBadge = (status) => {
    const conf = STATUS_BADGE[status] || STATUS_BADGE.pending;
    const Icon = conf.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${conf.color}`}>
        <Icon className="w-3 h-3" />
        {t(conf.label)}
      </span>
    );
  };

  const DOC_TYPE_LABELS = {
    national_id: 'dashboard.verification.nationalId',
    passport: 'dashboard.verification.passport',
    driver_license: 'dashboard.verification.driverLicense',
    business_license: 'dashboard.verification.businessLicense',
    registration_cert: 'dashboard.verification.registrationCert',
    tax_document: 'dashboard.verification.taxDocument',
    professional_cert: 'dashboard.verification.professionalCert',
    professional_diploma: 'dashboard.verification.professionalDiploma',
    training_cert: 'dashboard.verification.trainingCert',
  };

  const renderDocActions = (v, field) => {
    const status = v[`${field}_status`];
    const docUrl = v[`${field}_document_url`];
    const loadingKey = `${v.id}-${field}`;
    const isProcessing = actionLoading === loadingKey;

    if (status !== 'pending') return null;

    return (
      <div className="flex items-center gap-2">
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <>
            {docUrl && (
              <button
                onClick={() => setViewDoc({ url: docUrl, title: `${field} - ${getName(v)}` })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-[5px] transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {t('admin.verifications.view')}
              </button>
            )}
            <button
              onClick={() => handleAction(v.id, field, 'approve')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-[5px] transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('admin.verifications.approve')}
            </button>
            <button
              onClick={() => setRejectModal({ verificationId: v.id, field })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-[5px] transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              {t('admin.verifications.reject')}
            </button>
          </>
        )}
      </div>
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVerifications();
    setRefreshing(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#364153]" />
            {t('admin.verifications.title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('admin.verifications.subtitle')}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title={t('admin.refresh')}
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[5px] border border-gray-200 p-4 mb-6">
        <div className="flex gap-2">
          {['pending', 'verified', 'rejected', ''].map((val) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`px-4 py-2 text-sm rounded-[5px] font-medium transition-colors ${
                statusFilter === val
                  ? 'bg-[#364153] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {val === '' ? t('admin.verifications.all') : t(`admin.verifications.${val}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Verifications List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t('admin.loading')}</span>
        </div>
      ) : verifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">{t('admin.verifications.noResults')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {verifications.map((v) => (
            <div key={v.id} className="bg-white rounded-[5px] border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {v.users?.user_profile?.profile_image_url ? (
                    <img src={v.users.user_profile.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{getName(v)}</p>
                    <p className="text-xs text-gray-400">{v.users?.email} &bull; {v.business_info?.professional_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewUserDetails(v)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                    title={t('admin.verifications.viewDetails') || 'View Details'}
                  >
                    <Info className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('admin.verifications.viewDetails') || 'Details'}</span>
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {/* Identity */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{t('admin.verifications.identityDoc')}</span>
                    </div>
                    {renderStatusBadge(v.identity_status)}
                  </div>
                  {v.identity_document_url && (
                    <button
                      onClick={() => setViewDoc({ url: v.identity_document_url, title: `Identity - ${getName(v)}` })}
                      className="text-xs text-blue-600 hover:underline mb-2 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      {t('admin.verifications.viewDocument')}
                    </button>
                  )}
                  {v.identity_document_type && (
                    <p className="text-xs text-gray-500 mb-2">
                      <span className="font-medium">{t('admin.verifications.docType')}:</span> {t(DOC_TYPE_LABELS[v.identity_document_type] || '') || v.identity_document_type}
                    </p>
                  )}
                  {v.identity_rejection_reason && (
                    <p className="text-xs text-red-500 mb-2">{t('admin.verifications.reason')}: {v.identity_rejection_reason}</p>
                  )}
                  {renderDocActions(v, 'identity')}
                </div>

                {/* Business / Certificate */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {v.business_info?.business_category === 'mobile_service'
                        ? <GraduationCap className="w-4 h-4 text-gray-400" />
                        : <FileText className="w-4 h-4 text-gray-400" />
                      }
                      <span className="text-sm font-medium text-gray-700">
                        {t(v.business_info?.business_category === 'mobile_service' ? 'admin.verifications.certificateDoc' : 'admin.verifications.businessDoc')}
                      </span>
                    </div>
                    {renderStatusBadge(v.business_status)}
                  </div>
                  {v.business_document_url && (
                    <button
                      onClick={() => setViewDoc({ url: v.business_document_url, title: `Business - ${getName(v)}` })}
                      className="text-xs text-blue-600 hover:underline mb-2 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      {t('admin.verifications.viewDocument')}
                    </button>
                  )}
                  {v.business_document_type && (
                    <p className="text-xs text-gray-500 mb-2">
                      <span className="font-medium">{t('admin.verifications.docType')}:</span> {t(DOC_TYPE_LABELS[v.business_document_type] || '') || v.business_document_type}
                    </p>
                  )}
                  {v.business_rejection_reason && (
                    <p className="text-xs text-red-500 mb-2">{t('admin.verifications.reason')}: {v.business_rejection_reason}</p>
                  )}
                  {renderDocActions(v, 'business')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{viewDoc.title}</h3>
              <button onClick={() => setViewDoc(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewDoc.url.toLowerCase().endsWith('.pdf') ? (
                <iframe src={viewDoc.url} className="w-full h-[70vh]" title="Document" />
              ) : (
                <img src={viewDoc.url} alt="Document" className="max-w-full mx-auto rounded" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-gray-200 shadow-xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{t('admin.verifications.rejectTitle')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('admin.verifications.rejectDesc')}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('admin.verifications.reasonPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#364153]/30 mb-4 resize-none h-24"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-[5px] hover:bg-gray-50"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={() => handleAction(rejectModal.verificationId, rejectModal.field, 'reject', rejectReason)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-[5px] hover:bg-red-700"
              >
                {t('admin.verifications.reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {viewUserDetails && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-gray-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{t('admin.verifications.userDetails') || 'User Details'}</h3>
              <button onClick={() => setViewUserDetails(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-6">
              {/* User Info Section */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('admin.verifications.userInfo') || 'User Information'}
                </h4>
                <div className="flex items-start gap-4">
                  {viewUserDetails.users?.user_profile?.profile_image_url ? (
                    <img 
                      src={viewUserDetails.users.user_profile.profile_image_url} 
                      alt="" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-lg font-medium text-gray-900">{getName(viewUserDetails)}</p>
                      <p className="text-sm text-gray-500">@{viewUserDetails.users?.username || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {viewUserDetails.users?.email || '-'}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {viewUserDetails.users?.account_status || 'active'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Info Section */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {t('admin.verifications.businessInfo') || 'Business Information'}
                </h4>
                {(() => {
                  const details = getBusinessDetails(viewUserDetails);
                  return (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {/* Business Avatar and Category/Type */}
                      <div className="flex items-start gap-4">
                        {details.avatarUrl ? (
                          <img 
                            src={details.avatarUrl} 
                            alt="" 
                            className="w-14 h-14 rounded-lg object-cover border-2 border-gray-200" 
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                            <Building2 className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{t('admin.verifications.businessCategory') || 'Category'}</p>
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {viewUserDetails.business_info?.business_category?.replace('_', ' ') || '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">{t('admin.verifications.professionalType') || 'Professional Type'}</p>
                              <p className="text-sm font-medium text-gray-900">
                                {viewUserDetails.business_info?.professional_type || '-'}
                              </p>
                            </div>
                          </div>
                          {viewUserDetails.business_info?.service_categories && (
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Service Category</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {viewUserDetails.business_info.service_categories.name || '-'}
                                </p>
                              </div>
                              {viewUserDetails.business_info?.specialties && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Specialty</p>
                                  <div className="flex items-center gap-2">
                                    {viewUserDetails.business_info.specialties.custom_icon && (
                                      <img src={viewUserDetails.business_info.specialties.custom_icon} alt="" className="w-5 h-5" />
                                    )}
                                    <p className="text-sm font-medium text-gray-900">
                                      {viewUserDetails.business_info.specialties.name || '-'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {viewUserDetails.business_info?.service_mode && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-1">Service Mode</p>
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {viewUserDetails.business_info.service_mode === 'walkin' ? 'Walk-in' : viewUserDetails.business_info.service_mode === 'both' ? 'Booking & Walk-in' : 'Online Booking'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {details.businessName ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">{t('admin.verifications.businessName') || 'Business Name'}</p>
                          <p className="text-sm font-medium text-gray-900">{details.businessName}</p>
                        </div>
                      ) : null}
                      {details.address ? (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('admin.verifications.address') || 'Address'}</p>
                            <p className="text-sm text-gray-900">
                              {details.address}
                              {details.city && `, ${details.city}`}
                            </p>
                          </div>
                        </div>
                      ) : null}
                      {details.serviceArea ? (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('admin.verifications.serviceArea') || 'Service Area'}</p>
                            <p className="text-sm text-gray-900">{details.serviceArea}</p>
                          </div>
                        </div>
                      ) : null}
                      {details.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('admin.verifications.phone') || 'Phone'}</p>
                            <p className="text-sm text-gray-900">{details.phone}</p>
                          </div>
                        </div>
                      ) : null}
                      {!details.businessName && !details.address && !details.phone && !details.serviceArea && !details.avatarUrl && (
                        <p className="text-sm text-gray-400 italic">{t('admin.verifications.noBusinessDetails') || 'No additional business details provided yet.'}</p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Verification Status Section */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {t('admin.verifications.verificationStatus') || 'Verification Status'}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('admin.verifications.identityDoc') || 'Identity Document'}</p>
                      {renderStatusBadge(viewUserDetails.identity_status)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        {t(viewUserDetails.business_info?.business_category === 'mobile_service' ? 'admin.verifications.certificateDoc' : 'admin.verifications.businessDoc')}
                      </p>
                      {renderStatusBadge(viewUserDetails.business_status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('admin.verifications.submittedAt') || 'Submitted At'}</p>
                    <p className="text-sm text-gray-900">
                      {new Date(viewUserDetails.created_at).toLocaleString()}
                    </p>
                  </div>
                  {viewUserDetails.updated_at && viewUserDetails.updated_at !== viewUserDetails.created_at && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('admin.verifications.lastUpdated') || 'Last Updated'}</p>
                      <p className="text-sm text-gray-900">
                        {new Date(viewUserDetails.updated_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={() => setViewUserDetails(null)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-[5px] hover:bg-gray-50"
              >
                {t('admin.close') || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
