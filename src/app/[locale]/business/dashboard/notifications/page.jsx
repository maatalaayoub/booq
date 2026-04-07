'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import PendingInvitations from '@/components/dashboard/PendingInvitations';
import { translateNotification } from '@/lib/notification-translate';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  RotateCw,
  Users,
  Calendar,
  UserPlus,
  UserMinus,
  Info,
  ArrowLeft,
  X,
} from 'lucide-react';

const TYPE_ICONS = {
  team_invite: UserPlus,
  invite_accepted: Check,
  invite_declined: UserMinus,
  member_removed: UserMinus,
  appointment_assigned: Calendar,
  appointment_cancelled: Calendar,
  appointment_rescheduled: Calendar,
  general: Info,
};

const TYPE_COLORS = {
  team_invite: 'bg-blue-100 text-blue-600',
  invite_accepted: 'bg-green-100 text-green-600',
  invite_declined: 'bg-red-100 text-red-600',
  member_removed: 'bg-red-100 text-red-600',
  appointment_assigned: 'bg-purple-100 text-purple-600',
  appointment_cancelled: 'bg-orange-100 text-orange-600',
  appointment_rescheduled: 'bg-yellow-100 text-yellow-600',
  general: 'bg-gray-100 text-gray-600',
};

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-[5px] border border-gray-300 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-[5px]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-64 bg-gray-100 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const { t, isRTL } = useLanguage();
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread
  const [selectedNotification, setSelectedNotification] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-open notification from ?open= query param
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId && notifications.length > 0 && !autoOpenedRef.current) {
      const found = notifications.find((n) => n.id === openId);
      if (found) {
        autoOpenedRef.current = true;
        setSelectedNotification(found);
        if (!found.read_at) markAsRead(found.id);
      }
    }
  }, [searchParams, notifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      const removed = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (removed && !removed.read_at) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // silent
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('notifications.justNow') || 'Just now';
    if (diffMin < 60) return `${diffMin} ${t('notifications.minutesAgo') || 'min ago'}`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ${t('notifications.hoursAgo') || 'hours ago'}`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} ${t('notifications.daysAgo') || 'days ago'}`;
    return date.toLocaleDateString();
  };

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.read_at)
    : notifications;

  const handleNotificationClick = (n) => {
    setSelectedNotification(n);
    if (!n.read_at) markAsRead(n.id);
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Pending Team Invitations */}
      <PendingInvitations />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {t('notifications.title') || 'Notifications'}
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">
                {unreadCount} {t('notifications.unread') || 'unread'}
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="sm:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title={t('dashboard.refresh') || 'Refresh'}
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="hidden sm:block p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title={t('dashboard.refresh') || 'Refresh'}
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">{t('notifications.markAllRead') || 'Mark all read'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('notifications.all') || 'All'}
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            filter === 'unread'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('notifications.unreadTab') || 'Unread'}
          {unreadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <NotificationSkeleton />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-[5px] flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {filter === 'unread'
              ? (t('notifications.noUnread') || 'All caught up!')
              : (t('notifications.empty') || 'No notifications')}
          </h3>
          <p className="text-sm text-gray-500">
            {filter === 'unread'
              ? (t('notifications.noUnreadDesc') || 'You have no unread notifications')
              : (t('notifications.emptyDesc') || 'You\'ll see notifications here when there\'s activity')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Notification List */}
          <div className={`space-y-2 ${selectedNotification ? 'hidden md:block md:w-1/2 lg:w-2/5' : 'w-full'}`}>
            {filtered.map((n) => {
              const IconComponent = TYPE_ICONS[n.type] || Info;
              const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.general;
              const isSelected = selectedNotification?.id === n.id;

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`bg-white rounded-[5px] border p-4 transition-colors group cursor-pointer ${
                    isSelected
                      ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/30'
                      : !n.read_at
                        ? 'border-gray-200 border-l-[3px] border-l-blue-500 bg-blue-50/30 hover:bg-blue-50/50'
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-[5px] flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read_at ? 'font-semibold' : 'font-medium'} text-gray-900 line-clamp-1`}>
                        {translateNotification(n, t).title}
                      </p>
                      {n.message && (
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">{translateNotification(n, t).message}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5">{formatTime(n.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {!n.read_at && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                          title={t('notifications.markRead') || 'Mark as read'}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedNotification?.id === n.id) setSelectedNotification(null);
                          deleteNotification(n.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        title={t('notifications.delete') || 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selectedNotification && (() => {
            const n = selectedNotification;
            const IconComponent = TYPE_ICONS[n.type] || Info;
            const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.general;
            return (
              <div className="flex-1 md:w-1/2 lg:w-3/5">
                <div className="bg-white rounded-[5px] border border-gray-200 p-6 sticky top-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-[5px] flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">{translateNotification(n, t).title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatTime(n.created_at)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedNotification(null)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {n.message && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{translateNotification(n, t).message}</p>
                  )}
                  <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedNotification(null);
                        deleteNotification(n.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('notifications.delete') || 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
