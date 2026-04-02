import { getUserId, getInternalUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiSuccess, apiData } from '@/lib/api-response';

// PATCH - Update application (withdraw)
export async function PATCH(request, { params }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['withdrawn'].includes(status)) {
      return apiError('Invalid status update', 400);
    }

    const supabase = createServerSupabaseClient();

    const internalId = await getInternalUserId(supabase, userId);
    if (!internalId) {
      return apiError('User not found', 404);
    }

    const { data, error } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', id)
      .eq('applicant_id', internalId)
      .select()
      .single();

    if (error) {
      console.error('[applications] PATCH error:', error);
      return apiError('Failed to update application');
    }

    if (!data) {
      return apiError('Application not found', 404);
    }

    return apiData(data);
  } catch (error) {
    console.error('[applications] PATCH error:', error);
    return apiError('Internal server error');
  }
}

// DELETE - Delete application
export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return apiError('Unauthorized', 401);
    }

    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const internalId = await getInternalUserId(supabase, userId);
    if (!internalId) {
      return apiError('User not found', 404);
    }

    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', id)
      .eq('applicant_id', internalId);

    if (error) {
      console.error('[applications] DELETE error:', error);
      return apiError('Failed to delete application');
    }

    return apiSuccess();
  } catch (error) {
    console.error('[applications] DELETE error:', error);
    return apiError('Internal server error');
  }
}
