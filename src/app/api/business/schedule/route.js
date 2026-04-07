import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { getCategoryTableName, getBusinessContext } from '@/lib/business';
import { apiError, apiSuccess, apiData, validationResponse } from '@/lib/api-response';
import { parseBody, parseQuery } from '@/lib/validate';
import { updateBusinessHoursSchema, createExceptionSchema, updateExceptionSchema, deleteExceptionSchema } from '@/schemas/schedule';
import { getBusinessHours, updateBusinessHours } from '@/repositories/business';
import { findExceptionsByBusiness, createException, updateException, deleteException } from '@/repositories/schedule';
import { syncWorkerSchedulesToBusinessHours } from '@/repositories/workerSchedule';

// ─── GET: Fetch working hours + schedule exceptions ─────────
export async function GET(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const businessHours = await getBusinessHours(supabase, ctx.businessInfoId, ctx.category);
    const exceptions = await findExceptionsByBusiness(supabase, ctx.businessInfoId);

    return apiData({
      businessHours,
      exceptions,
      category: ctx.category,
    });
  } catch (error) {
    console.error('[schedule GET] Error:', error);
    return apiError('Internal server error');
  }
}

// ─── PUT: Update working hours ──────────────────────────────
export async function PUT(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(updateBusinessHoursSchema, body);
    if (validationError) return validationResponse(validationError);

    const tableName = getCategoryTableName(ctx.category);
    if (!tableName) return apiError('Cannot update hours for this category', 400);

    await updateBusinessHours(supabase, ctx.businessInfoId, ctx.category, validated.businessHours);

    // Sync all worker schedules: clamp times & close days that are now closed
    try {
      await syncWorkerSchedulesToBusinessHours(supabase, ctx.businessInfoId, validated.businessHours);
    } catch (syncErr) {
      console.error('[schedule PUT] Worker sync error (non-fatal):', syncErr);
    }

    return apiSuccess();
  } catch (error) {
    console.error('[schedule PUT] Error:', error);
    return apiError('Internal server error');
  }
}

// ─── POST: Add a schedule exception ──────────────────────────
export async function POST(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(createExceptionSchema, body);
    if (validationError) return validationResponse(validationError);

    const fullDay = validated.isFullDay === true || (!validated.startTime && !validated.endTime);

    const data = await createException(supabase, {
      business_info_id: ctx.businessInfoId,
      title: sanitizeText(validated.title),
      type: validated.type,
      date: validated.date,
      end_date: fullDay && validated.endDate ? validated.endDate : null,
      start_time: fullDay ? null : (validated.startTime || null),
      end_time: fullDay ? null : (validated.endTime || null),
      is_full_day: fullDay,
      recurring: validated.recurring,
      recurring_day: validated.recurring ? validated.recurringDay : null,
      notes: sanitizeText(validated.notes) || null,
    });

    return apiSuccess({ exception: data });
  } catch (error) {
    console.error('[schedule POST] Error:', error);
    return apiError('Internal server error');
  }
}

// ─── DELETE: Remove a schedule exception ────────────────────
export async function DELETE(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const { error: validationError, data: validated } = parseQuery(deleteExceptionSchema, searchParams);
    if (validationError) return validationResponse(validationError);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    await deleteException(supabase, validated.id, ctx.businessInfoId);

    return apiSuccess();
  } catch (error) {
    console.error('[schedule DELETE] Error:', error);
    return apiError('Internal server error');
  }
}

// ─── PATCH: Update a schedule exception ─────────────────────
export async function PATCH(request) {
  try {
    const authId = await getUserId(request);
    if (!authId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, authId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(updateExceptionSchema, body);
    if (validationError) return validationResponse(validationError);

    const fullDay = validated.isFullDay === true || (!validated.startTime && !validated.endTime);

    const data = await updateException(supabase, validated.id, ctx.businessInfoId, {
      title: sanitizeText(validated.title),
      type: validated.type,
      date: validated.date,
      end_date: fullDay && validated.endDate ? validated.endDate : null,
      start_time: fullDay ? null : (validated.startTime || null),
      end_time: fullDay ? null : (validated.endTime || null),
      is_full_day: fullDay,
      recurring: validated.recurring,
      recurring_day: validated.recurring ? validated.recurringDay : null,
      notes: sanitizeText(validated.notes) || null,
      updated_at: new Date().toISOString(),
    });

    return apiSuccess({ exception: data });
  } catch (error) {
    console.error('[schedule PATCH] Error:', error);
    return apiError('Internal server error');
  }
}
