'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  UserPlus,
  Check,
  X,
  Loader2,
  Building2,
  ArrowRight,
} from 'lucide-react';

export default function PendingInvitations() {
  const { t, isRTL } = useLanguage();
  const params = useParams();
  const locale = params.locale || 'en';
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [justAccepted, setJustAccepted] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/business/team/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleRespond = async (invitationId, action) => {
    setRespondingId(invitationId);
    try {
      const res = await fetch('/api/business/team/invitations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, action }),
      });
      if (res.ok) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        if (action === 'accept') setJustAccepted(true);
      }
    } catch {
      // silent
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) return null;
  if (invitations.length === 0) return null;

  return (
    <div className="mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-5 h-5 text-[#D4AF37]" />
        <h3 className="text-sm font-semibold text-gray-900">
          {t('team.pendingInvitations') || 'Pending Team Invitations'}
        </h3>
        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
          {invitations.length}
        </span>
      </div>
      <div className="space-y-3">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="bg-white rounded-[5px] border border-[#D4AF37]/30 p-4"
          >
            <div className="flex items-start gap-3">
              {inv.businessAvatar ? (
                <img src={inv.businessAvatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {inv.businessName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('team.invitedBy') || 'Invited by'} @{inv.invitedBy}
                </p>
                {inv.message && (
                  <p className="text-xs text-gray-600 mt-1 italic">"{inv.message}"</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(inv.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className={`flex gap-2 mt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => handleRespond(inv.id, 'accept')}
                disabled={respondingId === inv.id}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {respondingId === inv.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {t('team.accept') || 'Accept'}
              </button>
              <button
                onClick={() => handleRespond(inv.id, 'decline')}
                disabled={respondingId === inv.id}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {t('team.decline') || 'Decline'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {justAccepted && (
        <Link
          href={`/${locale}/worker/dashboard`}
          className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-sm font-medium transition-colors"
        >
          {t('worker.goToDashboard') || 'Go to Worker Dashboard'}
          <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        </Link>
      )}
    </div>
  );
}
