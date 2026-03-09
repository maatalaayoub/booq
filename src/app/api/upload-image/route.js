import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const BUCKET = 'profile-images';
const MAX_SIZE_MB = 5;

export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type'); // 'avatar' | 'cover'

    if (!file || !type) {
      return NextResponse.json({ error: 'Missing file or type' }, { status: 400 });
    }

    if (!['avatar', 'cover', 'gallery_cover', 'business_avatar'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be avatar, cover, gallery_cover, or business_avatar.' }, { status: 400 });
    }

    // Validate file size
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File too large. Max ${MAX_SIZE_MB}MB allowed.` }, { status: 400 });
    }

    // Validate file type
    const mimeType = file.type;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 });
    }

    const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
    const supabase = createServerSupabaseClient();

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    }

    // Get internal user id
    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const filePath = type === 'gallery_cover'
      ? `covers/${dbUser.id}-${Date.now()}.${ext}`
      : type === 'business_avatar'
        ? `business_avatars/${dbUser.id}-${Date.now()}.${ext}`
        : `${type}s/${dbUser.id}.${ext}`;

    // Upload (upsert — overwrite previous)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-image] Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    // Add cache-busting query param so browser picks up the new image
    const url = `${publicUrl}?t=${Date.now()}`;

    // For gallery covers and business avatars, just return the URL — caller saves it in settings
    if (type === 'gallery_cover' || type === 'business_avatar') {
      return NextResponse.json({ url });
    }

    // Save URL to user_profile
    const column = type === 'cover' ? 'cover_image_url' : 'profile_image_url';

    const { data: existing } = await supabase
      .from('user_profile')
      .select('id')
      .eq('user_id', dbUser.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_profile')
        .update({ [column]: url })
        .eq('user_id', dbUser.id);
    } else {
      await supabase
        .from('user_profile')
        .insert({ user_id: dbUser.id, [column]: url });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('[upload-image] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
