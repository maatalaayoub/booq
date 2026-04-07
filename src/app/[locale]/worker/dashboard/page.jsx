'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorker } from '@/contexts/WorkerContext';
import {
  Calendar,
  Clock,
  CheckCircle,
  RotateCw,
  User,
  Shield,
} from 'lucide-react';
import AppointmentDetailModal from '@/components/dashboard/AppointmentDetailModal';

export default function WorkerDashboardPage() {
  const { t, isRTL } = useLanguage();
  const { activeMembership, permissions } = useWorker();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchAppointments = useCallback(async () => {
    if (!activeMembership?.businessInfoId) return;
    if (!permissions?.canManageAppointments) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/worker/appointments?businessId=${activeMembership.businessInfoId}`
      );
      if (res.ok) {
        const body = await res.json();
        setAppointments(body.data || body || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeMembership?.businessInfoId, permissions?.canManageAppointments]);

  useEffect(() => {
    setLoading(true);
    fetchAppointments();
  }, [fetchAppointments]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  // Get today's appointments
  const today = new Date().toISOString().slice(0, 10);
  const todayAppts = appointments.filter(
    (a) => a.start_time?.slice(0, 10) === today && a.status !== 'cancelled'
  );
  const confirmedToday = todayAppts.filter((a) => a.status === 'confirmed');
  const pendingToday = todayAppts.filter((a) => a.status === 'pending');

  // Upcoming (future, non-cancelled)
  const now = new Date().toISOString();
  const upcoming = appointments
    .filter((a) => a.start_time > now && a.status !== 'cancelled')
    .slice(0, 5);

  // Convert appointment to modal format
  const toModalFormat = (appt) => ({
    id: appt.id,
    title: appt.client_name || 'Client',
    start: appt.start_time,
    end: appt.end_time,
    extendedProps: {
      status: appt.status,
      client: appt.client_name,
      service: appt.service,
      phone: appt.client_phone,
      notes: appt.notes,
      price: appt.price,
      clientAddress: appt.client_address,
      businessInfoId: activeMembership?.businessInfoId,
      rescheduled_by: appt.rescheduled_by,
      previous_start_time: appt.previous_start_time,
      previous_end_time: appt.previous_end_time,
    },
  });

  // Worker appointment actions via worker API
  const updateAppointmentStatus = async (id, status) => {
    try {
      const res = await fetch('/api/worker/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, businessId: activeMembership?.businessInfoId, status }),
      });
      if (res.ok) fetchAppointments();
    } catch (err) {
      console.error('Failed to update appointment:', err);
    }
  };

  const handleConfirm = (id) => updateAppointmentStatus(id, 'confirmed');
  const handleComplete = (id) => updateAppointmentStatus(id, 'completed');
  const handleCancel = (id) => updateAppointmentStatus(id, 'cancelled');

  const permList = [
    { key: 'canManageAppointments', label: t('team.perm.canManageAppointments') || 'Manage Appointments' },
    { key: 'canEditSchedule', label: t('team.perm.canEditSchedule') || 'Edit Schedule' },
    { key: 'canManageServices', label: t('team.perm.canManageServices') || 'Manage Services' },
    { key: 'canViewEarnings', label: t('team.perm.canViewEarnings') || 'View Earnings' },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {t('worker.overview') || 'Worker Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeMembership?.businessName || ''}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      {permissions?.canManageAppointments && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{todayAppts.length}</p>
                <p className="text-xs text-gray-500">{t('worker.todayAppointments') || "Today's Appointments"}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{confirmedToday.length}</p>
                <p className="text-xs text-gray-500">{t('worker.confirmed') || 'Confirmed'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingToday.length}</p>
                <p className="text-xs text-gray-500">{t('worker.pending') || 'Pending'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming appointments */}
      {permissions?.canManageAppointments && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              {t('worker.upcomingAppointments') || 'Upcoming Appointments'}
            </h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {t('worker.noUpcoming') || 'No upcoming appointments'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcoming.map((appt) => {
                const start = new Date(appt.start_time);
                const dateStr = start.toLocaleDateString(isRTL ? 'ar' : 'en', {
                  weekday: 'short', month: 'short', day: 'numeric',
                });
                const timeStr = start.toLocaleTimeString(isRTL ? 'ar' : 'en', {
                  hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div key={appt.id} className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedBooking(appt)}>
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {appt.client_name || t('worker.walkIn') || 'Walk-in'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {appt.service || ''}
                      </p>
                    </div>
                    <div className={`text-${isRTL ? 'left' : 'right'} flex-shrink-0`}>
                      <p className="text-xs font-medium text-gray-900">{timeStr}</p>
                      <p className="text-[11px] text-gray-400">{dateStr}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      appt.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {appt.status === 'confirmed'
                        ? (t('worker.statusConfirmed') || 'Confirmed')
                        : (t('worker.statusPending') || 'Pending')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        appointment={selectedBooking ? toModalFormat(selectedBooking) : null}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onConfirm={async (id) => { await handleConfirm(id); }}
        onComplete={async (id) => { await handleComplete(id); }}
        onCancel={async (id) => { await handleCancel(id); }}
        onReschedule={() => { setSelectedBooking(null); fetchAppointments(); }}
        mode="worker"
        businessId={activeMembership?.businessInfoId}
      />

      {/* Permissions overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-[#D4AF37]" />
          <h2 className="text-sm font-semibold text-gray-900">
            {t('worker.yourPermissions') || 'Your Permissions'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {permList.map(({ key, label }) => (
            <div
              key={key}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                permissions[key]
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${permissions[key] ? 'bg-green-500' : 'bg-gray-300'}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
