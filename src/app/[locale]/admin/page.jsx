'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, Building2, ShieldCheck, Calendar, Ban, Loader2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          setStats(await res.json());
        }
      } catch {
        // leave null
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const cards = stats ? [
    { label: t('admin.stats.totalUsers'), value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: t('admin.stats.totalBusiness'), value: stats.totalBusiness, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('admin.stats.pendingVerifications'), value: stats.pendingVerifications, icon: ShieldCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: t('admin.stats.totalAppointments'), value: stats.totalAppointments, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: t('admin.stats.suspendedUsers'), value: stats.suspendedUsers, icon: Ban, color: 'text-red-600', bg: 'bg-red-50' },
  ] : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard.title')}</h1>
        <p className="text-gray-500 mt-1">{t('admin.dashboard.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t('admin.loading')}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-[5px] border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
