import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

/**
 * GET /api/bookings
 * Fetch all appointments for the currently signed-in user.
 * Returns appointments with business info (name, avatar, accent color).
 */
export async function GET(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
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
      return apiError(error.message);
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

    return apiData({ bookings: results });
  } catch (err) {
    return apiError('Internal server error');
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
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const body = await request.json();
    const { id, date, startTime, serviceIds } = body;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRe.test(id)) {
      return apiError('Invalid appointment id', 400);
    }

    const hasTimeChange = date && startTime;
    const hasServiceChange = Array.isArray(serviceIds) && serviceIds.length > 0;

    if (!hasTimeChange && !hasServiceChange) {
      return apiError('Nothing to update', 400);
    }

    if (hasTimeChange) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return apiError('Invalid date', 400);
      }
      if (!/^\d{2}:\d{2}$/.test(startTime)) {
        return apiError('Invalid startTime format (HH:MM)', 400);
      }
    }

    if (hasServiceChange) {
      if (!serviceIds.every(sid => uuidRe.test(sid))) {
        return apiError('Invalid service ID format', 400);
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
      return apiError('Appointment not found', 404);
    }

    if (apt.status === 'cancelled' || apt.status === 'completed') {
      return apiError('Cannot edit a cancelled or completed appointment', 400);
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
        return apiError('Invalid services selected', 400);
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
        return apiError('Cannot schedule in the past', 400);
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
        return apiError('This time slot is no longer available', 409);
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
      return apiError(updateErr.message || 'Failed to update booking');
    }

    return apiSuccess({ appointment: updated });
  } catch (err) {
    console.error('[bookings PATCH] Error:', err);
    return apiError('Internal server error');
  }
}

/**
 * DELETE /api/bookings?id=UUID
 * Cancel an appointment (user-side). Sets status to 'cancelled'.
 */
export async function DELETE(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRe.test(id)) {
      return apiError('Invalid appointment id', 400);
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
      return apiError('Appointment not found', 404);
    }

    if (apt.status === 'cancelled') {
      return apiError('Already cancelled', 400);
    }

    if (apt.status === 'completed') {
      return apiError('Cannot cancel a completed appointment', 400);
    }

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('clerk_id', clerkId);

    if (updateErr) {
      console.error('[bookings DELETE] Error:', updateErr);
      return apiError('Failed to cancel');
    }

    return apiSuccess();
  } catch (err) {
    console.error('[bookings DELETE] Error:', err);
    return apiError('Internal server error');
  }
}
