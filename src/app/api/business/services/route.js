import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/sanitize';
import { getUserId } from '@/lib/auth';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';
import { getBusinessContext } from '@/lib/business';

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
    const { name, description, duration_minutes, price, currency, is_active } = body;

    if (!name || price === undefined || price === null) {
      return apiError('name and price are required', 400);
    }

    const { data, error } = await supabase
      .from('business_services')
      .insert({
        business_info_id: ctx.businessInfoId,
        name: sanitizeText(name.trim()),
        description: sanitizeText(description?.trim()) || null,
        duration_minutes: duration_minutes || 30,
        price: parseFloat(price),
        currency: currency || 'MAD',
        is_active: is_active !== undefined ? is_active : true,
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
    const { id, name, description, duration_minutes, price, currency, is_active } = body;

    if (!id) return apiError('id is required', 400);

    const { data, error } = await supabase
      .from('business_services')
      .update({
        name: sanitizeText(name?.trim()),
        description: sanitizeText(description?.trim()) || null,
        duration_minutes,
        price: parseFloat(price),
        currency: currency || 'MAD',
        is_active,
        updated_at: new Date().toISOString(),
      })
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
    const id = searchParams.get('id');
    if (!id) return apiError('id is required', 400);

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
