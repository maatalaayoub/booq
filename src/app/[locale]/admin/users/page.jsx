'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Users, Search, Loader2, Ban, CheckCircle2, Trash2,
  AlertTriangle, ShieldAlert, User, Building2, Shield,
  X, RefreshCw, Info,
} from 'lucide-react';

const STATUS_BADGE = {
  active: { label: 'admin.users.active', color: 'bg-green-50 text-green-700' },
  suspended: { label: 'admin.users.suspended', color: 'bg-red-50 text-red-700' },
  restricted: { label: 'admin.users.restricted', color: 'bg-amber-50 text-amber-700' },
};

const ROLE_ICON = {
  user: User,
  business: Building2,
  admin: Shield,
};

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { locale } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { userId, action, userName }
  const [modalLoading, setModalLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewUserInfo, setViewUserInfo] = useState(null); // user object to show in modal

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleStatusChange = async (userId, newStatus) => {
    setActionLoading(userId);
    setModalLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, account_status: newStatus }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, account_status: newStatus } : u));
      }
    } finally {
      setActionLoading(null);
      setModalLoading(false);
      setConfirmAction(null);
    }
  };

  const handleDelete = async (userId) => {
    setActionLoading(userId);
    setModalLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } finally {
      setActionLoading(null);
      setModalLoading(false);
      setConfirmAction(null);
    }
  };

  const getName = (u) => {
    const p = u.user_profile;
    if (p?.first_name || p?.last_name) return `${p.first_name || ''} ${p.last_name || ''}`.trim();
    return u.username || u.email || '—';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-7 h-7 text-[#364153]" />
            {t('admin.users.title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('admin.users.subtitle')}</p>
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
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('admin.users.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#364153]/30"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#364153]/30 bg-white"
          >
            <option value="">{t('admin.users.allRoles')}</option>
            <option value="user">{t('admin.users.roleUser')}</option>
            <option value="business">{t('admin.users.roleBusiness')}</option>
            <option value="admin">{t('admin.users.roleAdmin')}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-[5px] focus:outline-none focus:ring-1 focus:ring-[#364153]/30 bg-white"
          >
            <option value="">{t('admin.users.allStatuses')}</option>
            <option value="active">{t('admin.users.active')}</option>
            <option value="suspended">{t('admin.users.suspended')}</option>
            <option value="restricted">{t('admin.users.restricted')}</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t('admin.loading')}</span>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">{t('admin.users.noUsers')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[5px] border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">{t('admin.users.colUser')}</th>
                  <th className="px-4 py-3 font-medium text-gray-600">{t('admin.users.colEmail')}</th>
                  <th className="px-4 py-3 font-medium text-gray-600">{t('admin.users.colRole')}</th>
                  <th className="px-4 py-3 font-medium text-gray-600">{t('admin.users.colStatus')}</th>
                  <th className="px-4 py-3 font-medium text-gray-600">{t('admin.users.colInfo')}</th>
                  <th className="px-4 py-3 font-medium text-gray-600">{t('admin.users.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const RoleIcon = ROLE_ICON[u.role] || User;
                  const statusConf = STATUS_BADGE[u.account_status] || STATUS_BADGE.active;
                  const isProcessing = actionLoading === u.id;
                  const profileUrl = u.role === 'business' 
                    ? `/${locale}/business/profile?user=${u.username || u.id}`
                    : `/${locale}/profile?user=${u.username || u.id}`;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <Link 
                          href={profileUrl}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          {u.user_profile?.profile_image_url ? (
                            <img src={u.user_profile.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 hover:text-[#244C70] transition-colors">{getName(u)}</p>
                            {u.username && <p className="text-xs text-gray-400">@{u.username}</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                          <RoleIcon className="w-3.5 h-3.5" />
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                          {t(statusConf.label)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewUserInfo(u)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title={t('admin.users.viewInfo')}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'admin' ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : (
                              <>
                                {u.account_status === 'active' && (
                                  <button
                                    onClick={() => setConfirmAction({ userId: u.id, action: 'suspend', userName: getName(u) })}
                                    className="p-1.5 text-amber-500 hover:bg-amber-50 rounded transition-colors"
                                    title={t('admin.users.suspend')}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}
                                {u.account_status === 'suspended' && (
                                  <button
                                    onClick={() => handleStatusChange(u.id, 'active')}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title={t('admin.users.activate')}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                {u.account_status === 'restricted' && (
                                  <button
                                    onClick={() => handleStatusChange(u.id, 'active')}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title={t('admin.users.activate')}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setConfirmAction({ userId: u.id, action: 'delete', userName: getName(u) })}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title={t('admin.users.delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-gray-200 shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${confirmAction.action === 'delete' ? 'bg-red-50' : 'bg-amber-50'}`}>
                {confirmAction.action === 'delete'
                  ? <Trash2 className="w-5 h-5 text-red-500" />
                  : <AlertTriangle className="w-5 h-5 text-amber-500" />
                }
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {confirmAction.action === 'delete' ? t('admin.users.confirmDelete') : t('admin.users.confirmSuspend')}
                </h3>
                <p className="text-xs text-gray-500">{confirmAction.userName}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              {confirmAction.action === 'delete' ? t('admin.users.deleteWarning') : t('admin.users.suspendWarning')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={modalLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-[5px] hover:bg-gray-50 disabled:opacity-50"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={() => {
                  if (confirmAction.action === 'delete') {
                    handleDelete(confirmAction.userId);
                  } else {
                    handleStatusChange(confirmAction.userId, 'suspended');
                  }
                }}
                disabled={modalLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-[5px] flex items-center gap-2 disabled:opacity-70 ${
                  confirmAction.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {modalLoading && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {confirmAction.action === 'delete' ? t('admin.users.delete') : t('admin.users.suspend')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Info Modal */}
      {viewUserInfo && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[5px] border border-gray-200 shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{t('admin.users.userInfo')}</h3>
              <button
                onClick={() => setViewUserInfo(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* User Header */}
              <div className="flex items-center gap-3">
                {viewUserInfo.user_profile?.profile_image_url ? (
                  <img src={viewUserInfo.user_profile.profile_image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{getName(viewUserInfo)}</p>
                  {viewUserInfo.username && <p className="text-sm text-gray-500">@{viewUserInfo.username}</p>}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('admin.users.colEmail')}</p>
                  <p className="text-gray-900 font-medium truncate">{viewUserInfo.email || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('admin.users.colRole')}</p>
                  <p className="text-gray-900 font-medium capitalize">{viewUserInfo.role}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('admin.users.colStatus')}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[viewUserInfo.account_status]?.color || STATUS_BADGE.active.color}`}>
                    {t(STATUS_BADGE[viewUserInfo.account_status]?.label || STATUS_BADGE.active.label)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{t('admin.users.joined')}</p>
                  <p className="text-gray-900 font-medium">{new Date(viewUserInfo.created_at).toLocaleDateString()}</p>
                </div>
                {viewUserInfo.user_profile?.first_name && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.users.firstName')}</p>
                    <p className="text-gray-900 font-medium">{viewUserInfo.user_profile.first_name}</p>
                  </div>
                )}
                {viewUserInfo.user_profile?.last_name && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.users.lastName')}</p>
                    <p className="text-gray-900 font-medium">{viewUserInfo.user_profile.last_name}</p>
                  </div>
                )}
                {viewUserInfo.user_profile?.city && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.users.city')}</p>
                    <p className="text-gray-900 font-medium">{viewUserInfo.user_profile.city}</p>
                  </div>
                )}
                {viewUserInfo.user_profile?.gender && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.users.gender')}</p>
                    <p className="text-gray-900 font-medium capitalize">{viewUserInfo.user_profile.gender}</p>
                  </div>
                )}
                {viewUserInfo.user_profile?.birthday && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-gray-500 mb-1">{t('admin.users.birthday')}</p>
                    <p className="text-gray-900 font-medium">{new Date(viewUserInfo.user_profile.birthday).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setViewUserInfo(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-[5px] hover:bg-gray-50"
              >
                {t('admin.users.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
