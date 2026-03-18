import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// ─── SANITIZATION HELPERS ──────────────────────────────────
function sanitizeText(value) {
  if (!value || typeof value !== 'string') return value;
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 500);
}

// Helper: get userId from session or Bearer token
async function getUserId(request) {
  const { userId } = await auth();
  if (userId) return userId;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { verifyToken } = await import('@clerk/backend');
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      if (payload?.sub) return payload.sub;
    } catch (err) {
      console.log('[schedule] Bearer verify failed:', err.message);
    }
  }
  return null;
}

// Helper: get the business user + business_info + category info
async function getBusinessContext(supabase, clerkId) {
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();

  if (!user || user.role !== 'business') return null;

  const { data: businessInfo } = await supabase
    .from('business_info')
    .select('id, business_category')
    .eq('user_id', user.id)
    .single();

  if (!businessInfo) return null;

  return { userId: user.id, businessInfoId: businessInfo.id, category: businessInfo.business_category };
}

// ─── GET: Fetch working hours + schedule exceptions ─────────
export async function GET(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    // Get business hours from the category table
    const tableMap = { salon_owner: 'shop_salon_info', mobile_service: 'mobile_service_info' };
    const tableName = tableMap[ctx.category];

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

    return NextResponse.json({
      businessHours,
      exceptions: exceptions || [],
      category: ctx.category,
    });
  } catch (error) {
    console.error('[schedule GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Update working hours ──────────────────────────────
export async function PUT(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { businessHours } = await request.json();

    if (!Array.isArray(businessHours)) {
      return NextResponse.json({ error: 'businessHours must be an array' }, { status: 400 });
    }

    const tableMap = { salon_owner: 'shop_salon_info', mobile_service: 'mobile_service_info' };
    const tableName = tableMap[ctx.category];
    if (!tableName) return NextResponse.json({ error: 'Cannot update hours for this category' }, { status: 400 });

    const { error } = await supabase
      .from(tableName)
      .update({ business_hours: businessHours })
      .eq('business_info_id', ctx.businessInfoId);

    if (error) {
      console.error('[schedule PUT] Error:', error);
      return NextResponse.json({ error: 'Failed to update', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[schedule PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Add a schedule exception (break, closure, holiday, etc.) ──
export async function POST(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    const { title, type, date, endDate, startTime, endTime, isFullDay, recurring, recurringDay, notes } = body;

    if (!title || !type || !date) {
      return NextResponse.json({ error: 'title, type, and date are required' }, { status: 400 });
    }

    const validTypes = ['break', 'lunch_break', 'closure', 'holiday', 'vacation', 'other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type', validTypes }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to create exception', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, exception: data });
  } catch (error) {
    console.error('[schedule POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Remove a schedule exception ────────────────────
export async function DELETE(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const exceptionId = searchParams.get('id');
    if (!exceptionId) return NextResponse.json({ error: 'Exception id is required' }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { error } = await supabase
      .from('schedule_exceptions')
      .delete()
      .eq('id', exceptionId)
      .eq('business_info_id', ctx.businessInfoId);

    if (error) {
      console.error('[schedule DELETE] Error:', error);
      return NextResponse.json({ error: 'Failed to delete', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[schedule DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
