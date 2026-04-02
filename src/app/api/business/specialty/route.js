import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiError, apiData } from '@/lib/api-response';

/**
 * GET /api/business/specialty
 * Fetch all active service categories with their specialties.
 * Supports optional ?category_id= filter to get specialties for a specific category.
 */
export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    if (categoryId) {
      // Fetch specialties for a specific category
      const { data: specialties, error } = await supabase
        .from('specialties')
        .select('id, name, slug, description, icon, custom_icon, display_order')
        .eq('service_category_id', categoryId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        return apiError(error.message);
      }

      return apiData({ specialties: specialties || [] });
    }

    // Fetch all active service categories with their specialties
    const { data: categories, error } = await supabase
      .from('service_categories')
      .select(`
        id, name, slug, description, icon, display_order,
        specialties ( id, name, slug, description, icon, custom_icon, display_order )
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return apiError(error.message);
    }

    // Sort specialties within each category
    const result = (categories || []).map(cat => ({
      ...cat,
      specialties: (cat.specialties || [])
        .filter(s => s)
        .sort((a, b) => a.display_order - b.display_order),
    }));

    return apiData({ categories: result });
  } catch (err) {
    return apiError('Internal server error');
  }
}
