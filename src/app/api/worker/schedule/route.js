import { getUserId, getInternalUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData, apiSuccess } from '@/lib/api-response';
import { findTeamMember } from '@/repositories/team';
import { findBusinessById, getBusinessHours } from '@/repositories/business';
import { findExceptionsByBusiness } from '@/repositories/schedule';
import {
  findWorkerSchedule,
  upsertWorkerWeekSchedule,
} from '@/repositories/workerSchedule';

// ── Helper: auth + membership ───────────────────────────────
async function getWorkerContext(request) {
  const authId = await getUserId(request);
  if (!authId) return { error: apiError('Unauthorized', 401) };

  const supabase = createServerSupabaseClient();
  const userId = await getInternalUserId(supabase, authId);
  if (!userId) return { error: apiError('User not found', 404) };

  return { supabase, userId };
}

/**
 * GET /api/worker/schedule?businessId=X
 * Returns:
 *  - businessHours: the business weekly working hours (read-only context)
 *  - workerHours: the worker's personal working hours within the business
 *  - exceptions: shared business exceptions
 */
export async function GET(request) {
  try {
    const ctx = await getWorkerContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    if (!businessId) return apiError('businessId is required', 400);

    const membership = await findTeamMember(ctx.supabase, businessId, ctx.userId);
    if (!membership) return apiError('Not a team member', 403);

    const business = await findBusinessById(ctx.supabase, businessId);
    if (!business) return apiError('Business not found', 404);

    const [businessHours, workerSchedule, exceptions] = await Promise.all([
      getBusinessHours(ctx.supabase, businessId, business.business_category),
      findWorkerSchedule(ctx.supabase, businessId, ctx.userId),
      findExceptionsByBusiness(ctx.supabase, businessId),
    ]);

    // Convert worker_schedules rows to camelCase format
    const workerHours = workerSchedule.map((s) => ({
      dayOfWeek: s.day_of_week,
      isOpen: s.is_open,
      openTime: s.open_time?.substring(0, 5) || null,
      closeTime: s.close_time?.substring(0, 5) || null,
    }));

    return apiData({ businessHours, workerHours, exceptions });
  } catch (error) {
    console.error('[Worker Schedule GET]', error);
    return apiError('Internal server error', 500);
  }
}

/**
 * PUT /api/worker/schedule
 * Save the worker's personal working hours (requires canEditSchedule).
 * Validates that worker hours fall within business hours.
 * Body: { businessId, schedule: [{ dayOfWeek, isOpen, openTime?, closeTime? }] }
 */
export async function PUT(request) {
  try {
    const ctx = await getWorkerContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const { businessId, schedule } = body;

    if (!businessId || !schedule || !Array.isArray(schedule)) {
      return apiError('businessId and schedule array are required', 400);
    }

    const membership = await findTeamMember(ctx.supabase, businessId, ctx.userId);
    if (!membership) return apiError('Not a team member', 403);
    if (!membership.permissions?.canEditSchedule) {
      return apiError('No schedule edit permission', 403);
    }

    // Fetch business hours for validation
    const business = await findBusinessById(ctx.supabase, businessId);
    if (!business) return apiError('Business not found', 404);
    const businessHours = await getBusinessHours(ctx.supabase, businessId, business.business_category);

    const timeRe = /^\d{2}:\d{2}$/;
    // Normalize time to HH:MM for safe comparison (handles HH:MM:SS from DB)
    const norm = (t) => (t || '').substring(0, 5);

    for (const day of schedule) {
      if (typeof day.dayOfWeek !== 'number' || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
        return apiError('dayOfWeek must be 0-6', 400);
      }

      if (day.isOpen) {
        if (!day.openTime || !day.closeTime) {
          return apiError('openTime and closeTime required for open days', 400);
        }
        if (!timeRe.test(day.openTime) || !timeRe.test(day.closeTime)) {
          return apiError('Times must be in HH:MM format', 400);
        }

        // Validate against business hours
        const bizDay = businessHours.find((b) => b.dayOfWeek === day.dayOfWeek);
        if (!bizDay || !bizDay.isOpen) {
          return apiError(`Cannot set working hours on a day the business is closed (day ${day.dayOfWeek})`, 400);
        }
        const bizOpen = norm(bizDay.openTime);
        const bizClose = norm(bizDay.closeTime);
        if (bizOpen && day.openTime < bizOpen) {
          return apiError(`Worker open time (${day.openTime}) is before business opens (${bizOpen}) on day ${day.dayOfWeek}`, 400);
        }
        if (bizClose && day.closeTime > bizClose) {
          return apiError(`Worker close time (${day.closeTime}) is after business closes (${bizClose}) on day ${day.dayOfWeek}`, 400);
        }
      }
    }

    const result = await upsertWorkerWeekSchedule(ctx.supabase, businessId, ctx.userId, schedule);
    return apiSuccess({ schedule: result });
  } catch (error) {
    console.error('[Worker Schedule PUT]', error);
    return apiError('Internal server error', 500);
  }
}
