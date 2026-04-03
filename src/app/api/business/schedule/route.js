import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { getCategoryTableName, getBusinessContext } from '@/lib/business';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';
import { parseBody, parseQuery } from '@/lib/validate';
import { updateBusinessHoursSchema, createExceptionSchema, updateExceptionSchema, deleteExceptionSchema } from '@/schemas/schedule';

// ─── GET: Fetch working hours + schedule exceptions ─────────
export async function GET(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return apiError('Business not found', 404);

    // Get business hours from the category table
    const tableName = getCategoryTableName(ctx.category);

    let businessHours = [];
    if (tableName) {
      const { data: catData } = await supabase
        .from(tableName)
        .select('business_hours')
        .eq('business_info_id', ctx.businessInfoId)
        .single();
      businessHours = catData?.business_hours || [];
    }

    // Get schedule exceptions (breaks, closures, holidays)
    const { data: exceptions } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .eq('business_info_id', ctx.businessInfoId)
      .order('date', { ascending: true });

    return apiData({
      businessHours,
      exceptions: exceptions || [],
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
    const clerkId = await getUserId(request);
    if (!clerkId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(updateBusinessHoursSchema, body);
    if (validationError) return validationError;

    const { businessHours } = validated;

    const tableName = getCategoryTableName(ctx.category);
    if (!tableName) return apiError('Cannot update hours for this category', 400);

    const { error } = await supabase
      .from(tableName)
      .update({ business_hours: businessHours })
      .eq('business_info_id', ctx.businessInfoId);

    if (error) {
      console.error('[schedule PUT] Error:', error);
      return apiError('Failed to update', 500, error.message);
    }

    return apiSuccess();
  } catch (error) {
    console.error('[schedule PUT] Error:', error);
    return apiError('Internal server error');
  }
}

// ─── POST: Add a schedule exception (break, closure, holiday, etc.) ──
export async function POST(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(createExceptionSchema, body);
    if (validationError) return validationError;

    const fullDay = validated.isFullDay === true || (!validated.startTime && !validated.endTime);

    const exceptionData = {
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
    };

    const { data, error } = await supabase
      .from('schedule_exceptions')
      .insert(exceptionData)
      .select()
      .single();

    if (error) {
      console.error('[schedule POST] Error:', error);
      return apiError('Failed to create exception', 500, error.message);
    }

    return apiSuccess({ exception: data });
  } catch (error) {
    console.error('[schedule POST] Error:', error);
    return apiError('Internal server error');
  }
}

// ─── DELETE: Remove a schedule exception ────────────────────
export async function DELETE(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return apiError('Unauthorized', 401);

    const { searchParams } = new URL(request.url);
    const { error: validationError, data: validated } = parseQuery(deleteExceptionSchema, searchParams);
    if (validationError) return validationError;
    const exceptionId = validated.id;

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return apiError('Business not found', 404);

    const { error } = await supabase
      .from('schedule_exceptions')
      .delete()
      .eq('id', exceptionId)
      .eq('business_info_id', ctx.businessInfoId);

    if (error) {
      console.error('[schedule DELETE] Error:', error);
      return apiError('Failed to delete', 500, error.message);
    }

    return apiSuccess();
  } catch (error) {
    console.error('[schedule DELETE] Error:', error);
    return apiError('Internal server error');
  }
}

// ─── PATCH: Update a schedule exception ─────────────────────
export async function PATCH(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(updateExceptionSchema, body);
    if (validationError) return validationError;

    const fullDay = validated.isFullDay === true || (!validated.startTime && !validated.endTime);

    const updateData = {
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
    };

    const { data, error } = await supabase
      .from('schedule_exceptions')
      .update(updateData)
      .eq('id', validated.id)
      .eq('business_info_id', ctx.businessInfoId)
      .select()
      .single();

    if (error) {
      console.error('[schedule PATCH] Error:', error);
      return apiError('Failed to update exception', 500, error.message);
    }

    return apiSuccess({ exception: data });
  } catch (error) {
    console.error('[schedule PATCH] Error:', error);
    return apiError('Internal server error');
  }
}
