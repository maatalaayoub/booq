import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 10;

export async function POST(request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const supabase = createServerSupabaseClient();

    // Rate limiting: check recent attempts from this IP
    const windowStart = new Date(
      Date.now() - WINDOW_MINUTES * 60 * 1000
    ).toISOString();

    const { count: recentAttempts } = await supabase
      .from('access_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', windowStart);

    if (recentAttempts >= MAX_ATTEMPTS) {
      // Log the blocked attempt
      await supabase.from('access_attempts').insert({
        ip,
        user_agent: userAgent,
        success: false,
      });

      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Fetch all active codes
    const { data: activeCodes, error: fetchError } = await supabase
      .from('site_access')
      .select('code, expires_at')
      .eq('is_active', true);

    if (fetchError) {
      console.error('[Access Gate] DB error:', fetchError.message);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Validate code against active entries
    const now = new Date();
    const trimmedCode = code.trim();
    const isValid = activeCodes?.some((entry) => {
      if (entry.code !== trimmedCode) return false;
      if (entry.expires_at && new Date(entry.expires_at) < now) return false;
      return true;
    });

    // Log the attempt
    await supabase.from('access_attempts').insert({
      ip,
      user_agent: userAgent,
      success: !!isValid,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 401 }
      );
    }

    // Success — set secure cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({ success: true });

    response.cookies.set('site_access', 'granted', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    return response;
  } catch (error) {
    console.error('[Access Gate] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
