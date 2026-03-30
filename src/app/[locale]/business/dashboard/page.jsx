'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useRole } from '@/hooks/useRole';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessCategory } from '@/contexts/BusinessCategoryContext';
import BusinessOnboarding from '@/components/BusinessOnboarding';
import AppointmentDetailModal from '@/components/dashboard/AppointmentDetailModal';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, XCircle, CalendarDays, Clock, ChevronLeft, ChevronRight, Check, Loader2, ArrowRight } from 'lucide-react';

export default function BusinessDashboard() {
  const { 
    role, 
    isBusiness, 
    hasRole, 
    isLoaded, 
    isSignedIn,
    user,
    refetch 
  } = useRole();
  const { t } = useLanguage();
  const { businessCategory } = useBusinessCategory();
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale || 'en';
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [setupError, setSetupError] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [conflictDialog, setConflictDialog] = useState(null); // { approvedId, conflicts: [...] }
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date(); d.setUTCHours(0,0,0,0); return d.toISOString().slice(0,10);
  });
  
  // Ref to track if we've handled the setup (prevents redirect after URL clean)
  const setupHandledRef = useRef(false);

  // Debug logging
  useEffect(() => {
    console.log('[Dashboard] State:', { 
      isLoaded, isSignedIn, role, isBusiness, hasRole, 
      isSettingUp, setupComplete, isCheckingOnboarding,
      onboardingStatus,
      setupParam: searchParams.get('setup')
    });
  }, [isLoaded, isSignedIn, role, isBusiness, hasRole, isSettingUp, setupComplete, isCheckingOnboarding, onboardingStatus, searchParams]);

  // Notify layout about onboarding status
  const notifyLayout = (completed) => {
    window.dispatchEvent(new CustomEvent('onboarding-status', { 
      detail: { completed } 
    }));
  };

  // Check onboarding status
  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/business/onboarding');
      
      // Check content type to ensure it's JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('API returned non-JSON response');
        setIsCheckingOnboarding(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setOnboardingStatus(data);
        notifyLayout(data.onboardingCompleted);
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    } finally {
      setIsCheckingOnboarding(false);
    }
  };

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/business/dashboard-stats');
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[fetchStats] API returned non-JSON response');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Transform a booking from stats into the format AppointmentDetailModal expects
  const toModalFormat = (booking) => ({
    id: booking.id,
    title: booking.client_name || 'Client',
    start: booking.start_time,
    end: booking.end_time,
    extendedProps: {
      status: booking.status,
      client: booking.client_name,
      service: booking.service,
      phone: booking.client_phone,
      notes: booking.notes,
      price: booking.price,
      clientAddress: booking.client_address,
      businessInfoId: booking.business_info_id,
      rescheduled_by: booking.rescheduled_by,
      previous_start_time: booking.previous_start_time,
      previous_end_time: booking.previous_end_time,
    },
  });

  // Update appointment status via API
  const updateAppointmentStatus = async (id, status) => {
    try {
      const res = await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) fetchStats();
    } catch (err) {
      console.error('Failed to update appointment:', err);
    }
  };

  // Find conflicting appointments (same time slot, excluding the one being approved)
  const findConflicts = (booking) => {
    if (!stats?.upcomingBookings) return [];
    return stats.upcomingBookings.filter(b =>
      b.id !== booking.id &&
      b.status === 'pending' &&
      new Date(b.start_time) < new Date(booking.end_time) &&
      new Date(b.end_time) > new Date(booking.start_time)
    );
  };

  const handleConfirm = (id) => {
    const booking = stats?.upcomingBookings?.find(b => b.id === id);
    if (!booking) return;
    const conflicts = findConflicts(booking);
    if (conflicts.length > 0) {
      setConflictDialog({ approvedId: id, conflicts });
    } else {
      updateAppointmentStatus(id, 'confirmed');
    }
  };

  // Delete appointment from database
  const deleteAppointment = async (id) => {
    try {
      const res = await fetch(`/api/business/appointments?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchStats();
    } catch (err) {
      console.error('Failed to delete appointment:', err);
    }
  };

  const handleConflictResolve = async (action) => {
    // no longer used — kept as no-op
  };

  // ── New multi-step conflict resolution ──

  // Step 1: User picks action per conflict (cancel / reschedule)
  // conflictDialog.decisions = { [id]: 'cancel' | 'reschedule' }
  const setDecision = (id, decision) => {
    setConflictDialog(prev => ({
      ...prev,
      decisions: { ...(prev.decisions || {}), [id]: decision },
    }));
  };

  // Step 2: Proceed to reschedule phase (or confirmation if none to reschedule)
  const proceedFromDecisions = () => {
    if (!conflictDialog) return;
    const decisions = conflictDialog.decisions || {};
    const toReschedule = conflictDialog.conflicts.filter(c => decisions[c.id] === 'reschedule');
    if (toReschedule.length === 0) {
      // All are cancel → go straight to confirmation
      setConflictDialog(prev => ({ ...prev, step: 'confirm', rescheduleResults: {} }));
    } else {
      // Start rescheduling the first one
      setConflictDialog(prev => ({ ...prev, step: 'reschedule', rescheduleQueue: toReschedule, rescheduleQueueIdx: 0, rescheduleResults: {}, rescheduledRanges: [] }));
      loadSlotsForReschedule(toReschedule[0], conflictDialog.rescheduledRanges || []);
    }
  };

  // Generate next 14 days for date picker
  const generateDateOptions = (startDate) => {
    const dates = [];
    const base = new Date(startDate);
    base.setUTCHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const formatDateStr = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadSlotsForReschedule = async (conflict, existingRanges, dateOverride) => {
    setConflictDialog(prev => ({ ...prev, slotsLoading: true, slots: null, rescheduleError: null, closedMessage: null }));
    try {
      const startDt = new Date(conflict.start_time);
      const endDt = new Date(conflict.end_time);
      const duration = Math.round((endDt - startDt) / 60000);
      const date = dateOverride || formatDateStr(startDt);
      const bizId = conflict.business_info_id;
      const res = await fetch(`/api/book/available-slots?businessId=${encodeURIComponent(bizId)}&date=${date}&duration=${duration}`);
      const data = await res.json();

      // If the day is closed (holiday, day off, full-day exception), track it
      if (data.closed) {
        setConflictDialog(prev => ({
          ...prev,
          slots: [],
          slotsLoading: false,
          rescheduleSelectedDate: date,
          rescheduleDateOptions: prev.rescheduleDateOptions || generateDateOptions(new Date(conflict.start_time)),
          closedMessage: data.message || null,
          closedDates: { ...(prev.closedDates || {}), [date]: data.message || true },
        }));
        return;
      }

      let availableSlots = (data.slots || []).filter(s => s.available);

      // Filter out the approved booking's time range
      const approvedBooking = stats?.upcomingBookings?.find(b => b.id === conflictDialog.approvedId);
      const reservedRanges = [];
      if (approvedBooking) {
        const aStart = new Date(approvedBooking.start_time);
        const aEnd = new Date(approvedBooking.end_time);
        const approvedDate = formatDateStr(aStart);
        if (date === approvedDate) {
          reservedRanges.push({
            start: `${String(aStart.getUTCHours()).padStart(2, '0')}:${String(aStart.getUTCMinutes()).padStart(2, '0')}`,
            end: `${String(aEnd.getUTCHours()).padStart(2, '0')}:${String(aEnd.getUTCMinutes()).padStart(2, '0')}`,
          });
        }
      }
      // Include previously rescheduled ranges (only for the same date)
      if (existingRanges) {
        for (const r of existingRanges) {
          if (r.date === date) reservedRanges.push(r);
        }
      }
      if (reservedRanges.length > 0) {
        availableSlots = availableSlots.filter(slot =>
          !reservedRanges.some(r => slot.start < r.end && slot.end > r.start)
        );
      }

      setConflictDialog(prev => ({
        ...prev,
        slots: availableSlots,
        slotsLoading: false,
        rescheduleSelectedDate: date,
        rescheduleDateOptions: prev.rescheduleDateOptions || generateDateOptions(new Date(conflict.start_time)),
        closedMessage: null,
      }));
    } catch (err) {
      console.error('Failed to fetch slots:', err);
      setConflictDialog(prev => ({ ...prev, slots: [], slotsLoading: false }));
    }
  };

  const handleDateChange = (dateStr) => {
    if (!conflictDialog) return;
    const conflict = conflictDialog.rescheduleQueue[conflictDialog.rescheduleQueueIdx];
    setConflictDialog(prev => ({ ...prev, rescheduleSelectedDate: dateStr }));
    loadSlotsForReschedule(conflict, conflictDialog.rescheduledRanges || [], dateStr);
  };

  const handleSlotPick = (slot) => {
    if (!conflictDialog) return;
    const conflict = conflictDialog.rescheduleQueue[conflictDialog.rescheduleQueueIdx];
    const date = conflictDialog.rescheduleSelectedDate;
    const newStart = `${date}T${slot.start}:00Z`;
    const newEnd = `${date}T${slot.end}:00Z`;
    const newRange = { start: slot.start, end: slot.end, date };

    const updatedResults = { ...conflictDialog.rescheduleResults, [conflict.id]: { newStart, newEnd, slotLabel: `${slot.start} → ${slot.end}`, dateLabel: date } };
    const updatedRanges = [...(conflictDialog.rescheduledRanges || []), newRange];
    const nextIdx = conflictDialog.rescheduleQueueIdx + 1;

    if (nextIdx < conflictDialog.rescheduleQueue.length) {
      setConflictDialog(prev => ({
        ...prev,
        rescheduleResults: updatedResults,
        rescheduledRanges: updatedRanges,
        rescheduleQueueIdx: nextIdx,
        slots: null,
        slotsLoading: true,
        rescheduleError: null,
      }));
      loadSlotsForReschedule(conflictDialog.rescheduleQueue[nextIdx], updatedRanges);
    } else {
      // All rescheduled — go to confirmation
      setConflictDialog(prev => ({
        ...prev,
        rescheduleResults: updatedResults,
        rescheduledRanges: updatedRanges,
        step: 'confirm',
      }));
    }
  };

  // Step 3: Execute all changes
  const executeConflictResolution = async () => {
    if (!conflictDialog) return;
    setConflictDialog(prev => ({ ...prev, saving: true, saveError: null }));

    try {
      // 1. Confirm the approved appointment
      const confirmRes = await fetch('/api/business/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conflictDialog.approvedId, status: 'confirmed' }),
      });
      if (!confirmRes.ok) throw new Error('Failed to confirm appointment');

      const decisions = conflictDialog.decisions || {};
      const rescheduleResults = conflictDialog.rescheduleResults || {};

      // 2. Process each conflict
      for (const c of conflictDialog.conflicts) {
        if (decisions[c.id] === 'cancel') {
          await fetch(`/api/business/appointments?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
        } else if (decisions[c.id] === 'reschedule' && rescheduleResults[c.id]) {
          const r = rescheduleResults[c.id];
          const res = await fetch('/api/business/appointments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: c.id, start_time: r.newStart, end_time: r.newEnd, status: 'confirmed' }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Failed to reschedule ${c.client_name}`);
          }
        }
      }

      setConflictDialog(null);
      fetchStats();
    } catch (err) {
      console.error('Failed to execute resolution:', err);
      setConflictDialog(prev => ({ ...prev, saving: false, saveError: err.message }));
    }
  };

  const handleCancel = (id) => deleteAppointment(id);
  const handleComplete = (id) => updateAppointmentStatus(id, 'completed');

  useEffect(() => {
    async function setupRole() {
      const setupParam = searchParams.get('setup');
      console.log('[Dashboard] setupRole running:', { setupParam, isLoaded, isSignedIn, isBusiness, hasRole, setupComplete, setupHandled: setupHandledRef.current });
      
      // Wait for auth and role data to load
      if (!isLoaded || !isSignedIn) {
        console.log('[Dashboard] Not ready yet, waiting...');
        return;
      }
      
      // If user already has business role, check onboarding and clean URL
      if (isBusiness) {
        console.log('[Dashboard] User is business, checking onboarding...');
        if (setupParam) {
          window.history.replaceState({}, '', `/${locale}/business/dashboard`);
        }
        setupHandledRef.current = true;
        setSetupComplete(true);
        checkOnboardingStatus();
        fetchStats();
        return;
      }

      // If user has a different role (user role), redirect home
      if (hasRole && !isBusiness) {
        console.log('[Dashboard] User has different role, redirecting...');
        router.push(`/${locale}`);
        return;
      }

      // If user has no role and setup param exists, show onboarding (role will be assigned on completion)
      if (!hasRole && setupParam === 'business') {
        console.log('[Dashboard] Showing onboarding flow (role will be assigned on completion)...');
        // Mark as handled BEFORE cleaning URL
        setupHandledRef.current = true;
        // Clean URL but keep showing onboarding
        window.history.replaceState({}, '', `/${locale}/business/dashboard`);
        setSetupComplete(true); // This triggers showing onboarding
        setIsCheckingOnboarding(false);
        // Set onboarding status to show the form
        setOnboardingStatus({ onboardingCompleted: false });
        return;
      }

      // If setup was already handled (URL was cleaned), don't redirect
      if (setupHandledRef.current || setupComplete) {
        console.log('[Dashboard] Setup already handled, not redirecting');
        setIsCheckingOnboarding(false);
        return;
      }

      // If user has no role and no setup param, redirect to sign-up
      // Sign-in page now blocks new users, so they must go through sign-up
      if (!hasRole && !setupParam) {
        console.log('[Dashboard] No role - redirecting to sign-up...');
        router.push(`/${locale}/auth/business/sign-up`);
        return;
      }
      
      // Fallback: no matching condition, stop checking
      console.log('[Dashboard] No matching condition, stopping checks');
      setIsCheckingOnboarding(false);
    }

    setupRole();
    // Note: setupComplete is NOT in dependencies to prevent re-triggering after we set it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, isBusiness, hasRole, searchParams, locale, router]);

  const handleOnboardingComplete = async () => {
    // Refetch role since it was assigned during onboarding completion
    await refetch();
    setOnboardingStatus({ ...onboardingStatus, onboardingCompleted: true });
    notifyLayout(true);
    fetchStats();
  };

  // Show error if setup failed
  if (setupError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Setup Error</h2>
          <p className="text-gray-500 mb-6">{setupError}</p>
          <a
            href={`/${locale}/auth/business/sign-up`}
            className="inline-block px-6 py-3 bg-[#D4AF37] text-white rounded-lg font-medium hover:bg-[#C4A037] transition-colors"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  // Consolidated loading state - only show ONE loading screen
  if (!isLoaded || isSettingUp || isCheckingOnboarding || (searchParams.get('setup') && !setupComplete && !hasRole)) {
    return (
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-96 bg-gray-100 rounded" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[3px] p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-3.5 w-28 bg-gray-200 rounded mb-3" />
                  <div className="h-7 w-12 bg-gray-200 rounded" />
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming bookings skeleton */}
        <div className="bg-white rounded-[3px] border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="h-5 w-48 bg-gray-200 rounded" />
          </div>
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not a business user (extra client-side protection)
  // Only redirect if user has a different role, not if they have no role (new user)
  if (isLoaded && isSignedIn && hasRole && !isBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if:
  // 1. User is business but hasn't completed onboarding
  // 2. User has no role yet but came from signup (setupComplete is true)
  const shouldShowOnboarding = (isBusiness && onboardingStatus && !onboardingStatus.onboardingCompleted) ||
    (!hasRole && setupComplete && onboardingStatus && !onboardingStatus.onboardingCompleted);
  
  console.log('[Dashboard] Render check:', { 
    isBusiness, hasRole, setupComplete, 
    onboardingStatus, 
    shouldShowOnboarding,
    isLoaded, isSignedIn
  });
    
  if (shouldShowOnboarding) {
    return (
      <BusinessOnboarding 
        userName={user?.firstName} 
        onComplete={handleOnboardingComplete} 
      />
    );
  }

  // Job Seeker dashboard
  if (businessCategory === 'job_seeker') {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t?.('dashboard.welcome') || 'Welcome back'}, {user?.firstName}!
          </h1>
          <p className="text-gray-500 mt-1">
            {t?.('dashboard.jobSeeker.subtitle') || "Here's an overview of your job search progress."}
          </p>
        </div>

        {/* Job Seeker Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-[3px] p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t?.('dashboard.jobSeeker.stats.applications') || 'Applications Sent'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.applicationsSent ?? 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3px] p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t?.('dashboard.jobSeeker.stats.interviews') || 'Upcoming Interviews'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.upcomingInterviews ?? 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3px] p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t?.('dashboard.jobSeeker.stats.savedJobs') || 'Saved Jobs'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.savedJobs ?? 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3px] p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{t?.('dashboard.jobSeeker.stats.messages') || 'Unread Messages'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.unreadMessages ?? 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-[3px] border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t?.('dashboard.jobSeeker.recentApplications') || 'Recent Applications'}</h2>
          </div>
          {statsLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : stats?.recentApplications?.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {stats.recentApplications.map((app) => (
                <div key={app.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold text-sm">
                    {(app.business_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{app.business_name}</p>
                    <p className="text-xs text-gray-500">{app.position}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>{t?.('dashboard.jobSeeker.noApplications') || 'No applications yet. Start applying to jobs!'}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Service provider dashboard (salon_owner / mobile_service)
  return (
    <div>
      {/* Dashboard content */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t?.('dashboard.welcome') || 'Welcome back'}, {user?.firstName}!
        </h1>
        <p className="text-gray-500 mt-1">
          {t?.('dashboard.subtitle') || "Here's what's happening with your business today."}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-[3px] p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{t?.('dashboard.stats.todayAppointments') || "Today's Bookings"}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.todayBookings ?? 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-[3px] p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{t?.('dashboard.stats.weeklyRevenue') || "This Week's Revenue"}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? <span className="inline-block w-16 h-7 bg-gray-200 rounded animate-pulse" /> : `${stats?.weeklyRevenue ?? 0} MAD`}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {businessCategory === 'mobile_service' ? (
          <>
            <div className="bg-white rounded-[3px] p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t?.('dashboard.stats.serviceArea') || 'Service Area'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (
                      <>
                        {stats?.serviceArea ?? 0}
                        <span className="text-sm font-normal text-gray-500 ml-1">{t?.('dashboard.stats.cities') || 'cities'}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[3px] p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t?.('dashboard.stats.travelEarnings') || 'Travel Earnings'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statsLoading ? <span className="inline-block w-16 h-7 bg-gray-200 rounded animate-pulse" /> : `${stats?.travelEarnings ?? 0} MAD`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-[3px] p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t?.('dashboard.stats.totalClients') || 'Total Clients'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.totalClients ?? 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[3px] p-6 border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{t?.('dashboard.stats.avgRating') || 'Rating'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statsLoading ? <span className="inline-block w-8 h-7 bg-gray-200 rounded animate-pulse" /> : (stats?.rating ? `${stats.rating} ★` : 'N/A')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Upcoming Bookings */}
      {(() => {
        // Generate 30 day options starting from today
        const today = new Date(); today.setUTCHours(0,0,0,0);
        const dayOptions = Array.from({ length: 30 }, (_, i) => {
          const d = new Date(today); d.setUTCDate(d.getUTCDate() + i); return d;
        });
        // Filter bookings by selected day
        const filteredBookings = (stats?.upcomingBookings || []).filter(b => {
          const bDate = new Date(b.start_time);
          const bStr = bDate.getUTCFullYear() + '-' + String(bDate.getUTCMonth()+1).padStart(2,'0') + '-' + String(bDate.getUTCDate()).padStart(2,'0');
          return bStr === selectedDay;
        });
        return (
      <div className="bg-white rounded-[3px] border border-gray-200">
        <div className="p-6 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t?.('dashboard.upcomingAppointments') || 'Upcoming Bookings'}</h2>
          {/* Day selector strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 pt-1 -mx-1 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {dayOptions.map(d => {
              const ds = d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0') + '-' + String(d.getUTCDate()).padStart(2,'0');
              const isSelected = ds === selectedDay;
              const dayCount = (stats?.upcomingBookings || []).filter(b => {
                const bd = new Date(b.start_time);
                return (bd.getUTCFullYear() + '-' + String(bd.getUTCMonth()+1).padStart(2,'0') + '-' + String(bd.getUTCDate()).padStart(2,'0')) === ds;
              }).length;
              return (
                <button
                  key={ds}
                  onClick={() => setSelectedDay(ds)}
                  className={`flex flex-col items-center min-w-[56px] px-2 py-2 rounded-xl border text-center transition-all shrink-0 ${
                    isSelected
                      ? 'border-[#D4AF37] bg-amber-50 ring-1 ring-amber-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-[10px] font-medium text-gray-400 uppercase">
                    {d.toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short', timeZone: 'UTC' })}
                  </span>
                  <span className={`text-[16px] font-bold ${isSelected ? 'text-amber-700' : 'text-gray-900'}`}>
                    {d.getUTCDate()}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {d.toLocaleDateString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', timeZone: 'UTC' })}
                  </span>
                  {dayCount > 0 && (
                    <span className={`mt-0.5 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                      isSelected ? 'bg-[#D4AF37] text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {dayCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {statsLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
                <div className="h-4 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredBookings.map((booking) => {
              const startDate = new Date(booking.start_time);
              const endDate = new Date(booking.end_time);
              const startStr = startDate.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC',
              });
              const endStr = endDate.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC',
              });
              // When the booking was created
              const bookedAt = booking.created_at ? new Date(booking.created_at) : null;
              const bookedAtStr = bookedAt ? bookedAt.toLocaleString(locale === 'ar' ? 'ar-MA' : locale === 'fr' ? 'fr-FR' : 'en-GB', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
              }) : null;
              return (
                <div key={booking.id} className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedBooking(booking)}>
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold text-sm">
                    {(booking.client_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{booking.client_name}</p>
                    <p className="text-xs text-gray-500">{booking.service}</p>
                    {bookedAtStr && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{t?.('dashboard.bookedAt') || 'Booked'}: {bookedAtStr}</p>
                    )}
                    {booking.rescheduled_by === 'client' && (
                      <p className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                        {t?.('appointmentDetail.modifiedByClient') || 'Modified by client'}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-gray-900">{startStr} - {endStr}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>{t?.('dashboard.noAppointmentsForDay') || 'No appointments for this day'}</p>
          </div>
        )}
      </div>
        );
      })()}

      {/* Appointment Detail Modal */}
      <AppointmentDetailModal
        appointment={selectedBooking ? toModalFormat(selectedBooking) : null}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onConfirm={(id) => { setSelectedBooking(null); handleConfirm(id); }}
        onComplete={(id) => { setSelectedBooking(null); handleComplete(id); }}
        onCancel={(id) => { setSelectedBooking(null); handleCancel(id); }}
        onReschedule={() => { setSelectedBooking(null); fetchStats(); }}
      />

      {/* Conflict Resolution Dialog */}
      <AnimatePresence>
        {conflictDialog && (() => {
          const currentStep = conflictDialog.step || 'decide';
          const steps = ['decide', 'reschedule', 'confirm'];
          const hasReschedules = conflictDialog.conflicts?.some(c => conflictDialog.decisions?.[c.id] === 'reschedule');
          const activeSteps = hasReschedules ? steps : ['decide', 'confirm'];
          const stepIndex = activeSteps.indexOf(currentStep);

          return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !conflictDialog.saving && setConflictDialog(null)} />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative bg-white rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)] w-full max-w-[440px] max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header with step indicator ── */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                {/* Step dots */}
                <div className="flex items-center justify-center gap-2 mb-5">
                  {activeSteps.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i < stepIndex ? 'bg-[#D4AF37]' :
                        i === stepIndex ? 'bg-[#D4AF37] w-6 rounded-full' :
                        'bg-gray-200'
                      }`} />
                      {i < activeSteps.length - 1 && (
                        <div className={`w-8 h-[2px] rounded transition-colors duration-300 ${
                          i < stepIndex ? 'bg-[#D4AF37]' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Icon + Title */}
                <div className="flex flex-col items-center text-center">
                  {currentStep === 'decide' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-3 shadow-sm">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="text-[17px] font-bold text-gray-900">
                        {t?.('dashboard.conflictTitle') || 'Time Conflict Detected'}
                      </h3>
                      <p className="text-[13px] text-gray-400 mt-1">
                        {t?.('dashboard.conflictDesc2') || 'Choose what to do with each overlapping appointment:'}
                      </p>
                    </>
                  )}
                  {currentStep === 'reschedule' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-3 shadow-sm">
                        <CalendarDays className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-[17px] font-bold text-gray-900">
                        {t?.('dashboard.rescheduleTitle') || 'Reschedule Appointment'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[13px] text-gray-400">
                          {t?.('dashboard.rescheduleDesc') || 'Pick a new time slot for'}
                        </span>
                        <span className="text-[13px] font-semibold text-gray-700">
                          {conflictDialog.rescheduleQueue?.[conflictDialog.rescheduleQueueIdx]?.client_name}
                        </span>
                      </div>
                      {conflictDialog.rescheduleQueue?.length > 1 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {conflictDialog.rescheduleQueue.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                              i <= conflictDialog.rescheduleQueueIdx ? 'bg-blue-500 w-4' : 'bg-gray-200 w-1.5'
                            }`} />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {currentStep === 'confirm' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center mb-3 shadow-sm">
                        <Check className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-[17px] font-bold text-gray-900">
                        {t?.('dashboard.confirmChangesTitle') || 'Confirm Changes'}
                      </h3>
                      <p className="text-[13px] text-gray-400 mt-1">
                        {t?.('dashboard.confirmChangesDesc') || 'Please review the changes before saving:'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* ── Scrollable content ── */}
              <div className="flex-1 overflow-y-auto px-6 py-4">

              {/* ── STEP 1: Choose action per conflict ── */}
              {currentStep === 'decide' && (
                <div className="space-y-3">
                  {conflictDialog.conflicts.map(c => {
                    const start = new Date(c.start_time);
                    const decision = conflictDialog.decisions?.[c.id];
                    return (
                      <div key={c.id} className={`rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                        decision === 'cancel' ? 'border-red-300 bg-red-50/50' :
                        decision === 'reschedule' ? 'border-[#D4AF37]/60 bg-amber-50/50' :
                        'border-gray-150 bg-white hover:border-gray-200'
                      }`}>
                        <div className="flex items-center gap-3 p-3.5">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors duration-200 ${
                            decision === 'cancel' ? 'bg-red-100 text-red-600' :
                            decision === 'reschedule' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {(c.client_name || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-semibold text-gray-900 truncate">{c.client_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{c.service}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold tabular-nums text-gray-700">
                              {start.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex border-t border-gray-100">
                          <button
                            onClick={() => setDecision(c.id, 'cancel')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                              decision === 'cancel'
                                ? 'bg-red-500 text-white shadow-inner'
                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            {t?.('dashboard.actionCancel') || 'Cancel'}
                          </button>
                          <div className="w-px bg-gray-100" />
                          <button
                            onClick={() => setDecision(c.id, 'reschedule')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                              decision === 'reschedule'
                                ? 'bg-[#D4AF37] text-white shadow-inner'
                                : 'text-gray-400 hover:text-[#D4AF37] hover:bg-amber-50'
                            }`}
                          >
                            <CalendarDays className="w-4 h-4" />
                            {t?.('dashboard.actionReschedule') || 'Reschedule'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── STEP 2: Reschedule with date picker ── */}
              {currentStep === 'reschedule' && conflictDialog.rescheduleQueue && (
                <div className="space-y-4">
                  {/* Date strip */}
                  {conflictDialog.rescheduleDateOptions && (
                    <div>
                      <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {t?.('dashboard.selectDate') || 'Select Date'}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {conflictDialog.rescheduleDateOptions.map(d => {
                          const ds = formatDateStr(d);
                          const isSelected = ds === conflictDialog.rescheduleSelectedDate;
                          const isClosed = !!conflictDialog.closedDates?.[ds];
                          return (
                            <button
                              key={ds}
                              onClick={() => handleDateChange(ds)}
                              className={`flex flex-col items-center min-w-[56px] px-2 py-2 rounded-xl border text-center transition-all shrink-0 ${
                                isSelected
                                  ? isClosed
                                    ? 'border-gray-300 bg-gray-100 opacity-60'
                                    : 'border-amber-400 bg-amber-50 ring-1 ring-amber-200'
                                  : isClosed
                                    ? 'border-gray-200 bg-gray-50 opacity-60'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <span className="text-[10px] font-medium text-gray-400 uppercase">
                                {d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                              </span>
                              <span className={`text-[16px] font-bold ${isSelected && !isClosed ? 'text-amber-700' : 'text-gray-900'}`}>
                                {d.getUTCDate()}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Closed message */}
                  {conflictDialog.closedMessage && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-amber-700">{conflictDialog.closedMessage}</p>
                    </div>
                  )}

                  {conflictDialog.rescheduleError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[13px] text-red-600">{conflictDialog.rescheduleError}</p>
                    </div>
                  )}

                  {/* Slots */}
                  <div>
                    <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {t?.('dashboard.selectTime') || 'Select Time'}
                    </p>
                    {conflictDialog.slotsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                      </div>
                    ) : conflictDialog.slots?.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                        {conflictDialog.slots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => handleSlotPick(slot)}
                            className="px-3 py-2.5 rounded-xl text-[13px] font-medium border border-gray-200 text-gray-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-all"
                          >
                            {slot.start}
                          </button>
                        ))}
                      </div>
                    ) : !conflictDialog.closedMessage ? (
                      <div className="text-center py-6 text-[13px] text-gray-400">
                        {t?.('dashboard.noSlotsAvailable') || 'No available slots for this day.'}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* ── STEP 3: Confirmation summary ── */}
              {currentStep === 'confirm' && (
                <div className="space-y-2.5">
                  {/* Approved appointment */}
                  {(() => {
                    const approved = stats?.upcomingBookings?.find(b => b.id === conflictDialog.approvedId);
                    if (!approved) return null;
                    return (
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/60">
                        <div className="w-9 h-9 bg-emerald-200/70 rounded-full flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-gray-900 truncate">{approved.client_name}</p>
                          <p className="text-xs text-emerald-600 font-medium">{t?.('dashboard.willConfirm') || 'Will be confirmed'}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Conflicts */}
                  {conflictDialog.conflicts.map(c => {
                    const decision = conflictDialog.decisions?.[c.id];
                    const resched = conflictDialog.rescheduleResults?.[c.id];
                    return (
                      <div key={c.id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${
                        decision === 'cancel'
                          ? 'bg-red-50 border-red-200/60'
                          : 'bg-blue-50 border-blue-200/60'
                      }`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                          decision === 'cancel' ? 'bg-red-200/70' : 'bg-blue-200/70'
                        }`}>
                          {decision === 'cancel'
                            ? <XCircle className="w-4 h-4 text-red-700" />
                            : <CalendarDays className="w-4 h-4 text-blue-700" />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.client_name}</p>
                          {decision === 'cancel' ? (
                            <p className="text-xs text-red-600 font-medium">{t?.('dashboard.willCancel') || 'Will be cancelled'}</p>
                          ) : resched ? (
                            <p className="text-xs text-blue-600 font-medium">
                              {t?.('dashboard.willReschedule') || 'Move to'} {resched.dateLabel} · {resched.slotLabel}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {conflictDialog.saveError && (
                    <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{conflictDialog.saveError}</p>
                    </div>
                  )}
                </div>
              )}

              </div>

              {/* ── Footer with actions ── */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                {currentStep === 'decide' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConflictDialog(null)}
                      className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-medium text-sm transition-colors"
                    >
                      {t?.('dashboard.cancelBtn') || 'Cancel'}
                    </button>
                    <button
                      onClick={proceedFromDecisions}
                      disabled={!conflictDialog.decisions || Object.keys(conflictDialog.decisions).length !== conflictDialog.conflicts.length}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c9a432] disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-[#D4AF37]/20"
                    >
                      {t?.('dashboard.continueBtn') || 'Continue'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {currentStep === 'reschedule' && (
                  <button
                    onClick={() => setConflictDialog(prev => ({ ...prev, step: 'decide', rescheduleQueue: null, rescheduleQueueIdx: null, slots: null }))}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-medium text-sm transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t?.('dashboard.back') || 'Back'}
                  </button>
                )}
                {currentStep === 'confirm' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setConflictDialog(prev => ({ ...prev, step: 'decide', rescheduleQueue: null, rescheduleQueueIdx: null, slots: null, saving: false, saveError: null }));
                      }}
                      disabled={conflictDialog.saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 rounded-xl font-medium text-sm transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t?.('dashboard.back') || 'Back'}
                    </button>
                    <button
                      onClick={executeConflictResolution}
                      disabled={conflictDialog.saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-emerald-600/20"
                    >
                      {conflictDialog.saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t?.('dashboard.saving') || 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {t?.('dashboard.confirmSave') || 'Confirm & Save'}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
