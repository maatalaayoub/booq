'use client';

import { useAuthUser } from '@/hooks/useAuthUser';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

export function useRole({ requiredRole = null, redirectTo = '/' } = {}) {
  const { user, isLoaded: isAuthLoaded, isSignedIn, getToken } = useAuthUser();
  const router = useRouter();
  
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseUserId, setSupabaseUserId] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Helper to get auth headers with token
  const getAuthHeaders = useCallback(async () => {
    try {
      const token = await getToken();
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }, [getToken]);

  // Fetch role from Supabase
  const fetchRole = useCallback(async () => {
    if (!isSignedIn || !user) {
      setRole(null);
      setOnboardingCompleted(false);
      setIsLoading(false);
      return;
    }

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/get-role', { headers: authHeaders });
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[useRole] API returned non-JSON response');
        setRole(null);
        setOnboardingCompleted(false);
        return;
      }
      const data = await response.json();
      
      if (response.ok) {
        setRole(data.role);
        setSupabaseUserId(data.userId || null);
        setOnboardingCompleted(data.onboardingCompleted || false);
      } else {
        setRole(null);
        setOnboardingCompleted(false);
      }
    } catch (error) {
      console.error('Error fetching role:', error);
      setRole(null);
      setOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, user, getAuthHeaders]);

  useEffect(() => {
    if (isAuthLoaded) {
      fetchRole();
    }
  }, [isAuthLoaded, fetchRole]);

  const isUser = role === 'user';
  const isBusiness = role === 'business';
  const isAdmin = role === 'admin';
  const hasRole = role !== null;
  const isLoaded = isAuthLoaded && !isLoading;

  // Client-side role enforcement
  useEffect(() => {
    if (!isLoaded) return;
    if (requiredRole && role !== requiredRole) {
      router.push(redirectTo);
    }
  }, [isLoaded, role, requiredRole, redirectTo, router]);

  // Function to assign role (with retry for transient network errors)
  const assignRole = useCallback(async (newRole, maxRetries = 2) => {
    console.log('[useRole] assignRole called with:', newRole);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[useRole] Retry attempt ${attempt}/${maxRetries}...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
        
        const authHeaders = await getAuthHeaders();
        const response = await fetch('/api/set-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ role: newRole }),
        });
        
        const responseText = await response.text();
        console.log('[useRole] Raw response:', responseText);
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('[useRole] Failed to parse response:', parseError);
          return { success: false, error: 'Invalid server response', details: responseText };
        }
        
        console.log('[useRole] API response:', { status: response.status, data });
        
        if (response.ok) {
          setRole(data.role);
          setSupabaseUserId(data.userId || null);
          return { success: true, role: data.role };
        } else {
          if (response.status === 403 && data.role) {
            console.log('[useRole] Role already assigned:', data.role);
            setRole(data.role);
            return { success: false, error: data.error, role: data.role, alreadyAssigned: true };
          }
          // Retry on server/database errors (5xx), not on client errors (4xx)
          if (response.status >= 500 && attempt < maxRetries) {
            console.warn(`[useRole] Server error (${response.status}), will retry...`);
            continue;
          }
          console.error('[useRole] Error details:', JSON.stringify(data, null, 2));
          return { success: false, error: data.error, details: data.details, code: data.code };
        }
      } catch (error) {
        if (attempt < maxRetries) {
          console.warn('[useRole] Network error, will retry:', error.message);
          continue;
        }
        console.error('[useRole] Error assigning role after retries:', error);
        return { success: false, error: 'Network error', details: error.message };
      }
    }
  }, [getAuthHeaders]);

  // Refetch role data
  const refetch = useCallback(() => {
    setIsLoading(true);
    return fetchRole();
  }, [fetchRole]);

  return {
    role,
    isUser,
    isBusiness,
    isAdmin,
    hasRole,
    onboardingCompleted,
    isLoaded,
    isLoading,
    isSignedIn,
    user,
    supabaseUserId,
    assignRole,
    refetch,
  };
}

export default useRole;
