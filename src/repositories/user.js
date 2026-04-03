// ─── USER REPOSITORY ────────────────────────────────────────────────────
// Reusable data-access functions for the `users` and `user_profile` tables.

/**
 * Find a user by their Clerk ID.
 * @returns {{ id, role, email, username, onboarding_completed, created_at } | null}
 */
export async function findUserByClerkId(supabase, clerkId, columns = 'id, role') {
  const { data, error } = await supabase
    .from('users')
    .select(columns)
    .eq('clerk_id', clerkId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Find a user by internal ID.
 */
export async function findUserById(supabase, userId, columns = 'id, role') {
  const { data, error } = await supabase
    .from('users')
    .select(columns)
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Check if a username is taken (excluding a specific user ID).
 * @returns {boolean}
 */
export async function isUsernameTaken(supabase, username, excludeUserId = null) {
  let query = supabase
    .from('users')
    .select('id')
    .eq('username', username);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data } = await query.maybeSingle();
  return !!data;
}

/**
 * Update fields on the users table.
 */
export async function updateUser(supabase, userId, fields) {
  const { error } = await supabase
    .from('users')
    .update(fields)
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Fetch the user_profile for a given user ID.
 */
export async function findUserProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

/**
 * Upsert (insert or update) user_profile data.
 */
export async function upsertUserProfile(supabase, userId, profileData) {
  const existing = await findUserProfile(supabase, userId);

  if (existing) {
    const { error } = await supabase
      .from('user_profile')
      .update(profileData)
      .eq('user_id', userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_profile')
      .insert({ user_id: userId, ...profileData });
    if (error) throw error;
  }
}
