import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData } from '@/lib/api-response';

const BUCKET = 'profile-images';
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return apiError('Missing file', 400);
    }

    // Validate file size
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_SIZE_MB * 1024 * 1024) {
      return apiError(`File too large. Max ${MAX_SIZE_MB}MB allowed.`, 400);
    }

    // Validate file type
    const mimeType = file.type;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return apiError('Invalid file type. Use PDF, DOC, or DOCX.', 400);
    }

    const ext = mimeType === 'application/pdf' ? 'pdf'
      : mimeType === 'application/msword' ? 'doc'
      : 'docx';

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
      return apiError('User not found', 404);
    }

    const filePath = `resumes/${dbUser.id}-${Date.now()}.${ext}`;

    // Upload
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('[upload-cv] Upload error:', uploadError);
      return apiError('Upload failed');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    const url = `${publicUrl}?t=${Date.now()}`;

    // Save URL to job_seeker_info
    const { data: businessInfo } = await supabase
      .from('business_info')
      .select('id')
      .eq('user_id', dbUser.id)
      .single();

    if (businessInfo) {
      const { data: existing } = await supabase
        .from('job_seeker_info')
        .select('id')
        .eq('business_info_id', businessInfo.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('job_seeker_info')
          .update({ resume_url: url })
          .eq('business_info_id', businessInfo.id);
      } else {
        await supabase
          .from('job_seeker_info')
          .insert({ business_info_id: businessInfo.id, resume_url: url });
      }
    }

    return apiData({ url });
  } catch (error) {
    console.error('[upload-cv] Unexpected error:', error);
    return apiError('Internal server error');
  }
}
