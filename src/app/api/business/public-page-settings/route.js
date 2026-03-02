import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

async function getBusinessContext(supabase, clerkId) {
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

  if (!businessInfo) return null;
  return { businessInfoId: businessInfo.id };
}

// ─── GET: fetch saved settings ─────────────────────────────
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, userId);
    if (!ctx) return NextResponse.json({ settings: null });

    const { data, error } = await supabase
      .from('business_public_page_settings')
      .select('settings')
      .eq('business_info_id', ctx.businessInfoId)
      .single();

    if (error) {
      // Table missing or no row — return null gracefully
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return NextResponse.json({ settings: null });
      }
      throw error;
    }

    return NextResponse.json({ settings: data?.settings || null });
  } catch (err) {
    console.error('[public-page-settings GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: save settings ───────────────────────────────────
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, userId);
    if (!ctx) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    const { settings } = body;

    const { error } = await supabase
      .from('business_public_page_settings')
      .upsert(
        { business_info_id: ctx.businessInfoId, settings, updated_at: new Date().toISOString() },
        { onConflict: 'business_info_id' }
      );

    if (error) {
      // Table not created yet — still return 200 so the UI doesn't break
      if (error.code === '42P01') {
        return NextResponse.json({ ok: true, note: 'settings table not yet created' });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[public-page-settings POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
