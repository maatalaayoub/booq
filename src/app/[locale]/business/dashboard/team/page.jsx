'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  UsersRound,
  UserPlus,
  Search,
  Loader2,
  RotateCw,
  X,
  Check,
  Clock,
  Shield,
  Crown,
  Trash2,
  XCircle,
  Mail,
  Settings,
  Calendar,
  Tag,
  DollarSign,
  User,
  Copy,
} from 'lucide-react';

function TeamSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-[5px] border border-gray-300 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TeamPage() {
  const { t, isRTL } = useLanguage();
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [tab, setTab] = useState('members'); // members, invitations

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/business/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setInvitations(data.invitations || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTeam();
  };

  const handleCancelInvite = async (invitationId) => {
    try {
      const res = await fetch('/api/business/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel-invite', invitationId }),
      });
      if (res.ok) {
        setInvitations((prev) =>
          prev.map((inv) =>
            inv.id === invitationId ? { ...inv, status: 'cancelled' } : inv
          )
        );
      }
    } catch {
      // silent
    }
  };

  const handleRemoveMember = async (teamMemberId) => {
    if (!confirm(t('team.confirmRemove') || 'Are you sure you want to remove this team member?')) return;
    try {
      const res = await fetch('/api/business/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove-member', teamMemberId }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== teamMemberId));
      }
    } catch {
      // silent
    }
  };

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  const handleUpdatePermissions = async (teamMemberId, permissions) => {
    try {
      const res = await fetch('/api/business/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-permissions', teamMemberId, permissions }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === teamMemberId ? { ...m, permissions } : m))
        );
        setEditingMember(null);
      }
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#D4AF37]/10 rounded-lg">
            <UsersRound className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t('team.title') || 'Team'}
            </h1>
            <p className="text-sm text-gray-500">
              {members.length} {t('team.membersCount') || 'members'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex-1 sm:hidden" />
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#b8962e] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            {t('team.inviteWorker') || 'Invite Worker'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('members')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === 'members'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('team.members') || 'Members'}
          <span className="ml-1.5 text-xs text-gray-400">({members.length})</span>
        </button>
        <button
          onClick={() => setTab('invitations')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === 'invitations'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('team.invitations') || 'Invitations'}
          {pendingInvitations.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-600 text-xs font-semibold rounded-full">
              {pendingInvitations.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <TeamSkeleton />
      ) : tab === 'members' ? (
        <MembersTab members={members} onRemove={handleRemoveMember} onEditPermissions={setEditingMember} t={t} isRTL={isRTL} />
      ) : (
        <InvitationsTab invitations={invitations} onCancel={handleCancelInvite} t={t} isRTL={isRTL} />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onInvited={() => {
            setShowInviteModal(false);
            fetchTeam();
          }}
          t={t}
          isRTL={isRTL}
        />
      )}

      {/* Permissions Modal */}
      {editingMember && (
        <PermissionsModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={handleUpdatePermissions}
          t={t}
          isRTL={isRTL}
        />
      )}
    </div>
  );
}

// ─── MEMBERS TAB ─────────────────────────────────────────────

const PERM_ICONS = {
  canManageAppointments: Calendar,
  canEditSchedule: Clock,
  canManageServices: Tag,
  canViewEarnings: DollarSign,
};

const PERM_KEYS = Object.keys(PERM_ICONS);

