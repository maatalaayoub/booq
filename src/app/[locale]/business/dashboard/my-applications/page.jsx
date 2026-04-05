'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Calendar,
  MapPin,
  Briefcase,
  Loader2,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  X,
  RotateCw,
} from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  reviewed: { label: 'Reviewed', color: 'bg-blue-100 text-blue-700', icon: Eye },
  interview: { label: 'Interview', color: 'bg-purple-100 text-purple-700', icon: MessageSquare },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-500', icon: X },
};

const PROFESSIONAL_TYPE_LABELS = {
  barber: 'Barber',
  hairdresser: 'Hairdresser',
  makeup: 'Makeup Artist',
  nails: 'Nail Technician',
  massage: 'Massage Therapist',
};

function ApplicationSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-[5px] border border-gray-300 p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ApplicationCard({ application, onWithdraw, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const canWithdraw = ['pending', 'reviewed'].includes(application.status);
  const canDelete = ['withdrawn', 'rejected'].includes(application.status);
  const date = new Date(application.createdAt || application.created_at);

  return (
    <div className="bg-white rounded-[5px] border border-gray-300 p-5 hover:border-gray-400 transition-colors">
      <div className="flex items-start gap-4">
        {/* Business Avatar */}
        <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
          {application.ownerImage ? (
            <img src={application.ownerImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Briefcase className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 truncate">
                {application.businessName}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                {application.professionalType && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {PROFESSIONAL_TYPE_LABELS[application.professionalType] || application.professionalType}
                  </span>
                )}
                {application.businessCity && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {application.businessCity}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {date.toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={application.status} />

              {/* Actions menu */}
              {(canWithdraw || canDelete) && (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[5px] transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-[5px] shadow-lg z-20 py-1 min-w-[140px]">
                        {canWithdraw && (
                          <button
                            onClick={() => { setMenuOpen(false); onWithdraw(application.id); }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <X className="w-3.5 h-3.5" />
                            Withdraw
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => { setMenuOpen(false); onDelete(application.id); }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cover letter preview */}
          {application.coverLetter && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {application.coverLetter}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyApplicationsPage() {
  const { t } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/business/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/business/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error('Error refreshing applications:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleWithdraw = async (id) => {
    try {
      const res = await fetch(`/api/business/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'withdrawn' }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'withdrawn' } : a))
        );
      }
    } catch (err) {
      console.error('Error withdrawing application:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/business/applications/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting application:', err);
    }
  };

  const filtered = applications.filter((app) => {
    if (filter !== 'all' && app.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (app.businessName || '').toLowerCase().includes(q) ||
        (app.businessCity || '').toLowerCase().includes(q) ||
        (app.ownerName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div>
        <div className="bg-gradient-to-r from-[#364153] to-[#4a5568] rounded-[5px] p-6 mb-6">
          <div className="h-7 w-48 bg-white/20 rounded mb-2 animate-pulse" />
          <div className="h-4 w-64 bg-white/10 rounded animate-pulse" />
        </div>
        <ApplicationSkeleton />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#364153] to-[#4a5568] rounded-[5px] p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              {t?.('dashboard.sidebar.myApplications') || 'My Applications'}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Track and manage your job applications
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-[5px] transition-colors disabled:opacity-50"
            title={t?.('common.refresh') || 'Refresh'}
          >
            <RotateCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { key: 'all', label: 'All', count: applications.length, color: 'bg-gray-100 text-gray-700' },
          { key: 'pending', label: 'Pending', count: statusCounts.pending || 0, color: 'bg-yellow-50 text-yellow-700' },
          { key: 'reviewed', label: 'Reviewed', count: statusCounts.reviewed || 0, color: 'bg-blue-50 text-blue-700' },
          { key: 'interview', label: 'Interview', count: statusCounts.interview || 0, color: 'bg-purple-50 text-purple-700' },
          { key: 'accepted', label: 'Accepted', count: statusCounts.accepted || 0, color: 'bg-green-50 text-green-700' },
          { key: 'rejected', label: 'Rejected', count: statusCounts.rejected || 0, color: 'bg-red-50 text-red-700' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`rounded-[5px] border p-3 text-center transition-colors ${
              filter === s.key
                ? 'border-[#364153] bg-[#364153]/5'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-lg font-bold text-gray-900">{s.count}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name or city..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-[5px] text-sm focus:outline-none focus:ring-2 focus:ring-[#364153]/20 focus:border-[#364153]"
          />
        </div>
      </div>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-[5px] border border-gray-300 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-900 font-medium mb-1">
            {applications.length === 0
              ? 'No applications yet'
              : 'No matching applications'}
          </h3>
          <p className="text-sm text-gray-500">
            {applications.length === 0
              ? (t?.('dashboard.jobSeeker.noApplications') || 'Start applying to jobs to see them here!')
              : 'Try adjusting your search or filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onWithdraw={handleWithdraw}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
