import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';
import { getBusinessContext } from '@/lib/business';
import { parseBody, parseQuery } from '@/lib/validate';
import { createServiceSchema, updateServiceSchema, deleteServiceSchema } from '@/schemas/business-service';

// ─── GET: list all services ────────────────────────────────
export async function GET(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    // No business profile yet — return empty instead of 404
    if (!ctx) return apiData({ services: [], specialty: null });

    const { data, error } = await supabase
      .from('business_services')
      .select('*')
      .eq('business_info_id', ctx.businessInfoId)
      .order('created_at', { ascending: true });

    // Table doesn't exist yet — return empty list gracefully
    if (error) {
      if (error.code === '42P01') return apiData({ services: [] });
      throw error;
    }
    return apiData({ services: data || [], specialty: ctx.professionalType });
  } catch (err) {
    console.error('[services GET]', err);
    return apiError(err.message);
  }
}

// ─── POST: create service ──────────────────────────────────
export async function POST(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(createServiceSchema, body);
    if (validationError) return validationError;

    const { data, error } = await supabase
      .from('business_services')
      .insert({
        business_info_id: ctx.businessInfoId,
        name: sanitizeText(validated.name),
        description: validated.description ? sanitizeText(validated.description.trim()) : null,
        duration_minutes: validated.duration_minutes,
        price: validated.price,
        currency: validated.currency,
        is_active: validated.is_active,
      })
      .select()
      .single();

    if (error) throw error;
    return apiData({ service: data }, 201);
  } catch (err) {
    console.error('[services POST]', err);
    return apiError(err.message);
  }
}

// ─── PUT: update service ───────────────────────────────────
export async function PUT(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return apiError('Business not found', 404);

    const body = await request.json();
    const { error: validationError, data: validated } = parseBody(updateServiceSchema, body);
    if (validationError) return validationError;

    const { id, ...fields } = validated;
    const updateData = { updated_at: new Date().toISOString() };
    if (fields.name !== undefined) updateData.name = sanitizeText(fields.name);
    if (fields.description !== undefined) updateData.description = sanitizeText(fields.description.trim()) || null;
    if (fields.duration_minutes !== undefined) updateData.duration_minutes = fields.duration_minutes;
    if (fields.price !== undefined) updateData.price = fields.price;
    if (fields.currency !== undefined) updateData.currency = fields.currency;
    if (fields.is_active !== undefined) updateData.is_active = fields.is_active;

    const { data, error } = await supabase
      .from('business_services')
      .update(updateData)
      .eq('id', id)
      .eq('business_info_id', ctx.businessInfoId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiError('Service not found', 404);
      }
      throw error;
    }
    return apiData({ service: data });
  } catch (err) {
    console.error('[services PUT]', err);
    return apiError(err.message);
  }
}

// ─── DELETE: remove service ────────────────────────────────
export async function DELETE(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return apiError('Business not found', 404);

    const { searchParams } = new URL(request.url);
    const { error: validationError, data: validated } = parseQuery(deleteServiceSchema, searchParams);
    if (validationError) return validationError;
    const { id } = validated;

    const { error } = await supabase
      .from('business_services')
      .delete()
      .eq('id', id)
      .eq('business_info_id', ctx.businessInfoId);

    if (error) throw error;
    return apiSuccess();
  } catch (err) {
    console.error('[services DELETE]', err);
    return apiError(err.message);
  }
}
