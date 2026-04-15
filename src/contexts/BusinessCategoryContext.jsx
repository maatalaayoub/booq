'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';

const BusinessCategoryContext = createContext({
  businessCategory: null,
  serviceMode: null,
  serviceCategorySlug: null,
  isLoading: true,
});

export function BusinessCategoryProvider({ children }) {
  const { user, isLoaded } = useAuthUser();
  const [businessCategory, setBusinessCategory] = useState(null);
  const [serviceMode, setServiceMode] = useState(null);
  const [serviceCategorySlug, setServiceCategorySlug] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCategory() {
      try {
        const res = await fetch('/api/business/onboarding');
        if (res.ok) {
          const text = await res.text();
          if (text && (text.startsWith('{') || text.startsWith('['))) {
            const data = JSON.parse(text);
            setBusinessCategory(data.businessCategory || null);
            setServiceMode(data.businessInfo?.service_mode || null);
            setServiceCategorySlug(data.serviceCategorySlug || null);
          }
        }
      } catch (err) {
        console.error('Error fetching business category:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (isLoaded && user) {
      fetchCategory();
    } else if (isLoaded && !user) {
      setIsLoading(false);
    }
  }, [isLoaded, user]);

  return (
    <BusinessCategoryContext.Provider value={{ businessCategory, serviceMode, serviceCategorySlug, isLoading }}>
      {children}
    </BusinessCategoryContext.Provider>
  );
}

export function useBusinessCategory() {
  return useContext(BusinessCategoryContext);
}
