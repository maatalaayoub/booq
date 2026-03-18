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

async function getUserId(request) {
  const { userId } = await auth();
  if (userId) return userId;

  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { verifyToken } = await import('@clerk/backend');
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      if (payload?.sub) return payload.sub;
    } catch (err) {
      console.log('[services] Bearer verify failed:', err.message);
    }
  }
  return null;
}

async function getBusinessContext(supabase, clerkId) {
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('clerk_id', clerkId)
    .single();

  if (!user || user.role !== 'business') return null;

  const { data: businessInfo } = await supabase
    .from('business_info')
    .select('id, professional_type')
    .eq('user_id', user.id)
    .single();

  if (!businessInfo) return null;
  return { businessInfoId: businessInfo.id, specialty: businessInfo.professional_type };
}

// ─── GET: list all services ────────────────────────────────
export async function GET(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    // No business profile yet — return empty instead of 404
    if (!ctx) return NextResponse.json({ services: [], specialty: null });

    const { data, error } = await supabase
      .from('business_services')
      .select('*')
      .eq('business_info_id', ctx.businessInfoId)
      .order('created_at', { ascending: true });

    // Table doesn't exist yet — return empty list gracefully
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ services: [] });
      throw error;
    }
    return NextResponse.json({ services: data || [], specialty: ctx.specialty });
  } catch (err) {
    console.error('[services GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST: create service ──────────────────────────────────
export async function POST(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    const { name, description, duration_minutes, price, currency, is_active } = body;

    if (!name || price === undefined || price === null) {
      return NextResponse.json({ error: 'name and price are required' }, { status: 400 });
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
    return NextResponse.json({ service: data }, { status: 201 });
  } catch (err) {
    console.error('[services POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PUT: update service ───────────────────────────────────
export async function PUT(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    const { id, name, description, duration_minutes, price, currency, is_active } = body;

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

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

    if (error) throw error;
    return NextResponse.json({ service: data });
  } catch (err) {
    console.error('[services PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE: remove service ────────────────────────────────
export async function DELETE(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase
      .from('business_services')
      .delete()
      .eq('id', id)
      .eq('business_info_id', ctx.businessInfoId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[services DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
