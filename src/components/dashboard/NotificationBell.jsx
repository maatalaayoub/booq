'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Calendar,
  UserPlus,
  UserMinus,
  Info,
  Loader2,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { translateNotification } from '@/lib/notification-translate';

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

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = params.locale || 'en';
  const { t, isRTL } = useLanguage();

  // Detect if we're on worker dashboard to use correct link
  const isWorkerDashboard = pathname.includes('/worker/dashboard');
  const notificationsHref = isWorkerDashboard
    ? `/${locale}/worker/dashboard/notifications`
    : `/${locale}/business/dashboard/notifications`;

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?countOnly=true');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (dropdownOpen) fetchNotifications();
  }, [dropdownOpen, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

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

  const handleNotificationClick = (n) => {
    if (!n.read_at) markAsRead(n.id);
    setDropdownOpen(false);
    router.push(`${notificationsHref}?open=${n.id}`);
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('notifications.justNow') || 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={`absolute -top-0.5 ${isRTL ? '-left-0.5' : '-right-0.5'} flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div
          className={`absolute top-full mt-2 ${isRTL ? 'right-0' : 'right-0'} w-[340px] sm:w-[380px] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden`}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 text-sm">
              {t('notifications.title') || 'Notifications'}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs text-[#D4AF37] hover:text-[#b8962e] font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t('notifications.markAllRead') || 'Mark all read'}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500">{t('notifications.empty') || 'No notifications'}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t('notifications.emptyDesc') || "You'll see notifications here when there's activity"}</p>
              </div>
            ) : (
              notifications.slice(0, 6).map((n) => {
                const IconComp = TYPE_ICONS[n.type] || Info;
                const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.general;

                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-start px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !n.read_at ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${!n.read_at ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                            {translateNotification(n, t).title}
                          </p>
                          {!n.read_at && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{translateNotification(n, t).message}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100">
              <Link
                href={notificationsHref}
                onClick={() => setDropdownOpen(false)}
                className="block text-center py-2.5 text-sm text-[#D4AF37] hover:text-[#b8962e] hover:bg-gray-50 font-medium transition-colors"
              >
                {t('notifications.viewAll') || 'View all notifications'}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
