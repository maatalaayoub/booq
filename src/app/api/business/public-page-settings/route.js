import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCategoryTableName, getBusinessContext } from '@/lib/business';
import { apiError, apiData } from '@/lib/api-response';

// Extend base context with business name from category table
async function getBusinessPageContext(supabase, clerkId) {
  const ctx = await getBusinessContext(supabase, clerkId);
  if (!ctx) return null;

  let businessName = null;
  const tableName = getCategoryTableName(ctx.category);

  if (tableName) {
    const { data } = await supabase
      .from(tableName)
      .select('business_name')
      .eq('business_info_id', ctx.businessInfoId)
      .single();
    businessName = data?.business_name;
  }

  return { ...ctx, businessName, tableName };
}

// ─── GET: fetch saved settings ─────────────────────────────
export async function GET(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessPageContext(supabase, userId);
    if (!ctx) return apiData({ settings: null, fallbackBusinessName: null });

    const { data, error } = await supabase
      .from('business_card_settings')
      .select('settings')
      .eq('business_info_id', ctx.businessInfoId)
      .single();

    if (error) {
      // Table missing or no row — return null gracefully with fallback
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return apiData({ settings: null, fallbackBusinessName: ctx.businessName || null });
      }
      throw error;
    }

    return apiData({ 
      settings: data?.settings || null,
      fallbackBusinessName: ctx.businessName || null 
    });
  } catch (err) {
    console.error('[card-settings GET]', err);
    return apiError(err.message);
  }
}

// ─── POST: save settings ───────────────────────────────────
export async function POST(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) return apiError('Unauthorized', 401);

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessPageContext(supabase, userId);
    if (!ctx) return apiError('Business profile not found. Please complete onboarding first.', 404);

    const body = await request.json();
    const { settings: incomingSettings, partial } = body;

    // Sanitize businessName: strip HTML/script tags and control characters
    if (incomingSettings?.businessName) {
      incomingSettings.businessName = incomingSettings.businessName
        .replace(/<[^>]*>/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim()
        .slice(0, 60);
    }

    // Merge with existing settings if this is a partial (dirty-fields-only) update
    let finalSettings = incomingSettings;
    if (partial) {
      const { data: existing } = await supabase
        .from('business_card_settings')
        .select('settings')
        .eq('business_info_id', ctx.businessInfoId)
        .single();

      finalSettings = { ...(existing?.settings || {}), ...incomingSettings };
    }

    // Also update business_name in the canonical location (category-specific table)
    if (incomingSettings?.businessName && ctx.tableName) {
      await supabase
        .from(ctx.tableName)
        .update({ business_name: incomingSettings.businessName })
        .eq('business_info_id', ctx.businessInfoId);
    }

    const { error } = await supabase
      .from('business_card_settings')
      .upsert(
        { business_info_id: ctx.businessInfoId, settings: finalSettings, updated_at: new Date().toISOString() },
        { onConflict: 'business_info_id' }
      );

    if (error) {
      // Table not created yet — still return 200 so the UI doesn't break
      if (error.code === '42P01') {
        return apiData({ ok: true, note: 'settings table not yet created' });
      }
      throw error;
    }

    return apiData({ ok: true });
  } catch (err) {
    console.error('[card-settings POST]', err);
    return apiError(err?.message || 'Failed to save settings');
  }
}
