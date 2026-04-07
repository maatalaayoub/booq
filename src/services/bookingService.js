// ─── BOOKING SERVICE ────────────────────────────────────────────────────
// Orchestrates the full booking flow (previously inline in API routes).
// Framework-agnostic — receives supabase client, returns plain data or throws.

import { sanitizeText, sanitizePhone } from '@/lib/sanitize';
import {
  findConflictingAppointments,
  findUserConflicts,
  findCrossBusinessConflicts,
  findUserAppointment,
  createAppointment,
  updateAppointmentByBusiness,
  updateAppointmentByUser,
  cancelAppointmentByUser,
  findAppointmentsInRange,
  findOverlappingPendingAppointments,
  findUserBookingsForDate,
  findCrossBusinessBookingsForDate,
} from '@/repositories/appointment';
import { findBusinessById, getBusinessHours as fetchBusinessHours } from '@/repositories/business';
import { findServicesByIds } from '@/repositories/service';
import { findTeamMembers } from '@/repositories/team';
import { findAllWorkerSchedules } from '@/repositories/workerSchedule';

// Re-export pure helpers from booking.js that don't do DB I/O
export { toHHMM, getDaySchedule, generateTimeSlots, checkTimeAgainstExceptions } from './booking';

import { getDaySchedule, checkTimeAgainstExceptions, toHHMM, generateTimeSlots } from './booking';

// ─── ServiceError: thrown when a business rule is violated ───────────

export class ServiceError {
  constructor(message, status = 400, code = null) {
    this.message = message;
    this.status = status;
    this.code = code;
  }
}

// ─── SCHEDULE HELPERS (DB-aware, moved from services/booking.js) ─────

/**
 * Fetch and check exceptions for a date.
 */
async function checkExceptions(supabase, businessId, dateStr, dayOfWeek) {
  const { data: exceptions } = await supabase
    .from('schedule_exceptions')
    .select('*')
    .eq('business_info_id', businessId);

  const blockedRanges = [];
  for (const ex of (exceptions || [])) {
    if (ex.recurring && ex.recurring_day === dayOfWeek) {
      if (ex.is_full_day) return { closed: true, message: `Closed: ${ex.title}` };
      if (ex.start_time && ex.end_time) {
        blockedRanges.push({ start: ex.start_time.substring(0, 5), end: ex.end_time.substring(0, 5) });
      }
      continue;
    }
    const exDate = ex.date;
    const exEndDate = ex.end_date || exDate;
    if (dateStr >= exDate && dateStr <= exEndDate) {
      if (ex.is_full_day) return { closed: true, message: `Closed: ${ex.title}` };
      if (ex.start_time && ex.end_time) {
        blockedRanges.push({ start: ex.start_time.substring(0, 5), end: ex.end_time.substring(0, 5) });
      }
    }
  }
  return { closed: false, blockedRanges };
}

/**
 * Full schedule validation (hours + exceptions).
 */
async function validateAgainstSchedule(supabase, businessId, startTimeISO, endTimeISO) {
  const startDate = new Date(startTimeISO);
  const endDate = new Date(endTimeISO);
  const dayOfWeek = startDate.getUTCDay();
  const dateStr = startDate.toISOString().split('T')[0];
  const startHHMM = toHHMM(startDate);
  const endHHMM = toHHMM(endDate);

  const businessInfo = await findBusinessById(supabase, businessId, 'id, business_category');
  if (!businessInfo) return { code: 'NO_BUSINESS', message: 'Business info not found' };

  const businessHours = await fetchBusinessHours(supabase, businessId, businessInfo.business_category);
  if (businessHours.length > 0) {
    const daySchedule = getDaySchedule(businessHours, dayOfWeek);
    if (!daySchedule.isOpen) return { code: 'CLOSED_DAY', message: 'This day is not a working day' };
    if (startHHMM < daySchedule.openTime || endHHMM > daySchedule.closeTime) {
      return { code: 'OUTSIDE_HOURS', message: `Appointment must be between ${daySchedule.openTime} and ${daySchedule.closeTime}` };
    }
  }

  const exResult = await checkExceptions(supabase, businessId, dateStr, dayOfWeek);
  if (exResult.closed) return { code: 'EXCEPTION_FULLDAY', message: exResult.message };
  return checkTimeAgainstExceptions(exResult.blockedRanges, startHHMM, endHHMM);
}

// ─── CREATE BOOKING ─────────────────────────────────────────────────

