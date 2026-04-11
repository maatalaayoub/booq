'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Loader2,
  Calendar,
  UserPlus,
  UserMinus,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, usePathname, useRouter } from 'next/navigation';
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

function formatTime(dateStr, t) {
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
}

export default function NotificationPopup({ className, iconSize = 'h-5 w-5' }) {
  const { t, isRTL } = useLanguage();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = params.locale || 'en';
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const popupRef = useRef(null);

  // Detect dashboard context for "View all" link
  const isWorkerDashboard = pathname.includes('/worker/dashboard');
  const isBusinessDashboard = pathname.includes('/business/dashboard');
  const notificationsHref = isWorkerDashboard
    ? `/${locale}/worker/dashboard/notifications`
    : isBusinessDashboard
      ? `/${locale}/business/dashboard/notifications`
      : `/${locale}/notifications`;

  const isDashboard = isWorkerDashboard || isBusinessDashboard;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
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
      setHasFetched(true);
    }
  }, []);

  // Fetch unread count on mount + poll every 30s
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications?countOnly=true');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // silent
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      fetchNotifications();
    }
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

  const handleDelete = async (notificationId) => {
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

  const handleNotificationClick = (n) => {
    if (!n.read_at) markAsRead(n.id);
    setIsOpen(false);
    router.push(`${notificationsHref}?open=${n.id}`);
  };

  return (
    <div className="relative" ref={popupRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className={className}
        aria-label="Notifications"
      >
        <Bell className={iconSize} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-[99] sd:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`fixed left-2 right-2 top-16 sd:absolute sd:top-full sd:mt-2 ${isRTL && isDashboard ? 'sd:right-auto sd:left-0' : 'sd:left-auto sd:right-0'} z-[100] sd:w-[340px] max-h-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col`}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                {t('notifications.title') || 'Notifications'}
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title={t('notifications.markAllRead') || 'Mark all read'}
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {loading && !hasFetched ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('notifications.empty') || 'No notifications'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('notifications.emptyDesc') || "You'll see notifications here when there's activity"}
                  </p>
                </div>
              ) : (
                <div>
                  {notifications.slice(0, 10).map((n) => {
                    const IconComponent = TYPE_ICONS[n.type] || Info;
                    const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.general;

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`px-4 py-3 border-b border-gray-50 transition-colors group hover:bg-gray-50/50 cursor-pointer ${
                          !n.read_at ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {n.data?.businessAvatar ? (
                            <img src={n.data.businessAvatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] leading-snug ${!n.read_at ? 'font-semibold' : 'font-medium'} text-gray-900 line-clamp-2`}>
                              {translateNotification(n, t).title}
                            </p>
                            {n.message && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{translateNotification(n, t).message}</p>
                            )}
                            <p className="text-[11px] text-gray-400 mt-1">{formatTime(n.created_at, t)}</p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {!n.read_at && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                title={t('notifications.markRead') || 'Mark as read'}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title={t('notifications.delete') || 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <Link
              href={notificationsHref}
              onClick={() => setIsOpen(false)}
              className="block text-center py-2.5 text-[13px] font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              {t('notifications.viewAll') || 'View all notifications'}
            </Link>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
