import { requireAdmin } from '@/lib/admin';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

/**
 * GET /api/admin/verifications
 * List all verification requests with user + business info.
 * Supports ?status= filter (pending, verified, rejected) — applies to either doc status.
 */
export async function GET(request) {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase } = result;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('verification_requests')
    .select(`
      *,
      users!verification_requests_user_id_fkey ( id, email, username, account_status, user_profile ( first_name, last_name, profile_image_url ) ),
      business_info!verification_requests_business_info_id_fkey ( 
        id, business_category, professional_type, service_category_id, specialty_id, service_mode,
        service_categories ( name, slug, icon ),
        specialties ( name, slug, custom_icon ),
        shop_salon_info ( business_name, address, city, phone ),
        mobile_service_info ( business_name, service_area, phone ),
        business_card_settings ( settings )
      )
    `)
    .order('created_at', { ascending: false });

  if (status === 'pending') {
    query = query.or('identity_status.eq.pending,business_status.eq.pending');
  } else if (status === 'verified') {
    query = query.eq('identity_status', 'verified').eq('business_status', 'verified');
  } else if (status === 'rejected') {
    query = query.or('identity_status.eq.rejected,business_status.eq.rejected');
  }

  const { data, error } = await query;

  if (error) {
    return apiError(error.message);
  }

  return apiData({ verifications: data || [] });
}

/**
 * PUT /api/admin/verifications
 * Approve or reject a verification document.
 * Body: { verificationId, field: 'identity'|'business', action: 'approve'|'reject', reason? }
 */
export async function PUT(request) {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const { supabase, adminUser } = result;

  const body = await request.json();
  const { verificationId, field, action, reason } = body;

  if (!verificationId || !['identity', 'business'].includes(field) || !['approve', 'reject'].includes(action)) {
    return apiError('Invalid request', 400);
  }

  const newStatus = action === 'approve' ? 'verified' : 'rejected';

  const updateData = {
    [`${field}_status`]: newStatus,
    [`${field}_reviewed_by`]: adminUser.id,
    [`${field}_reviewed_at`]: new Date().toISOString(),
  };

  if (action === 'reject' && reason) {
    updateData[`${field}_rejection_reason`] = reason;
  }

  const { error } = await supabase
    .from('verification_requests')
    .update(updateData)
    .eq('id', verificationId);

  if (error) {
    return apiError(error.message);
  }

  // Fetch the verification to get target user id for audit
  const { data: vr } = await supabase
    .from('verification_requests')
    .select('user_id')
    .eq('id', verificationId)
    .single();

  await supabase.from('admin_actions_log').insert({
    admin_user_id: adminUser.id,
    action_type: `${action}_${field}`,
    target_user_id: vr?.user_id || null,
    details: { verificationId, reason: reason || null },
  });

  return apiSuccess();
}
