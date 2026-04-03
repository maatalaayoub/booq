import { getUserId } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData, validationResponse } from '@/lib/api-response';
import { parseQuery } from '@/lib/validate';
import { availableSlotsSchema } from '@/schemas/booking';
import { getAvailableSlots, ServiceError } from '@/services/bookingService';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const { error: validationError, data: validated } = parseQuery(availableSlotsSchema, searchParams);
    if (validationError) return validationResponse(validationError);

    const { businessId, date: dateStr, duration } = validated;

    const supabase = createServerSupabaseClient();

    let clerkId = null;
    try {
      clerkId = await getUserId(request);
    } catch (_) {
      // Auth not available — public access
    }

    const result = await getAvailableSlots(supabase, { businessId, dateStr, duration, clerkId });

    return apiData(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return apiError(err.message, err.status);
    }
    console.error('[available-slots GET]', err);
    return apiError('Internal server error');
  }
}
