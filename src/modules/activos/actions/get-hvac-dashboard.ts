'use server';

import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

type HvacAssetRow = {
  uuid: string;
  asset_code: string;
  asset_name: string;
  status: string | null;
  location_detail: string | null;
};

type MantenimientoRegistroRow = {
  id: number;
  asset_code: string | null;
  status: string | null;
  scheduled_date: string | null;
  executed_at: string | null;
};

type FormularioRespuestaRow = {
  id?: number;
  mantenimiento_id: number | null;
};

type HealthStatus = 'Healthy' | 'Attention' | 'Critical';

type HvacDashboardAsset = HvacAssetRow & {
  healthStatus: HealthStatus;
  latestMaintenanceStatus: string | null;
  maintenanceCount: number;
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

function getMaintenanceSortValue(row: MantenimientoRegistroRow) {
  const candidateDate = row.executed_at ?? row.scheduled_date;

  if (!candidateDate) {
    return 0;
  }

  const timestamp = new Date(candidateDate).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getHealthStatus(status: string | null | undefined): HealthStatus {
  const normalizedStatus = String(status ?? '').trim();

  if (normalizedStatus === 'approved') {
    return 'Healthy';
  }

  if (normalizedStatus === 'En revision') {
    return 'Attention';
  }

  return 'Critical';
}

function groupMantenimientosByAssetCode(rows: MantenimientoRegistroRow[]) {
  return rows.reduce<Map<string, MantenimientoRegistroRow[]>>((acc, row) => {
    const assetCode = String(row.asset_code ?? '').trim();

    if (!assetCode) {
      return acc;
    }

    const currentRows = acc.get(assetCode) ?? [];
    acc.set(assetCode, [...currentRows, row]);

    return acc;
  }, new Map<string, MantenimientoRegistroRow[]>());
}

function getLatestMaintenance(rows: MantenimientoRegistroRow[]) {
  return [...rows].sort((left, right) => {
    const sortByDate = getMaintenanceSortValue(right) - getMaintenanceSortValue(left);

    if (sortByDate !== 0) {
      return sortByDate;
    }

    return right.id - left.id;
  })[0];
}

export async function getHvacDashboard(): Promise<HvacDashboardPayload> {
  const supabase = await createSupabaseServerClient();

  const [activosResult, mantenimientosResult, respuestasResult] = await Promise.all([
    supabase
      .from('activos')
      .select('uuid, asset_code, asset_name, status, location_detail')
      .eq('area', 'hvac')
      .order('asset_code', { ascending: true }),
    supabase
      .from('mantenimientos_registros')
      .select('id, asset_code, status, scheduled_date, executed_at'),
    supabase.from('formularios_respuestas').select('id, mantenimiento_id'),
  ]);

  if (activosResult.error) {
    throw new Error(`No se pudieron consultar los activos HVAC: ${activosResult.error.message}`);
  }

  if (mantenimientosResult.error) {
    throw new Error(
      `No se pudieron consultar los mantenimientos: ${mantenimientosResult.error.message}`,
    );
  }

  if (respuestasResult.error) {
    throw new Error(
      `No se pudieron consultar formularios_respuestas: ${respuestasResult.error.message}`,
    );
  }

  const activosData = (activosResult.data ?? []) as HvacAssetRow[];
  const mantenimientosData = (mantenimientosResult.data ?? []) as MantenimientoRegistroRow[];
  const formulariosRespuestasData = (respuestasResult.data ?? []) as FormularioRespuestaRow[];
  const mantenimientosByAssetCode = groupMantenimientosByAssetCode(mantenimientosData);

  const assets = activosData.map((asset) => {
    const assetMantenimientos = mantenimientosByAssetCode.get(asset.asset_code) ?? [];
    const latestMaintenance = getLatestMaintenance(assetMantenimientos);
    const healthStatus = getHealthStatus(latestMaintenance?.status);

    return {
      ...asset,
      healthStatus,
      latestMaintenanceStatus: latestMaintenance?.status ?? null,
      maintenanceCount: assetMantenimientos.length,
    };
  });

  const counters = assets.reduce<HvacDashboardCounters>(
    (acc, asset) => {
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
      total: assets.length,
      healthy: 0,
      attention: 0,
      critical: 0,
    },
  );

  const healthScore = counters.total > 0 ? (counters.healthy / counters.total) * 100 : 0;

  if (process.env.NEXT_PUBLIC_SUPERADMIN_DEBUG === "true") {
    console.log("=== [MONITOREO OPERACIÓN HVAC - OPCIÓN A EN VIVO] ===");
    console.log(`Activos HVAC Mapeados: ${activosData.length}`);
    console.log("=====================================================");
  }

  return {
    assets,
    counters,
    healthScore,
    formulariosRespuestasTotal: formulariosRespuestasData.length,
  };
}
