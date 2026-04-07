import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData, apiSuccess } from '@/lib/api-response';
import { getBusinessContext, getBusinessHours } from '@/repositories/business';
import { findTeamMember } from '@/repositories/team';
import {
  findWorkerSchedule,
  findAllWorkerSchedules,
  upsertWorkerWeekSchedule,
} from '@/repositories/workerSchedule';

/**
 * GET /api/business/team/schedules?workerId=UUID
 * Fetch worker schedules. If workerId is provided, returns that worker's schedule.
 * Otherwise returns all worker schedules for the business.
 * Always includes businessHours so the UI can disable closed days.
 */
export async function GET(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const businessHours = await getBusinessHours(supabase, ctx.businessInfoId, ctx.category);

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');

    if (workerId) {
      // Validate worker belongs to this business
      const member = await findTeamMember(supabase, ctx.businessInfoId, workerId);
      if (!member) return apiError('Worker not found in this business', 404);

      const schedule = await findWorkerSchedule(supabase, ctx.businessInfoId, workerId);
      return apiData({ workerId, schedule, businessHours });
    }

    const schedules = await findAllWorkerSchedules(supabase, ctx.businessInfoId);
    return apiData({ schedules, businessHours });
  } catch (err) {
    console.error('[team/schedules GET]', err);
    return apiError('Internal server error');
  }
}

/**
 * PUT /api/business/team/schedules
 * Update a worker's weekly schedule.
 * Body: { workerId: UUID, schedule: [{ dayOfWeek, isOpen, openTime?, closeTime? }] }
 */
export async function PUT(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const { workerId, schedule } = body;

    if (!workerId || !schedule || !Array.isArray(schedule)) {
      return apiError('workerId and schedule array are required', 400);
    }

    // Validate workerId is UUID
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(workerId)) return apiError('Invalid workerId', 400);

    // Validate worker belongs to this business
    const member = await findTeamMember(supabase, ctx.businessInfoId, workerId);
    if (!member) return apiError('Worker not found in this business', 404);

    // Validate schedule entries
    for (const day of schedule) {
      if (typeof day.dayOfWeek !== 'number' || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
        return apiError('dayOfWeek must be 0-6', 400);
      }
      if (day.isOpen) {
        if (!day.openTime || !day.closeTime) {
          return apiError('openTime and closeTime required for open days', 400);
        }
        const timeRe = /^\d{2}:\d{2}$/;
        if (!timeRe.test(day.openTime) || !timeRe.test(day.closeTime)) {
          return apiError('Times must be in HH:MM format', 400);
        }
      }
    }

    const result = await upsertWorkerWeekSchedule(supabase, ctx.businessInfoId, workerId, schedule);
    return apiSuccess({ schedule: result });
  } catch (err) {
    console.error('[team/schedules PUT]', err);
    return apiError('Internal server error');
  }
}
