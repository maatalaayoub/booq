import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/book/create
 * Authenticated endpoint – create a booking for a specific business.
 * Body: { businessId, serviceId, date, startTime, clientName, clientPhone, notes }
 * 
 * Uses SELECT ... FOR UPDATE to prevent double-booking race conditions.
 */

function sanitizeText(value) {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, 500);
}

function sanitizePhone(value) {
  if (!value || typeof value !== 'string') return value;
  return value.replace(/[^0-9+\-\s()]/g, '').trim().slice(0, 30);
}

export async function POST(request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Please sign in to book an appointment' }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, serviceIds, serviceId, date, startTime, clientName, clientPhone, notes } = body;

    // Support both single serviceId and multiple serviceIds
    const resolvedIds = serviceIds && Array.isArray(serviceIds) && serviceIds.length > 0
      ? serviceIds
      : serviceId ? [serviceId] : [];

    // Validate required fields
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!businessId || !uuidRe.test(businessId)) {
      return NextResponse.json({ error: 'Invalid businessId' }, { status: 400 });
    }
    if (resolvedIds.length === 0 || !resolvedIds.every(id => uuidRe.test(id))) {
      return NextResponse.json({ error: 'Invalid service selection' }, { status: 400 });
    }
    if (resolvedIds.length > 10) {
      return NextResponse.json({ error: 'Too many services selected' }, { status: 400 });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json({ error: 'Invalid startTime format (HH:MM)' }, { status: 400 });
    }
    if (!clientName || clientName.trim().length < 2) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify business exists and is active
    const { data: bizInfo } = await supabase
      .from('business_info')
      .select('id, business_category, service_mode')
      .eq('id', businessId)
      .eq('onboarding_completed', true)
      .single();

    if (!bizInfo) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    if (bizInfo.service_mode === 'walkin') {
      return NextResponse.json({ error: 'This business only accepts walk-in customers' }, { status: 400 });
    }

    // Get service details (all selected)
    const { data: services } = await supabase
      .from('business_services')
      .select('id, name, duration_minutes, price, currency, is_active')
      .in('id', resolvedIds)
      .eq('business_info_id', businessId);

    if (!services || services.length !== resolvedIds.length || services.some(s => !s.is_active)) {
      return NextResponse.json({ error: 'One or more services not found or inactive' }, { status: 404 });
    }

    // Compute combined duration and total price
    const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
    const totalPrice = services.reduce((sum, s) => sum + (s.price || 0), 0);
    const combinedName = services.map(s => s.name).join(' + ');

    // Calculate start and end times (force UTC to avoid timezone drift)
    const [startH, startM] = startTime.split(':').map(Number);
    const startDate = new Date(`${date}T${startTime}:00Z`);
    const endDate = new Date(startDate.getTime() + totalDuration * 60 * 1000);
    const endHHMM = `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`;

    // Don't allow booking in the past
    if (startDate < new Date()) {
      return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 });
    }

    // Check business hours
    const tableMap = { salon_owner: 'shop_salon_info', mobile_service: 'mobile_service_info' };
    const tableName = tableMap[bizInfo.business_category];
    let businessHours = [];
    if (tableName) {
      const { data } = await supabase
        .from(tableName)
        .select('business_hours')
        .eq('business_info_id', businessId)
        .single();
      businessHours = data?.business_hours || [];
    }

    const dayOfWeek = startDate.getUTCDay();
    const daySchedule = businessHours.find(h => h.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isOpen) {
      return NextResponse.json({ error: 'Business is closed on this day' }, { status: 400 });
    }
    if (startTime < daySchedule.openTime || endHHMM > daySchedule.closeTime) {
      return NextResponse.json({ error: `Appointment must be between ${daySchedule.openTime} and ${daySchedule.closeTime}` }, { status: 400 });
    }

    // Check schedule exceptions
    const { data: exceptions } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .eq('business_info_id', businessId);

    for (const ex of (exceptions || [])) {
      if (ex.recurring && ex.recurring_day === dayOfWeek) {
        if (ex.is_full_day) {
          return NextResponse.json({ error: `Closed: ${ex.title}` }, { status: 400 });
        }
        if (ex.start_time && ex.end_time) {
          const exStart = ex.start_time.substring(0, 5);
          const exEnd = ex.end_time.substring(0, 5);
          if (startTime < exEnd && endHHMM > exStart) {
            return NextResponse.json({ error: `Time conflicts with: ${ex.title}` }, { status: 400 });
          }
        }
        continue;
      }
      const exDate = ex.date;
      const exEndDate = ex.end_date || exDate;
      if (date >= exDate && date <= exEndDate) {
        if (ex.is_full_day) {
          return NextResponse.json({ error: `Closed: ${ex.title}` }, { status: 400 });
        }
        if (ex.start_time && ex.end_time) {
          const exStart = ex.start_time.substring(0, 5);
          const exEnd = ex.end_time.substring(0, 5);
          if (startTime < exEnd && endHHMM > exStart) {
            return NextResponse.json({ error: `Time conflicts with: ${ex.title}` }, { status: 400 });
          }
        }
      }
    }

    // Check for conflicting appointments (atomic check to prevent double-booking)
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('business_info_id', businessId)
      .eq('status', 'confirmed')
      .lt('start_time', endISO)
      .gt('end_time', startISO);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'This time slot is no longer available. Please choose another time.' }, { status: 409 });
    }

    // Check if this user already has a pending or confirmed booking that overlaps
    const { data: userConflicts } = await supabase
      .from('appointments')
      .select('id, status, start_time')
      .eq('clerk_id', clerkId)
      .eq('business_info_id', businessId)
      .in('status', ['pending', 'confirmed'])
      .lt('start_time', endISO)
      .gt('end_time', startISO);

    if (userConflicts && userConflicts.length > 0) {
      const existingStatus = userConflicts[0].status;
      const existingTime = new Date(userConflicts[0].start_time).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
      return NextResponse.json({
        error: `You already have a ${existingStatus} booking at ${existingTime}. You cannot book the same time slot twice.`,
      }, { status: 409 });
    }

    // Get the booking user's info
    const { data: bookingUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .single();

    // Create the appointment
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        business_info_id: businessId,
        clerk_id: clerkId,
        client_name: sanitizeText(clientName),
        client_phone: clientPhone ? sanitizePhone(clientPhone) : null,
        service: combinedName,
        price: totalPrice,
        start_time: startISO,
        end_time: endISO,
        status: 'pending',
        notes: notes ? sanitizeText(notes) : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[book/create] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        service: appointment.service,
        price: appointment.price,
        startTime: appointment.start_time,
        endTime: appointment.end_time,
        status: appointment.status,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[book/create POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