/**
 * Create a customer booking.
 * @throws {ServiceError} on business rule violations
 * @returns {object} the created appointment
 */
export async function createBooking(supabase, { authId, businessId, serviceIds, date, startTime, clientName, clientPhone, notes, assignedWorkerId }) {
  // Verify business exists and accepts bookings
  const bizInfo = await findBusinessById(supabase, businessId, 'id, business_category, service_mode, onboarding_completed');
  if (!bizInfo || !bizInfo.onboarding_completed) throw new ServiceError('Business not found', 404);
  if (bizInfo.service_mode === 'walkin') throw new ServiceError('This business only accepts walk-in customers');

  // Get & validate services
  const services = await findServicesByIds(supabase, businessId, serviceIds);
  if (!services || services.length !== serviceIds.length || services.some(s => !s.is_active)) {
    throw new ServiceError('One or more services not found or inactive', 404);
  }

  const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = services.reduce((sum, s) => sum + (s.price || 0), 0);
  const combinedName = services.map(s => s.name).join(' + ');

  // Calculate times
  const startDate = new Date(`${date}T${startTime}:00Z`);
  const endDate = new Date(startDate.getTime() + totalDuration * 60 * 1000);
  const endHHMM = `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`;

  if (startDate < new Date()) throw new ServiceError('Cannot book in the past');

  // Validate against schedule
  const businessHours = await fetchBusinessHours(supabase, businessId, bizInfo.business_category);
  const dayOfWeek = startDate.getUTCDay();
  const schedule = getDaySchedule(businessHours, dayOfWeek);
  if (!schedule.isOpen) throw new ServiceError('Business is closed on this day');
  if (startTime < schedule.openTime || endHHMM > schedule.closeTime) {
    throw new ServiceError(`Appointment must be between ${schedule.openTime} and ${schedule.closeTime}`);
  }

  // Check exceptions
  const exResult = await checkExceptions(supabase, businessId, date, dayOfWeek);
  if (exResult.closed) throw new ServiceError(exResult.message);
  const exConflict = checkTimeAgainstExceptions(exResult.blockedRanges, startTime, endHHMM);
  if (exConflict) throw new ServiceError(exConflict.message);

  // Check conflicts
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const conflicts = await findConflictingAppointments(supabase, businessId, startISO, endISO);
  if (conflicts.length > 0) throw new ServiceError('This time slot is no longer available. Please choose another time.', 409);

  const userConflictData = await findUserConflicts(supabase, authId, businessId, startISO, endISO);
  if (userConflictData.length > 0) {
    const existing = userConflictData[0];
    const time = new Date(existing.start_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
    throw new ServiceError(`You already have a ${existing.status} booking at ${time}. You cannot book the same time slot twice.`, 409);
  }

  const crossConflictData = await findCrossBusinessConflicts(supabase, authId, businessId, startISO, endISO);
  if (crossConflictData.length > 0) {
    const c = crossConflictData[0];
    const cStart = new Date(c.start_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
    const cEnd = new Date(c.end_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
    throw new ServiceError(`You already have a confirmed booking from ${cStart} to ${cEnd} with another provider. Please choose a different time.`, 409, 'CROSS_BUSINESS_CONFLICT');
  }

  // Create
  return createAppointment(supabase, {
    business_info_id: businessId,
    auth_id: authId,
    client_name: sanitizeText(clientName),
    client_phone: clientPhone ? sanitizePhone(clientPhone) : null,
    service: combinedName,
    price: totalPrice,
    start_time: startISO,
    end_time: endISO,
    status: 'pending',
    notes: notes ? sanitizeText(notes) : null,
    assigned_worker_id: assignedWorkerId || null,
  });
}

// ─── EDIT BOOKING (USER) ────────────────────────────────────────────

/**
 * Edit an existing booking (user-side).
 * @throws {ServiceError}
 */
export async function editBooking(supabase, { authId, id, date, startTime, serviceIds }) {
  const hasTimeChange = !!(date && startTime);
  const hasServiceChange = !!(serviceIds && serviceIds.length > 0);

  const apt = await findUserAppointment(supabase, id, authId);
  if (!apt) throw new ServiceError('Appointment not found', 404);
  if (apt.status === 'cancelled' || apt.status === 'completed') {
    throw new ServiceError('Cannot edit a cancelled or completed appointment');
  }

  const updateFields = { status: 'pending' };
  let durationMs = new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime();

  if (hasServiceChange) {
    const services = await findServicesByIds(supabase, apt.business_info_id, serviceIds);
    if (!services || services.length === 0) throw new ServiceError('Invalid services selected');

    const ordered = serviceIds.map(sid => services.find(s => s.id === sid)).filter(Boolean);
    updateFields.service = ordered.map(s => s.name).join(' + ');
    updateFields.price = ordered.reduce((sum, s) => sum + (s.price || 0), 0);
    durationMs = ordered.reduce((sum, s) => sum + s.duration_minutes, 0) * 60000;
  }

  if (apt.status === 'confirmed') updateFields.rescheduled_by = 'client';

  if (hasTimeChange) {
    const newStart = new Date(`${date}T${startTime}:00Z`);
    const newEnd = new Date(newStart.getTime() + durationMs);
    if (newStart < new Date()) throw new ServiceError('Cannot schedule in the past');

    const newStartISO = newStart.toISOString();
    const newEndISO = newEnd.toISOString();

    const conflicts = await findConflictingAppointments(supabase, apt.business_info_id, newStartISO, newEndISO, id);
    if (conflicts.length > 0) throw new ServiceError('This time slot is no longer available', 409);

    updateFields.previous_start_time = apt.start_time;
    updateFields.previous_end_time = apt.end_time;
    updateFields.start_time = newStartISO;
    updateFields.end_time = newEndISO;
  } else if (hasServiceChange) {
    const currentStart = new Date(apt.start_time);
    updateFields.end_time = new Date(currentStart.getTime() + durationMs).toISOString();
  }

  return updateAppointmentByUser(supabase, id, authId, updateFields);
}

// ─── CANCEL BOOKING (USER) ─────────────────────────────────────────

/**
 * Cancel a booking (user-side).
 * @throws {ServiceError}
 */
export async function cancelBooking(supabase, { authId, appointmentId }) {
  const apt = await findUserAppointment(supabase, appointmentId, authId);
  if (!apt) throw new ServiceError('Appointment not found', 404);
  if (apt.status === 'cancelled') throw new ServiceError('Already cancelled');
  if (apt.status === 'completed') throw new ServiceError('Cannot cancel a completed appointment');

  await cancelAppointmentByUser(supabase, appointmentId, authId);
}

// ─── GET AVAILABLE SLOTS ───────────────────────────────────────────

/**
 * Generate available time slots for a date.
 */
export async function getAvailableSlots(supabase, { businessId, dateStr, duration, authId }) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const requested = new Date(dateStr + 'T00:00:00Z');
  if (requested < today) return { slots: [], message: 'Cannot book in the past' };

  const bizInfo = await findBusinessById(supabase, businessId, 'id, business_category');
  if (!bizInfo) throw new ServiceError('Business not found', 404);

  const businessHours = await fetchBusinessHours(supabase, businessId, bizInfo.business_category);
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();
  const schedule = getDaySchedule(businessHours, dayOfWeek);

  if (!schedule.isOpen) return { slots: [], closed: true, message: 'Business is closed on this day' };

  const { openTime, closeTime } = schedule;

  const exResult = await checkExceptions(supabase, businessId, dateStr, dayOfWeek);

  if (exResult.closed) return { slots: [], closed: true, message: exResult.message };

  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd = `${dateStr}T23:59:59.999Z`;
  const allActiveAppointments = await findAppointmentsInRange(supabase, businessId, dayStart, dayEnd, ['confirmed', 'pending']);

  // Check if this business has a team
  const members = await findTeamMembers(supabase, businessId);
  const hasTeam = members.length > 0;

  const appointmentRanges = allActiveAppointments
    .filter(apt => apt.status !== 'cancelled')
    .map(apt => ({
      start: toHHMM(new Date(apt.start_time)),
      end: toHHMM(new Date(apt.end_time)),
    }));

  // For team businesses: only use exceptions as global blocks (appointments checked per-worker)
  // For solo businesses: all appointments block globally
  const allBlocked = hasTeam
    ? [...exResult.blockedRanges]
    : [...exResult.blockedRanges, ...appointmentRanges];

  let slots = generateTimeSlots({ openTime, closeTime, duration, blockedRanges: allBlocked, dateStr });

  // ─── Worker availability filter ───────────────────────────────────
  // If the business has a team, mark a slot as unavailable when NO worker can serve it.
  if (hasTeam) {
    const workerSchedules = await findAllWorkerSchedules(supabase, businessId);

    slots = slots.map(slot => {
      if (!slot.available) return slot; // already blocked

      // Use slot.start (not slot.time) — generateTimeSlots returns { start, end, available }
      const [sh, sm] = slot.start.split(':').map(Number);
      const slotStartMin = sh * 60 + sm;
      const slotEndMin = slotStartMin + duration;
      const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;
      const slotStartISO = `${dateStr}T${slot.start}:00.000Z`;
      const slotEndISO = `${dateStr}T${slotEnd}:00.000Z`;

      // Check if at least one member can serve this slot
      const hasAvailableWorker = members.some(member => {
        const workerId = member.user_id;

        // Check worker's personal schedule for this day
        const wSched = workerSchedules.find(
          ws => ws.worker_id === workerId && ws.day_of_week === dayOfWeek
        );
        if (wSched) {
          if (!wSched.is_open) return false;
          const wOpen = wSched.open_time?.substring(0, 5);
          const wClose = wSched.close_time?.substring(0, 5);
          if (wOpen && wClose) {
            if (slot.start < wOpen || slotEnd > wClose) return false;
          }
        }
        // If no schedule → follows business hours (already within bounds)

        // Check if worker has a conflicting appointment (confirmed or pending)
        const hasConflict = allActiveAppointments.some(apt => {
          if (apt.assigned_worker_id !== workerId) return false;
          if (apt.status === 'cancelled') return false;
          return apt.start_time < slotEndISO && apt.end_time > slotStartISO;
        });
        if (hasConflict) return false;

        return true; // This worker is available
      });

      return hasAvailableWorker ? slot : { ...slot, available: false };
    });
  }

  let userBookings = [];
  let crossBusinessBookings = [];
  if (authId) {
    const rawUserBookings = await findUserBookingsForDate(supabase, authId, businessId, dateStr);
    userBookings = rawUserBookings.map(apt => ({
      start: toHHMM(new Date(apt.start_time)),
      end: toHHMM(new Date(apt.end_time)),
      status: apt.status,
    }));

    const rawCross = await findCrossBusinessBookingsForDate(supabase, authId, businessId, dateStr);
    crossBusinessBookings = rawCross.map(apt => ({
      start: toHHMM(new Date(apt.start_time)),
      end: toHHMM(new Date(apt.end_time)),
      status: 'confirmed',
      crossBusiness: true,
    }));
  }

  return { slots, closed: false, openTime, closeTime, date: dateStr, userBookings, crossBusinessBookings };
}

// ─── BUSINESS-SIDE APPOINTMENT MANAGEMENT ───────────────────────────

/**
 * Create an appointment (business-side).
 * @throws {ServiceError}
 */
export async function createBusinessAppointment(supabase, { businessInfoId, appointmentData }) {
  const scheduleError = await validateAgainstSchedule(supabase, businessInfoId, appointmentData.start_time, appointmentData.end_time);
  if (scheduleError) throw new ServiceError(scheduleError.message, 400, scheduleError.code);

  return createAppointment(supabase, {
    business_info_id: businessInfoId,
    ...appointmentData,
  });
}

/**
 * Update an appointment (business-side).
 * When confirming, detects overlapping pending appointments that need attention.
 * @throws {ServiceError}
 * @returns {{ appointment, overlappingPending? }}
 */
export async function updateBusinessAppointment(supabase, { businessInfoId, appointmentId, updateFields }) {
  if (updateFields.start_time && updateFields.end_time) {
    const scheduleError = await validateAgainstSchedule(supabase, businessInfoId, updateFields.start_time, updateFields.end_time);
    if (scheduleError) throw new ServiceError(scheduleError.message, 400, scheduleError.code);

    const conflicts = await findConflictingAppointments(supabase, businessInfoId, updateFields.start_time, updateFields.end_time, appointmentId);
    if (conflicts.length > 0) {
      throw new ServiceError('This time overlaps with a confirmed appointment. Please choose a different time.', 409, 'APPOINTMENT_CONFLICT');
    }
  }

  const appointment = await updateAppointmentByBusiness(supabase, appointmentId, businessInfoId, updateFields);

  // When confirming, find overlapping pending appointments that need rescheduling
  let overlappingPending = [];
  if (updateFields.status === 'confirmed') {
    overlappingPending = await findOverlappingPendingAppointments(
      supabase, businessInfoId, appointment.start_time, appointment.end_time, appointmentId
    );
  }

  return { appointment, overlappingPending };
}
