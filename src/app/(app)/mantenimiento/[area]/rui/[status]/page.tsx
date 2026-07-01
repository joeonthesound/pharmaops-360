import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import HvacAssetsPage from '../../../hvac/activos/page';

type RuiStatusListingPageProps = {
  params: Promise<{
    area: string;
    status: string;
  }>;
  searchParams?: Promise<{
    asset?: string;
    aging?: string;
    deviations?: string;
    q?: string;
    risk?: string;
  }>;
};

function resolveViewFromStatus(status: string) {
  if (status === 'enviado') {
    return 'sent';
  }

  if (status === 'rechazado') {
    return 'rejected';
  }

  if (status === 'ht') {
    return 'history';
  }

  return 'pending';
}

export default async function RuiStatusListingPage({
  params,
  searchParams,
}: RuiStatusListingPageProps) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('[TELEMETRIA FORENSE F5]', {
      hasUser: !!user,
      userEmail: user?.email,
      authError: authError?.message || null,
      cookiesPresent: typeof window === 'undefined' ? 'Server Context Execution' : 'Client Context Mismatch'
  });

  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return HvacAssetsPage({
    searchParams: Promise.resolve({
      ...resolvedSearchParams,
      view: resolveViewFromStatus(resolvedParams.status),
    }),
  });
}
