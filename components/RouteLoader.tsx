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

  // Fallback timeout to prevent loader from getting stuck (e.g. if network drops or errors occur)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading) {
      timeoutId = setTimeout(() => {
        setLoading(false);
      }, 8000); // 8 seconds maximum load screen duration
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href) {
        const url = new URL(target.href);
        const currentUrl = new URL(window.location.href);
        
        // Exclude resource files with extensions from triggering loader
        const isFile = /\.[a-z0-9]+$/i.test(url.pathname);

        // If it's internal navigation, not a file, and not just a hash change or identical URL
        if (
          !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0 &&
          url.origin === currentUrl.origin &&
          url.pathname !== currentUrl.pathname &&
          target.target !== '_blank' &&
          !isFile
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
