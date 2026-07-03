'use client';

import { useEffect } from 'react';

export function PrintTrigger() {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
}
