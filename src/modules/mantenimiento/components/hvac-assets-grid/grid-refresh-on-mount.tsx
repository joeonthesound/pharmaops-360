'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function GridRefreshOnMount() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    router.refresh();
  }, [pathname, router, searchParams]);

  return null;
}
