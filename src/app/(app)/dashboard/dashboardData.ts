import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import type { DashboardOrder, MaintenanceStatus } from './dashboardTypes';

const TECHNICAL_HISTORY_STATUSES = [
  'APPROVED',
  'PENDING_MANAGEMENT',
] as const satisfies readonly MaintenanceStatus[];
type DashboardQueryResult =
  | { data: DashboardOrder[]; error: null }
  | { data: []; error: string };

type TechnicalHistoryQueryResult =
  | { data: DashboardOrder[]; error: null; currentTechId: string | null }
  | { data: []; error: string; currentTechId: string | null };

type DashboardSecurityContext =
  | {
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
      currentTechId: string;
      userEmail: string;
      isGlobalDashboardUser: boolean;
      error: null;
    }
  | {
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
      currentTechId: string | null;
      userEmail: string | null;
      isGlobalDashboardUser: false;
      error: string;
    };

function isGlobalDashboardRole(role: string | null | undefined) {
  const normalizedRole = String(role ?? '').trim().toLowerCase();

  return (
    normalizedRole === 'superadmin' ||
    normalizedRole === 'administrativo' ||
    normalizedRole === 'administrador' ||
    normalizedRole === 'gerencia' ||
    normalizedRole === 'propietario / gerencia' ||
    normalizedRole === 'gerente general'
  );
}

function isGlobalDashboardEmail(email: string | null | undefined) {
  return String(email ?? '').trim().toLowerCase() === 'gerencia@exagonlabs.com';
}

async function resolveDashboardSecurityContext(): Promise<DashboardSecurityContext> {
  const supabaseServer = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser();
  const currentTechId = user?.id ?? null;
  const userEmail = user?.email?.trim().toLowerCase() ?? null;

  if (userError || !currentTechId || !userEmail) {
    return {
      supabase: supabaseServer,
      currentTechId,
      userEmail,
      isGlobalDashboardUser: false,
      error: userError?.message ?? 'Sesion tecnica no disponible.',
    };
  }

  const { data: usuario } = await supabaseServer
    .from('usuarios_roles')
    .select('role')
    .eq('user_email', userEmail)
    .eq('active', true)
    .maybeSingle();

  return {
    supabase: supabaseServer,
    currentTechId,
    userEmail,
    isGlobalDashboardUser:
      isGlobalDashboardEmail(userEmail) ||
      isGlobalDashboardRole((usuario as { role?: string | null } | null)?.role),
    error: null,
  };
}

async function attachAssetsToOrders(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  orders: DashboardOrder[],
) {
  const assetCodes = Array.from(
    new Set(
      orders
        .map((order) => String(order.asset_code ?? '').trim())
        .filter((assetCode) => assetCode.length > 0),
    ),
  );

  if (assetCodes.length === 0) {
    return orders.map((order) => ({ ...order, activos: null }));
  }

  const { data: activosData, error: activosError } = await supabase
    .from('activos')
    .select('*')
    .in('asset_code', assetCodes);

  if (activosError) {
    console.log('[DEBUG RLS ISOLATION] Asset lookup failed during split fetch:', {
      code: activosError.code,
      message: activosError.message,
    });

    return orders.map((order) => ({ ...order, activos: null }));
  }

  console.log('[DEBUG RLS ISOLATION] Asset rows resolved after split fetch:', activosData?.length || 0);

  const activosByCode = new Map(
    (activosData ?? []).map((activo) => [String(activo.asset_code ?? ''), activo]),
  );

  return orders.map((order) => ({
    ...order,
    activos: activosByCode.get(String(order.asset_code ?? '')) ?? null,
  })) as DashboardOrder[];
}

export async function fetchDashboardOrdersByStatuses(
  statuses: readonly MaintenanceStatus[],
  options: { openOnly?: boolean } = {},
): Promise<DashboardQueryResult> {
  try {
    const securityContext = await resolveDashboardSecurityContext();

    if (securityContext.error) {
      return { data: [], error: securityContext.error };
    }

    let registrosQuery = securityContext.supabase
      .from('mantenimientos_registros')
      .select('*')
      .in('status', [...statuses])
      .order('executed_at', { ascending: false });

    if (options.openOnly) {
      registrosQuery = registrosQuery.is('quality_signed_at', null);
    }

    if (!securityContext.isGlobalDashboardUser) {
      registrosQuery = registrosQuery.ilike(
        'assigned_technician',
        securityContext.userEmail ?? '',
      );
    }

    const { data: rawOrders } = await securityContext.supabase
      .from('mantenimientos_registros')
      .select('id, status, asset_code');
    console.log('[DEBUG RLS ISOLATION] Raw orders without asset join:', rawOrders?.length || 0);
    console.log('[DEBUG HISTORIAL STATUS MAP]', {
      statuses: Array.from(new Set((rawOrders ?? []).map((order) => order.status))),
    });

    const { data, error } = await registrosQuery;

    if (error) {
      return { data: [], error: error.message };
    }

    const orders = (data ?? []).map((order) => ({ ...order, activos: null })) as DashboardOrder[];
    const ordersWithAssets = await attachAssetsToOrders(securityContext.supabase, orders);

    return { data: ordersWithAssets, error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Error inesperado',
    };
  }
}

export async function fetchTechnicalHistoryOrders(): Promise<TechnicalHistoryQueryResult> {
  try {
    const securityContext = await resolveDashboardSecurityContext();

    if (securityContext.error) {
      return {
        data: [],
        error: securityContext.error,
        currentTechId: securityContext.currentTechId,
      };
    }

    let registrosQuery = securityContext.supabase
      .from('mantenimientos_registros')
      .select('*')
      .order('executed_at', { ascending: false });

    if (!securityContext.isGlobalDashboardUser) {
      registrosQuery = registrosQuery.ilike(
        'assigned_technician',
        securityContext.userEmail ?? '',
      );
    }

    const { data: rawOrders } = await securityContext.supabase
      .from('mantenimientos_registros')
      .select('id, status, asset_code');
    console.log('[DEBUG RLS ISOLATION] Raw orders without asset join:', rawOrders?.length || 0);

    const { data, error } = await registrosQuery;

    if (error) {
      return { data: [], error: error.message, currentTechId: securityContext.currentTechId };
    }

    const orders = (data ?? []).map((order) => ({
      ...order,
      activos: null,
    })) as DashboardOrder[];
    const ordersWithAssets = await attachAssetsToOrders(securityContext.supabase, orders);

    return {
      data: ordersWithAssets,
      error: null,
      currentTechId: securityContext.currentTechId,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : 'Error inesperado',
      currentTechId: null,
    };
  }
}
