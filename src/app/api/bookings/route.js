import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/bookings
 * Fetch all appointments for the currently signed-in user.
 * Returns appointments with business info (name, avatar, accent color).
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        id, service, price, start_time, end_time, status, notes, client_name,
        business_info_id,
        business_info (
          id,
          business_category,
          professional_type,
          shop_salon_info ( business_name, phone, address, latitude, longitude ),
          mobile_service_info ( business_name, phone, address, latitude, longitude ),
          business_card_settings ( settings )
        )
      `)
      .eq('clerk_id', clerkId)
      .order('start_time', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = (appointments || []).map(apt => {
      const biz = apt.business_info;
      const details = biz?.shop_salon_info || biz?.mobile_service_info;
      const settings = biz?.business_card_settings?.settings || {};

      return {
        id: apt.id,
        service: apt.service,
        price: apt.price,
        startTime: apt.start_time,
        endTime: apt.end_time,
        status: apt.status,
        notes: apt.notes,
        clientName: apt.client_name,
        businessId: apt.business_info_id,
        businessName: settings.businessName || details?.business_name || '',
        businessPhone: details?.phone || null,
        businessAddress: details?.address || null,
        latitude: details?.latitude || null,
        longitude: details?.longitude || null,
        avatarUrl: settings.avatarUrl || null,
        accentColor: settings.accentColor || 'slate',
        professionalType: biz?.professional_type || '',
      };
    });

    return NextResponse.json({ bookings: results });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/bookings
 * Edit an appointment (user-side).
 * Body: { id, date?, startTime?, serviceIds? }
 * If time changes: saves previous time, sets status to 'pending', records rescheduled_by = 'client'.
 * If services change: updates service name, price, and recalculates end_time from new total duration.
 */
export async function PATCH(request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, date, startTime, serviceIds } = body;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRe.test(id)) {
      return NextResponse.json({ error: 'Invalid appointment id' }, { status: 400 });
    }

    const hasTimeChange = date && startTime;
    const hasServiceChange = Array.isArray(serviceIds) && serviceIds.length > 0;

    if (!hasTimeChange && !hasServiceChange) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    if (hasTimeChange) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      if (!/^\d{2}:\d{2}$/.test(startTime)) {
        return NextResponse.json({ error: 'Invalid startTime format (HH:MM)' }, { status: 400 });
      }
    }

    if (hasServiceChange) {
      if (!serviceIds.every(sid => uuidRe.test(sid))) {
        return NextResponse.json({ error: 'Invalid service ID format' }, { status: 400 });
      }
    }

    const supabase = createServerSupabaseClient();

    // Fetch existing appointment owned by this user
    const { data: apt, error: fetchErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('clerk_id', clerkId)
      .single();

    if (fetchErr || !apt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (apt.status === 'cancelled' || apt.status === 'completed') {
      return NextResponse.json({ error: 'Cannot edit a cancelled or completed appointment' }, { status: 400 });
    }

    const updateFields = {
      status: 'pending',
    };

    // Resolve new duration from services or keep existing
    let durationMs = new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime();

    if (hasServiceChange) {
      const { data: services, error: svcErr } = await supabase
        .from('business_services')
        .select('id, name, duration_minutes, price')
        .eq('business_info_id', apt.business_info_id)
        .eq('is_active', true)
        .in('id', serviceIds);

      if (svcErr || !services || services.length === 0) {
        return NextResponse.json({ error: 'Invalid services selected' }, { status: 400 });
      }

      // Preserve order from serviceIds
      const ordered = serviceIds.map(sid => services.find(s => s.id === sid)).filter(Boolean);
      const totalDuration = ordered.reduce((sum, s) => sum + s.duration_minutes, 0);
      const totalPrice = ordered.reduce((sum, s) => sum + (s.price || 0), 0);
      const combinedName = ordered.map(s => s.name).join(' + ');

      updateFields.service = combinedName;
      updateFields.price = totalPrice;
      durationMs = totalDuration * 60000;
    }

    // Mark as modified by client when editing a confirmed booking
    if (apt.status === 'confirmed') {
      updateFields.rescheduled_by = 'client';
    }

    if (hasTimeChange) {
      const newStart = new Date(`${date}T${startTime}:00Z`);
      const newEnd = new Date(newStart.getTime() + durationMs);

      if (newStart < new Date()) {
        return NextResponse.json({ error: 'Cannot schedule in the past' }, { status: 400 });
      }

      const newStartISO = newStart.toISOString();
      const newEndISO = newEnd.toISOString();

      // Check for conflicting confirmed appointments
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id')
        .eq('business_info_id', apt.business_info_id)
        .eq('status', 'confirmed')
        .neq('id', id)
        .lt('start_time', newEndISO)
        .gt('end_time', newStartISO);

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 });
      }

      updateFields.previous_start_time = apt.start_time;
      updateFields.previous_end_time = apt.end_time;
      updateFields.start_time = newStartISO;
      updateFields.end_time = newEndISO;
    } else if (hasServiceChange) {
      // Services changed but no time change — recalculate end_time from new duration
      const currentStart = new Date(apt.start_time);
      const newEnd = new Date(currentStart.getTime() + durationMs);
      updateFields.end_time = newEnd.toISOString();
    }

    const { data: updated, error: updateErr } = await supabase
      .from('appointments')
      .update(updateFields)
      .eq('id', id)
      .eq('clerk_id', clerkId)
      .select()
      .single();

    if (updateErr) {
      console.error('[bookings PATCH] Update error:', updateErr);
      console.error('[bookings PATCH] Update fields:', JSON.stringify(updateFields));
      return NextResponse.json({ error: updateErr.message || 'Failed to update booking' }, { status: 500 });
    }

    return NextResponse.json({ success: true, appointment: updated });
  } catch (err) {
    console.error('[bookings PATCH] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/bookings?id=UUID
 * Cancel an appointment (user-side). Sets status to 'cancelled'.
 */
export async function DELETE(request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRe.test(id)) {
      return NextResponse.json({ error: 'Invalid appointment id' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: apt } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', id)
      .eq('clerk_id', clerkId)
      .single();

    if (!apt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (apt.status === 'cancelled') {
      return NextResponse.json({ error: 'Already cancelled' }, { status: 400 });
    }

    if (apt.status === 'completed') {
      return NextResponse.json({ error: 'Cannot cancel a completed appointment' }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clerk_id', clerkId);

    if (updateErr) {
      console.error('[bookings DELETE] Error:', updateErr);
      return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[bookings DELETE] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
