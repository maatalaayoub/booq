import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { getCategoryTableName, getBusinessContext } from '@/lib/business';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

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

    const { businessHours } = await request.json();

    if (!Array.isArray(businessHours)) {
      return apiError('businessHours must be an array', 400);
    }

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
    const { title, type, date, endDate, startTime, endTime, isFullDay, recurring, recurringDay, notes } = body;

    if (!title || !type || !date) {
      return apiError('title, type, and date are required', 400);
    }

    const validTypes = ['break', 'lunch_break', 'closure', 'holiday', 'vacation', 'other'];
    if (!validTypes.includes(type)) {
      return apiData({ error: 'Invalid type', validTypes }, 400);
    }

    const fullDay = isFullDay === true || (!startTime && !endTime);

    const exceptionData = {
      business_info_id: ctx.businessInfoId,
      title: sanitizeText(title),
      type,
      date,
      end_date: fullDay && endDate ? endDate : null,
      start_time: fullDay ? null : (startTime || null),
      end_time: fullDay ? null : (endTime || null),
      is_full_day: fullDay,
      recurring: recurring || false,
      recurring_day: recurring ? recurringDay : null,
      notes: sanitizeText(notes) || null,
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
    const exceptionId = searchParams.get('id');
    if (!exceptionId) return apiError('Exception id is required', 400);

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
    const { id, title, type, date, endDate, startTime, endTime, isFullDay, recurring, recurringDay, notes } = body;

    if (!id) {
      return apiError('Exception id is required', 400);
    }
    if (!title || !type || !date) {
      return apiError('title, type, and date are required', 400);
    }

    const validTypes = ['break', 'lunch_break', 'closure', 'holiday', 'vacation', 'other'];
    if (!validTypes.includes(type)) {
      return apiData({ error: 'Invalid type', validTypes }, 400);
    }

    const fullDay = isFullDay === true || (!startTime && !endTime);

    const updateData = {
      title: sanitizeText(title),
      type,
      date,
      end_date: fullDay && endDate ? endDate : null,
      start_time: fullDay ? null : (startTime || null),
      end_time: fullDay ? null : (endTime || null),
      is_full_day: fullDay,
      recurring: recurring || false,
      recurring_day: recurring ? recurringDay : null,
      notes: sanitizeText(notes) || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('schedule_exceptions')
      .update(updateData)
      .eq('id', id)
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
