import { getUserId, getInternalUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getBusinessContext } from '@/lib/business';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

const BUCKET = 'verification-documents';
const MAX_SIZE_MB = 10;

/**
 * GET /api/business/verification
 * Fetch the current user's verification status
 */
export async function GET(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const supabase = createServerSupabaseClient();

    // Get internal user id
    const internalId = await getInternalUserId(supabase, clerkId);
    if (!internalId) {
      return apiError('User not found', 404);
    }

    // Get verification request
    const { data: verification, error } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', internalId)
      .maybeSingle();

    if (error) {
      console.error('[verification] Error fetching verification:', error);
      return apiError('Failed to fetch verification');
    }

    if (!verification) {
      // No verification request yet
      return apiData({
        verification: {
          identity_status: 'not_submitted',
          business_status: 'not_submitted',
          identity_document_url: null,
          business_document_url: null,
          identity_rejection_reason: null,
          business_rejection_reason: null,
        }
      });
    }

    return apiData({ verification });
  } catch (error) {
    console.error('[verification] Unexpected error:', error);
    return apiError('Internal server error');
  }
}

/**
 * POST /api/business/verification
 * Upload verification documents and create/update verification request
 * FormData: { identityFile: File, businessFile: File }
 */
export async function POST(request) {
  try {
    const clerkId = await getUserId(request);
    if (!clerkId) {
      return apiError('Unauthorized', 401);
    }

    const formData = await request.formData();
    const identityFile = formData.get('identityFile');
    const businessFile = formData.get('businessFile');
    const identityDocumentType = formData.get('identityDocumentType') || null;
    const businessDocumentType = formData.get('businessDocumentType') || null;

    if (!identityFile && !businessFile) {
      return apiError('At least one file is required', 400);
    }

    const supabase = createServerSupabaseClient();

    // Get business context
    const ctx = await getBusinessContext(supabase, clerkId);
    if (!ctx) {
      return apiError('Business profile not found. Complete onboarding first.', 404);
    }

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET, { public: false });
    }

    const uploadResults = {};

    // Upload identity document
    if (identityFile && identityFile.size > 0) {
      const uploadResult = await uploadDocument(supabase, identityFile, ctx.userId, 'identity');
      if (uploadResult.error) {
        return apiError(uploadResult.error, 400);
      }
      uploadResults.identity_document_url = uploadResult.url;
    }

    // Upload business document
    if (businessFile && businessFile.size > 0) {
      const uploadResult = await uploadDocument(supabase, businessFile, ctx.userId, 'business');
      if (uploadResult.error) {
        return apiError(uploadResult.error, 400);
      }
      uploadResults.business_document_url = uploadResult.url;
    }

    // Check if verification request exists
    const { data: existingVerification } = await supabase
      .from('verification_requests')
      .select('id, identity_status, business_status')
      .eq('user_id', ctx.userId)
      .maybeSingle();

    if (existingVerification) {
      // Update existing verification request
      const updateData = { updated_at: new Date().toISOString() };
      
      if (uploadResults.identity_document_url) {
        updateData.identity_document_url = uploadResults.identity_document_url;
        updateData.identity_document_type = identityDocumentType;
        updateData.identity_status = 'pending';
        updateData.identity_reviewed_by = null;
        updateData.identity_reviewed_at = null;
        updateData.identity_rejection_reason = null;
      }
      
      if (uploadResults.business_document_url) {
        updateData.business_document_url = uploadResults.business_document_url;
        updateData.business_document_type = businessDocumentType;
        updateData.business_status = 'pending';
        updateData.business_reviewed_by = null;
        updateData.business_reviewed_at = null;
        updateData.business_rejection_reason = null;
      }

      const { error: updateError } = await supabase
        .from('verification_requests')
        .update(updateData)
        .eq('id', existingVerification.id);

      if (updateError) {
        console.error('[verification] Update error:', updateError);
        return apiError('Failed to update verification');
      }
    } else {
      // Create new verification request
      const insertData = {
        user_id: ctx.userId,
        business_info_id: ctx.businessInfoId,
        identity_document_url: uploadResults.identity_document_url || null,
        business_document_url: uploadResults.business_document_url || null,
        identity_document_type: identityDocumentType,
        business_document_type: businessDocumentType,
        identity_status: uploadResults.identity_document_url ? 'pending' : 'pending',
        business_status: uploadResults.business_document_url ? 'pending' : 'pending',
      };

      const { error: insertError } = await supabase
        .from('verification_requests')
        .insert(insertData);

      if (insertError) {
        console.error('[verification] Insert error:', insertError);
        return apiError('Failed to create verification');
      }
    }

    // Fetch updated verification
    const { data: verification } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', ctx.userId)
      .single();

    return apiSuccess({ 
      verification,
      message: 'Documents submitted successfully' 
    });
  } catch (error) {
    console.error('[verification] Unexpected error:', error);
    return apiError('Internal server error');
  }
}

/**
 * Helper function to upload a document
 */
async function uploadDocument(supabase, file, userId, type) {
  // Validate file size
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_SIZE_MB * 1024 * 1024) {
    return { error: `File too large. Max ${MAX_SIZE_MB}MB allowed.` };
  }

  // Validate file type
  const mimeType = file.type;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(mimeType)) {
    return { error: 'Invalid file type. Use JPEG, PNG, WebP, or PDF.' };
  }

  // Validate magic bytes
  const header = new Uint8Array(bytes.slice(0, 12));
  const isJPEG = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
  const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
  const isWEBP = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46
              && header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  const isPDF = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
  if (!isJPEG && !isPNG && !isWEBP && !isPDF) {
    return { error: 'Invalid file content. File does not match its declared type.' };
  }

  const ext = mimeType === 'application/pdf' ? 'pdf' : mimeType.split('/')[1].replace('jpeg', 'jpg');
  const timestamp = Date.now();
  const filePath = `${type}/${userId}-${timestamp}.${ext}`;

  // Upload file
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, bytes, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error(`[verification] Upload error for ${type}:`, uploadError);
    return { error: `Failed to upload ${type} document` };
  }

  // Get signed URL (private bucket)
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

  if (!data?.signedUrl) {
    // Fallback to path reference
    return { url: `${BUCKET}/${filePath}` };
  }

  return { url: data.signedUrl };
}
