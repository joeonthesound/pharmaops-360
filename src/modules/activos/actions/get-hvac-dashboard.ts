'use server';

import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { supabase as publicSupabase } from '@/shared/lib/supabase';

type HvacDashboardViewRow = {
  uuid?: string | null;
  asset_uuid?: string | null;
  asset_code: string | null;
  asset_name: string | null;
  area: string | null;
  location_detail?: string | null;
  version: number | null;
  status: string | null;
  status_gxp: 'EVALUACIÓN' | 'APROBADO' | 'RECHAZADO' | string | null;
  next_maintenance_date?: string | null;
  internal_responsible?: string | null;
  total_orders: number | null;
  tecnico_pending_count: number | null;
  qa_prod_review_count: number | null;
  management_signoff_count?: number | null;
  gerencia_signoff_count?: number | null;
  rejected_count?: number | null;
  deviation_count?: number | null;
};

type HealthStatus = 'Healthy' | 'Attention' | 'Critical';
type MaintenanceStatusTone = 'green' | 'amber' | 'red' | 'slate';

type HvacDashboardAsset = {
  uuid: string;
  asset_code: string;
  asset_name: string;
  area: string | null;
  location_detail: string | null;
  version: number | null;
  status: string | null;
  status_gxp: 'EVALUACIÓN' | 'APROBADO' | 'RECHAZADO' | string | null;
  next_maintenance_date: string | null;
  internal_responsible: string | null;
  healthStatus: HealthStatus;
  latestMaintenanceStatus: string | null;
  latestMaintenanceDisplayLabel: string;
  latestMaintenanceTone: MaintenanceStatusTone;
  latestMaintenanceExecutedAt: string | null;
  latestMaintenanceScheduledDate: string | null;
  primaryFilterModel: string | null;
  deltaPStatus: HealthStatus;
  maintenanceCount: number;
  total_orders: number;
  pending_orders: number;
  rejected_orders: number;
  orders_in_execution: number;
  orders_in_review: number;
  orders_in_signoff: number;
  orders_rejected: number;
};

type HvacDashboardCounters = {
  total: number;
  healthy: number;
  attention: number;
  critical: number;
};

export type HvacDashboardPayload = {
  assets: HvacDashboardAsset[];
  counters: HvacDashboardCounters;
  healthScore: number;
  formulariosRespuestasTotal: number;
};

function normalizeCount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function resolveHealthStatus(status: string | null): HealthStatus {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();

  if (normalizedStatus.includes('operativo') || normalizedStatus.includes('aprobado')) {
    return 'Healthy';
  }

  if (normalizedStatus.includes('revision') || normalizedStatus.includes('mantenimiento')) {
    return 'Attention';
  }

  return 'Critical';
}

function mapViewRowToAsset(row: HvacDashboardViewRow): HvacDashboardAsset {
  const totalOrders = normalizeCount(row.total_orders);
  const tecnicoPendingCount = normalizeCount(row.tecnico_pending_count);
  const qaProdReviewCount = normalizeCount(row.qa_prod_review_count);
  const signoffCount = normalizeCount(row.management_signoff_count ?? row.gerencia_signoff_count);
  const rejectedCount = normalizeCount(row.rejected_count ?? row.deviation_count);
  const healthStatus = resolveHealthStatus(row.status);

  return {
    uuid: row.uuid ?? row.asset_uuid ?? row.asset_code ?? crypto.randomUUID(),
    asset_code: row.asset_code ?? 'ACTIVO-NO-DISPONIBLE',
    asset_name: row.asset_name ?? 'Activo HVAC sin nombre',
    area: row.area,
    location_detail: row.location_detail ?? null,
    version: row.version,
    status: row.status,
    status_gxp: row.status_gxp,
    next_maintenance_date: row.next_maintenance_date ?? null,
    internal_responsible: row.internal_responsible ?? null,
    healthStatus,
    latestMaintenanceStatus: null,
    latestMaintenanceDisplayLabel: 'Derivado de view_hvac_dashboard_cards',
    latestMaintenanceTone: totalOrders > 0 ? 'green' : 'slate',
    latestMaintenanceExecutedAt: null,
    latestMaintenanceScheduledDate: row.next_maintenance_date ?? null,
    primaryFilterModel: null,
    deltaPStatus: healthStatus,
    maintenanceCount: totalOrders,
    total_orders: totalOrders,
    pending_orders: tecnicoPendingCount,
    rejected_orders: rejectedCount,
    orders_in_execution: tecnicoPendingCount,
    orders_in_review: qaProdReviewCount,
    orders_in_signoff: signoffCount,
    orders_rejected: rejectedCount,
  };
}

function buildCounters(assets: HvacDashboardAsset[]): HvacDashboardCounters {
  return assets.reduce<HvacDashboardCounters>(
    (acc, asset) => {
      acc.total += 1;

      if (asset.healthStatus === 'Healthy') {
        acc.healthy += 1;
      }

      if (asset.healthStatus === 'Attention') {
        acc.attention += 1;
      }

      if (asset.healthStatus === 'Critical') {
        acc.critical += 1;
      }

      return acc;
    },
    {
      total: 0,
      healthy: 0,
      attention: 0,
      critical: 0,
    },
  );
}

export async function getHvacDashboard(): Promise<HvacDashboardPayload> {
  const supabase = await createSupabaseServerClient();
  const viewQuery = supabase
    .from('view_hvac_dashboard_cards')
    .select('*')
    .order('asset_code', { ascending: true });
  const { data, error } = await viewQuery;
  const fallbackResult =
    error || (data ?? []).length === 0
      ? await publicSupabase
          .from('view_hvac_dashboard_cards')
          .select('*')
          .order('asset_code', { ascending: true })
      : null;

  if (error && fallbackResult?.error) {
    throw new Error(
      `No se pudo consultar view_hvac_dashboard_cards: ${fallbackResult.error.message}`,
    );
  }

  const rows = ((fallbackResult?.data && fallbackResult.data.length > 0
    ? fallbackResult.data
    : data ?? []) ?? []) as HvacDashboardViewRow[];
  const assets = rows.map(mapViewRowToAsset);
  const counters = buildCounters(assets);
  const healthScore = counters.total > 0 ? (counters.healthy / counters.total) * 100 : 0;

  return {
    assets,
    counters,
    healthScore,
    formulariosRespuestasTotal: assets.reduce((acc, asset) => acc + asset.total_orders, 0),
  };
}
