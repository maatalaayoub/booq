import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId } from '@/lib/auth/supabase-adapter';

export async function GET() {
  try {
    console.log('[test-supabase] Testing Supabase connection...');

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[test-supabase] URL:', supabaseUrl ? 'Set' : 'MISSING');
    console.log('[test-supabase] Service Key:', supabaseServiceKey ? 'Set (length: ' + supabaseServiceKey.length + ')' : 'MISSING');

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }

    // Get current user from Supabase Auth
    const authUserId = await getSessionUserId();
    console.log('[test-supabase] Supabase Auth userId:', authUserId);

    const supabase = createServerSupabaseClient();

    // Test 1: Check if we can read from the users table
    console.log('[test-supabase] Reading users table...');
    const { data: users, error: readError } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (readError) {
      console.log('[test-supabase] Read error:', readError);
      return NextResponse.json({
        success: false,
        test: 'read',
        error: readError.message,
        code: readError.code
      }, { status: 500 });
    }

    console.log('[test-supabase] Found', users?.length || 0, 'users');

    // Check if current user exists in database
    let existingDbUser = null;
    if (authUserId) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_auth_id', authUserId)
        .single();
      existingDbUser = dbUser;
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection working correctly',
      canRead: true,
      existingUsers: users?.length || 0,
      authUserId: authUserId,
      userInDatabase: !!existingDbUser,
      dbUser: existingDbUser
    });

  } catch (error) {
    console.error('[test-supabase] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      message: error.message
    }, { status: 500 });
  }
}
