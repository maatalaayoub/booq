'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';

export function useVerificationStatus() {
  const { isSignedIn, isLoaded: isClerkLoaded } = useAuthUser();
  const [isVerified, setIsVerified] = useState(false);
  const [identityStatus, setIdentityStatus] = useState('not_submitted');
  const [businessStatus, setBusinessStatus] = useState('not_submitted');
  const [isLoading, setIsLoading] = useState(true);

  const fetchVerificationStatus = useCallback(async () => {
    if (!isSignedIn) {
      setIsVerified(false);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/business/verification');
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[useVerificationStatus] API returned non-JSON response');
        setIsVerified(false);
        return;
      }
      const data = await response.json();
      
      if (response.ok && data.verification) {
        const v = data.verification;
        setIdentityStatus(v.identity_status || 'not_submitted');
        setBusinessStatus(v.business_status || 'not_submitted');
        // Business is verified when both documents are verified
        setIsVerified(v.identity_status === 'verified' && v.business_status === 'verified');
      } else {
        setIsVerified(false);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (isClerkLoaded) {
      fetchVerificationStatus();
    }
  }, [isClerkLoaded, fetchVerificationStatus]);

  return {
    isVerified,
    identityStatus,
    businessStatus,
    isLoading,
    isLoaded: isClerkLoaded && !isLoading,
    refetch: fetchVerificationStatus,
  };
}