function MembersTab({ members, onRemove, onEditPermissions, t, isRTL }) {
  if (members.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UsersRound className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {t('team.noMembers') || 'No team members yet'}
        </h3>
        <p className="text-sm text-gray-500">
          {t('team.noMembersDesc') || 'Invite workers to join your team'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const profile = member.users?.user_profile;
        const fullName = profile
          ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
          : null;
        const avatarUrl = profile?.profile_image_url;
        const perms = member.permissions || {};

        return (
          <div
            key={member.id}
            className="bg-white rounded-[5px] border border-gray-200 p-4"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : member.role === 'owner' ? (
                  <Crown className="w-5 h-5 text-yellow-600" />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {fullName || member.users?.username || 'Unknown'}
                  </p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    member.role === 'owner'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {member.role === 'owner'
                      ? (t('team.owner') || 'Owner')
                      : (t('team.worker') || 'Worker')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  @{member.users?.username || ''}{member.users?.email ? ` · ${member.users.email}` : ''}
                </p>

                {/* Permission badges for workers */}
                {member.role !== 'owner' && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {PERM_KEYS.map((key) => {
                      const Icon = PERM_ICONS[key];
                      const enabled = perms[key];
                      return (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            enabled
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-50 text-gray-400 border border-gray-200'
                          }`}
                          title={t(`team.perm.${key}`) || key}
                        >
                          <Icon className="w-3 h-3" />
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              {member.role !== 'owner' && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onEditPermissions(member)}
                    className="p-2 text-gray-400 hover:text-[#D4AF37] hover:bg-yellow-50 rounded-lg transition-colors"
                    title={t('team.editPermissions') || 'Edit permissions'}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemove(member.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('team.removeMember') || 'Remove member'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── INVITATIONS TAB ─────────────────────────────────────────

function InvitationsTab({ invitations, onCancel, t, isRTL }) {
  const STATUS_CONFIG = {
    pending: { label: t('team.statusPending') || 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    accepted: { label: t('team.statusAccepted') || 'Accepted', color: 'bg-green-100 text-green-700', icon: Check },
    declined: { label: t('team.statusDeclined') || 'Declined', color: 'bg-red-100 text-red-700', icon: XCircle },
    cancelled: { label: t('team.statusCancelled') || 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: X },
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {t('team.noInvitations') || 'No invitations sent'}
        </h3>
        <p className="text-sm text-gray-500">
          {t('team.noInvitationsDesc') || 'Invite workers to start building your team'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((inv) => {
        const config = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
        const StatusIcon = config.icon;
        return (
          <div
            key={inv.id}
            className="bg-white rounded-[5px] border border-gray-200 p-4 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                @{inv.invited_username || inv.users?.username || 'Unknown'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(inv.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            {inv.status === 'pending' && (
              <button
                onClick={() => onCancel(inv.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title={t('team.cancelInvite') || 'Cancel invitation'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── PERMISSIONS MODAL ───────────────────────────────────────

function PermissionsModal({ member, onClose, onSave, t, isRTL }) {
  const [perms, setPerms] = useState({ ...member.permissions });
  const [saving, setSaving] = useState(false);

  const PERM_LIST = [
    { key: 'canManageAppointments', icon: Calendar, label: t('team.perm.canManageAppointments') || 'Manage Appointments' },
    { key: 'canEditSchedule', icon: Clock, label: t('team.perm.canEditSchedule') || 'Edit Schedule' },
    { key: 'canManageServices', icon: Tag, label: t('team.perm.canManageServices') || 'Manage Services' },
    { key: 'canViewEarnings', icon: DollarSign, label: t('team.perm.canViewEarnings') || 'View Earnings' },
  ];

  const handleSave = async () => {
    setSaving(true);
    await onSave(member.id, perms);
    setSaving(false);
  };

  const profile = member.users?.user_profile;
  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    : member.users?.username || 'Worker';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('team.editPermissions') || 'Edit Permissions'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{displayName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggles */}
        <div className="p-4 space-y-3">
          {PERM_LIST.map(({ key, icon: Icon, label }) => (
            <label
              key={key}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="flex-1 text-sm text-gray-800">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={!!perms[key]}
                onClick={() => setPerms((p) => ({ ...p, [key]: !p[key] }))}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  perms[key] ? 'bg-[#D4AF37]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 ${isRTL ? 'right-0.5' : 'left-0.5'} w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    perms[key]
                      ? isRTL ? '-translate-x-4' : 'translate-x-4'
                      : ''
                  }`}
                />
              </button>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('team.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b8962e] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('team.savePermissions') || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── INVITE MODAL ────────────────────────────────────────────

function InviteModal({ onClose, onInvited, t, isRTL }) {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [userFound, setUserFound] = useState(null); // null = not searched, true/false
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    const clean = username.trim().toLowerCase();
    if (!clean || clean.length < 3) {
      setError(t('team.usernameMinLength') || 'Username must be at least 3 characters');
      return;
    }
    setSearching(true);
    setError('');
    setUserFound(null);
    try {
      const res = await fetch(`/api/check-username?username=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        // If available = true, user doesn't exist. If false, user exists.
        setUserFound(!data.available);
        if (data.available) {
          setError(t('team.userNotFound') || 'No user found with this username');
        }
      }
    } catch {
      setError(t('team.searchError') || 'Error searching for user');
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async () => {
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/business/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send invitation');
        return;
      }
      onInvited();
    } catch {
      setError(t('team.inviteError') || 'Error sending invitation');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('team.inviteWorker') || 'Invite Worker'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Username search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('team.username') || 'Username'}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`}>@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    setUserFound(null);
                    setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={t('team.usernamePlaceholder') || 'Enter username'}
                  className={`w-full border border-gray-300 rounded-lg py-2 ${isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'} text-sm focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none`}
                  maxLength={20}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !username.trim()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
            {userFound === true && (
              <p className="mt-1.5 text-sm text-green-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {t('team.userFoundMsg') || 'User found! You can send an invitation.'}
              </p>
            )}
            {error && (
              <p className="mt-1.5 text-sm text-red-500">{error}</p>
            )}
          </div>

          {/* Optional message */}
          {userFound === true && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('team.inviteMessage') || 'Message (optional)'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('team.inviteMessagePlaceholder') || 'Add a personal message...'}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none resize-none"
                rows={3}
                maxLength={200}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('team.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleInvite}
            disabled={!userFound || sending}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b8962e] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('team.sendInvite') || 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
