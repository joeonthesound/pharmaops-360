import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import HvacAssetsPage from '@/modules/mantenimiento/components/hvac-assets-grid/page';

const ENABLE_SUPERADMIN_DEBUG_LOGS: false | 'verbose' = false;

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
  const { data: rawDumpAll, error: dumpError } = await supabase
    .from('mantenimientos_registros')
    .select('uuid, record_code, status, asset_code');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const userEmail = user?.email?.trim().toLowerCase() ?? '';
  const { data: userProfile } = userEmail
    ? await supabase
        .from('usuarios_roles')
        .select('role')
        .eq('user_email', userEmail)
        .eq('active', true)
        .maybeSingle()
    : { data: null };

  if (
    ENABLE_SUPERADMIN_DEBUG_LOGS === 'verbose' &&
    String((userProfile as { role?: string | null } | null)?.role ?? '').trim().toLowerCase() ===
      'administrativo'
  ) {
    console.log('🚨🚨🚨 [AUDITORIA TOTAL DE RUI UUIDS INCONDICIONAL] 🚨🚨🚨');
    console.log(`Total crudo detectado en base de datos: ${rawDumpAll?.length || 0}`);
    console.log('Registros:', rawDumpAll?.map((record) => ({
      uuid: record.uuid,
      code: record.record_code || 'SIN_CODIGO',
      status: record.status,
      asset: record.asset_code,
    })));
    if (dumpError) {
      console.error('Error en volcado:', dumpError);
    }
    console.log('==========================================================');
  }

  if (ENABLE_SUPERADMIN_DEBUG_LOGS === 'verbose') {
    console.log('[TELEMETRIA FORENSE F5]', {
      hasUser: !!user,
      userEmail: user?.email,
      authError: authError?.message || null,
      cookiesPresent: typeof window === 'undefined' ? 'Server Context Execution' : 'Client Context Mismatch'
    });
  }

  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return HvacAssetsPage({
    searchParams: Promise.resolve({
      ...resolvedSearchParams,
      view: resolveViewFromStatus(resolvedParams.status),
    }),
  });
}
