'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

function isSameOriginNavigation(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== '_self') {
    return false;
  }

  if (anchor.hasAttribute('download')) {
    return false;
  }

  const href = anchor.getAttribute('href');

  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }

  try {
    const url = new URL(anchor.href);

    return url.origin === window.location.origin && url.href !== window.location.href;
  } catch {
    return false;
  }
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const completionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function startNavigation(event: MouseEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a');

      if (anchor instanceof HTMLAnchorElement && isSameOriginNavigation(anchor)) {
        setIsNavigating(true);
      }
    }

    function startHistoryNavigation() {
      setIsNavigating(true);
    }

    document.addEventListener('click', startNavigation, true);
    window.addEventListener('popstate', startHistoryNavigation);

    return () => {
      document.removeEventListener('click', startNavigation, true);
      window.removeEventListener('popstate', startHistoryNavigation);
    };
  }, []);

  useEffect(() => {
    if (!isNavigating) {
      return;
    }

    if (completionTimerRef.current) {
      window.clearTimeout(completionTimerRef.current);
    }

    completionTimerRef.current = window.setTimeout(() => {
      setIsNavigating(false);
    }, 450);

    return () => {
      if (completionTimerRef.current) {
        window.clearTimeout(completionTimerRef.current);
      }
    };
  }, [pathname, searchParams, isNavigating]);

  if (!isNavigating) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-label="Cargando nueva pantalla"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden"
      role="status"
    >
      <div className="pharmaops-route-progress h-1 bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.85)]" />
    </div>
  );
}
