'use client';

import { useEffect, useState } from 'react';

/**
 * Wrapper component that only renders children on the client side
 * This prevents hydration mismatches with auth components
 */
export default function ClientOnly({ children, fallback = null }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return fallback;
  }

  return children;
}
