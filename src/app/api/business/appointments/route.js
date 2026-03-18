import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const sanitizeText = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 500);
};

const sanitizePhone = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/[^0-9+\-\s()]/g, '').trim().slice(0, 30);
};

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
      console.log('[appointments] Bearer verify failed:', err.message);
    }
  }
  return null;
}

// Helper: get business_info_id for the current user
async function getBusinessInfoId(supabase, clerkId) {
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();

  if (!user || user.role !== 'business') return null;

  const { data: businessInfo } = await supabase
    .from('business_info')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return businessInfo?.id || null;
}

// Helper: validate appointment time against working hours and schedule exceptions
async function validateAgainstSchedule(supabase, businessInfoId, startTimeISO, endTimeISO) {
  const startDate = new Date(startTimeISO);
  const endDate = new Date(endTimeISO);
  const dayOfWeek = startDate.getDay(); // 0=Sunday
  const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  const startHHMM = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
  const endHHMM = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

  // Get business category to determine the correct table
  const { data: businessInfo } = await supabase
    .from('business_info')
    .select('business_category')
    .eq('id', businessInfoId)
    .single();

  if (!businessInfo) return { code: 'NO_BUSINESS', message: 'Business info not found' };

  const tableMap = { salon_owner: 'shop_salon_info', mobile_service: 'mobile_service_info' };
  const tableName = tableMap[businessInfo.business_category];

  let businessHours = [];
  if (tableName) {
    const { data: catData } = await supabase
      .from(tableName)
      .select('business_hours')
      .eq('business_info_id', businessInfoId)
      .single();
    businessHours = catData?.business_hours || [];
  }

  // 1. Check working hours for the day
  if (businessHours.length > 0) {
    const daySchedule = businessHours.find(h => h.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isOpen) {
      return { code: 'CLOSED_DAY', message: 'This day is not a working day' };
    }
    // Check if appointment is within working hours
    if (startHHMM < daySchedule.openTime || endHHMM > daySchedule.closeTime) {
      return { code: 'OUTSIDE_HOURS', message: `Appointment must be between ${daySchedule.openTime} and ${daySchedule.closeTime}` };
    }
  }

  // 2. Check schedule exceptions for that date
  const { data: exceptions } = await supabase
    .from('schedule_exceptions')
    .select('*')
    .eq('business_info_id', businessInfoId);

  if (exceptions && exceptions.length > 0) {
    for (const ex of exceptions) {
      // Check recurring exceptions (e.g. every Monday break)
      if (ex.recurring && ex.recurring_day === dayOfWeek) {
        if (ex.is_full_day) {
          return { code: 'EXCEPTION_FULLDAY', message: `This day is blocked: ${ex.title}` };
        }
        if (ex.start_time && ex.end_time) {
          const exStart = ex.start_time.substring(0, 5);
          const exEnd = ex.end_time.substring(0, 5);
          if (startHHMM < exEnd && endHHMM > exStart) {
            return { code: 'EXCEPTION_TIME', message: `Time conflicts with: ${ex.title} (${exStart}–${exEnd})` };
          }
        }
        continue;
      }

      // Check date-based exceptions
      const exDate = ex.date; // YYYY-MM-DD
      const exEndDate = ex.end_date || exDate;
      if (dateStr >= exDate && dateStr <= exEndDate) {
        if (ex.is_full_day) {
          return { code: 'EXCEPTION_FULLDAY', message: `This day is blocked: ${ex.title}` };
        }
        if (ex.start_time && ex.end_time) {
          const exStart = ex.start_time.substring(0, 5);
          const exEnd = ex.end_time.substring(0, 5);
          if (startHHMM < exEnd && endHHMM > exStart) {
            return { code: 'EXCEPTION_TIME', message: `Time conflicts with: ${ex.title} (${exStart}–${exEnd})` };
          }
        }
      }
    }
  }

  return null; // No conflicts
}

// ─── GET: Fetch all appointments for the business ───────────
export async function GET(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const businessInfoId = await getBusinessInfoId(supabase, clerkId);
    if (!businessInfoId) {
      // No business profile yet — return empty list instead of 404
      return NextResponse.json({ appointments: [] });
    }

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_info_id', businessInfoId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('[appointments GET] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }

    return NextResponse.json({ appointments });
  } catch (err) {
    console.error('[appointments GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create a new appointment ─────────────────────────
export async function POST(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const businessInfoId = await getBusinessInfoId(supabase, clerkId);
    if (!businessInfoId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const { client_name, client_phone, client_address, service, price, start_time, end_time, status, notes } = body;

    const cleanClientName = sanitizeText(client_name);
    const cleanPhone = client_phone ? sanitizePhone(client_phone) : null;
    const cleanAddress = client_address ? sanitizeText(client_address) : null;
    const cleanService = sanitizeText(service);
    const cleanNotes = notes ? sanitizeText(notes) : null;

    if (!cleanClientName || !cleanService || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required fields: client_name, service, start_time, end_time' }, { status: 400 });
    }

    // ── Validate against working hours and schedule exceptions ──
    const scheduleError = await validateAgainstSchedule(supabase, businessInfoId, start_time, end_time);
    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message, code: scheduleError.code }, { status: 400 });
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        business_info_id: businessInfoId,
        client_name: cleanClientName,
        client_phone: cleanPhone,
        client_address: cleanAddress,
        service: cleanService,
        price: price ? parseFloat(price) : null,
        start_time,
        end_time,
        status: status || 'confirmed',
        notes: cleanNotes,
      })
      .select()
      .single();

    if (error) {
      console.error('[appointments POST] Supabase error:', error);
      return NextResponse.json({ error: error.message || 'Failed to create appointment', details: error }, { status: 500 });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error('[appointments POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PUT: Update an existing appointment ────────────────────
export async function PUT(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const businessInfoId = await getBusinessInfoId(supabase, clerkId);
    if (!businessInfoId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 });
    }

    // Sanitize text fields in update
    const sanitizedFields = { ...updateFields };
    if (sanitizedFields.client_name) sanitizedFields.client_name = sanitizeText(sanitizedFields.client_name);
    if (sanitizedFields.client_phone) sanitizedFields.client_phone = sanitizePhone(sanitizedFields.client_phone);
    if (sanitizedFields.client_address) sanitizedFields.client_address = sanitizeText(sanitizedFields.client_address);
    if (sanitizedFields.service) sanitizedFields.service = sanitizeText(sanitizedFields.service);
    if (sanitizedFields.notes) sanitizedFields.notes = sanitizeText(sanitizedFields.notes);

    // Only allow updating own appointments
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(sanitizedFields)
      .eq('id', id)
      .eq('business_info_id', businessInfoId)
      .select()
      .single();

    if (error) {
      console.error('[appointments PUT] Error:', error);
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }

    return NextResponse.json({ appointment });
  } catch (err) {
    console.error('[appointments PUT] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Remove an appointment ──────────────────────────
export async function DELETE(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const businessInfoId = await getBusinessInfoId(supabase, clerkId);
    if (!businessInfoId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('business_info_id', businessInfoId);

    if (error) {
      console.error('[appointments DELETE] Error:', error);
      return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[appointments DELETE] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
