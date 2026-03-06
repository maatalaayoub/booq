'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ShieldCheck, Loader2, CheckCircle2, XCircle, Clock,
  FileText, User, Eye, X, Search,
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
  const [rejectModal, setRejectModal] = useState(null); // { verificationId, field }
  const [rejectReason, setRejectReason] = useState('');

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

  const renderDocActions = (v, field) => {
    const status = v[`${field}_status`];
    const docUrl = v[`${field}_document_url`];
    const loadingKey = `${v.id}-${field}`;
    const isProcessing = actionLoading === loadingKey;

    if (status !== 'pending') return null;

    return (
      <div className="flex items-center gap-1">
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <>
            {docUrl && (
              <button
                onClick={() => setViewDoc({ url: docUrl, title: `${field} - ${getName(v)}` })}
                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                title={t('admin.verifications.view')}
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleAction(v.id, field, 'approve')}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
              title={t('admin.verifications.approve')}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRejectModal({ verificationId: v.id, field })}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
              title={t('admin.verifications.reject')}
            >
              <XCircle className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-[#364153]" />
          {t('admin.verifications.title')}
        </h1>
        <p className="text-gray-500 mt-1">{t('admin.verifications.subtitle')}</p>
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
                <span className="text-xs text-gray-400">
                  {new Date(v.created_at).toLocaleDateString()}
                </span>
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
                  {v.identity_rejection_reason && (
                    <p className="text-xs text-red-500 mb-2">{t('admin.verifications.reason')}: {v.identity_rejection_reason}</p>
                  )}
                  {renderDocActions(v, 'identity')}
                </div>

                {/* Business */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{t('admin.verifications.businessDoc')}</span>
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
    </div>
  );
}
