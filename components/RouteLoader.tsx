'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import PremiumLoader from './PremiumLoader';

export default function RouteLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Clear loader when URL changes (navigation completes)
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href) {
        const url = new URL(target.href);
        const currentUrl = new URL(window.location.href);
        
        // If it's internal navigation and not just a hash change or identical URL
        if (
          url.origin === currentUrl.origin &&
          url.pathname !== currentUrl.pathname &&
          target.target !== '_blank'
        ) {
          setLoading(true);
        }
      }
    };

    // Use capture phase to intercept before Next.js Link handles it
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  if (!loading) return null;

  return <PremiumLoader fullScreen={true} />;
}
