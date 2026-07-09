'use server';

import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { supabase as publicSupabase } from '@/shared/lib/supabase';

type HvacAssetRow = {
  uuid: string;
  asset_code: string;
  asset_name: string;
  asset_type: string | null;
  area: string | null;
  site: string | null;
  brand: string | null;
  model: string | null;
  status: string | null;
  location_detail: string | null;
  installation_date: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  internal_responsible: string | null;
  version: number | null;
  status_gxp: 'EVALUACIÓN' | 'APROBADO' | 'RECHAZADO' | null;
};

type MantenimientoRegistroRow = {
  id: number;
  asset_code: string | null;
  status: string | null;
  scheduled_date: string | null;
  executed_at: string | null;
  supervisor_signed_at: string | null;
  supervisor_signed_by: string | null;
  quality_signed_at: string | null;
  quality_signed_by: string | null;
  management_signed_at: string | null;
  management_signed_by: string | null;
};

type FormularioRespuestaRow = {
  id?: number;
  mantenimiento_id: number | null;
  valor_texto: string | null;
  valor_seleccion: string | null;
  valor_numerico: number | null;
  formularios_campos:
    | {
        field_key: string | null;
        field_label: string | null;
      }
    | Array<{
        field_key: string | null;
        field_label: string | null;
      }>
    | null;
};

type HealthStatus = 'Healthy' | 'Attention' | 'Critical';
type MaintenanceStatusTone = 'green' | 'amber' | 'red' | 'slate';

type HvacDashboardAsset = HvacAssetRow & {
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

const HVAC_ACTIVOS_SELECT =
  'uuid, asset_code, asset_name, status, asset_type, area, site, brand, model, location_detail, installation_date, last_maintenance_date, next_maintenance_date, internal_responsible, version, status_gxp';

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

function getLatestMaintenanceDisplay(status: string | null | undefined): {
  label: string;
  tone: MaintenanceStatusTone;
} {
  const normalizedStatus = String(status ?? '').trim();

  if (normalizedStatus === 'approved') {
    return {
      label: 'Last Maintenance: Approved',
      tone: 'green',
    };
  }

  if (normalizedStatus === 'En revision') {
    return {
      label: 'En Revisión',
      tone: 'amber',
    };
  }

  if (!normalizedStatus) {
    return {
      label: 'Sin historial',
      tone: 'slate',
    };
  }

  return {
    label: normalizedStatus,
    tone: 'red',
  };
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

function isPendingMaintenanceStatus(status: string | null | undefined) {
  const normalizedStatus = String(status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  return (
    normalizedStatus.includes('pendiente') ||
    normalizedStatus.includes('revision') ||
    normalizedStatus.includes('programado') ||
    normalizedStatus.includes('scheduled')
  );
}

function isRejectedMaintenanceStatus(status: string | null | undefined) {
  const normalizedStatus = String(status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  return (
    normalizedStatus.includes('rechazado') ||
    normalizedStatus.includes('desviacion') ||
    normalizedStatus.includes('rejected')
  );
}

function isTerminalMaintenanceStatus(status: string | null | undefined) {
  const normalizedStatus = String(status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  return (
    normalizedStatus === 'approved' ||
    normalizedStatus === 'closed' ||
    normalizedStatus.includes('cerrado') ||
    normalizedStatus.includes('aprobado')
  );
}

function hasSupervisorSignature(row: MantenimientoRegistroRow) {
  return Boolean(row.supervisor_signed_at || row.supervisor_signed_by);
}

function hasQualitySignature(row: MantenimientoRegistroRow) {
  return Boolean(row.quality_signed_at || row.quality_signed_by);
}

function hasManagementSignature(row: MantenimientoRegistroRow) {
  return Boolean(row.management_signed_at || row.management_signed_by);
}

function isOrderInExecution(row: MantenimientoRegistroRow, rows: FormularioRespuestaRow[]) {
  return (
    !isRejectedMaintenanceStatus(row.status) &&
    !isTerminalMaintenanceStatus(row.status) &&
    !hasRequiredInstrumentation(rows)
  );
}

function isOrderInReview(row: MantenimientoRegistroRow, rows: FormularioRespuestaRow[]) {
  const hasInstrumentation = hasRequiredInstrumentation(rows);

  return (
    !isRejectedMaintenanceStatus(row.status) &&
    !isTerminalMaintenanceStatus(row.status) &&
    hasInstrumentation &&
    (!hasSupervisorSignature(row) || !hasQualitySignature(row))
  );
}

function isOrderInSignoff(row: MantenimientoRegistroRow, rows: FormularioRespuestaRow[]) {
  const hasInstrumentation = hasRequiredInstrumentation(rows);

  return (
    !isRejectedMaintenanceStatus(row.status) &&
    !isTerminalMaintenanceStatus(row.status) &&
    hasInstrumentation &&
    hasSupervisorSignature(row) &&
    hasQualitySignature(row) &&
    !hasManagementSignature(row)
  );
}

function groupRespuestasByMaintenanceId(rows: FormularioRespuestaRow[]) {
  return rows.reduce<Map<number, FormularioRespuestaRow[]>>((acc, row) => {
    if (typeof row.mantenimiento_id !== 'number') {
      return acc;
    }

    const currentRows = acc.get(row.mantenimiento_id) ?? [];
    acc.set(row.mantenimiento_id, [...currentRows, row]);

    return acc;
  }, new Map<number, FormularioRespuestaRow[]>());
}

function getFormularioCampo(row: FormularioRespuestaRow) {
  return Array.isArray(row.formularios_campos)
    ? row.formularios_campos[0]
    : row.formularios_campos;
}

function getRespuestaValue(row: FormularioRespuestaRow) {
  if (row.valor_texto) {
    return row.valor_texto;
  }

  if (row.valor_seleccion) {
    return row.valor_seleccion;
  }

  if (row.valor_numerico !== null) {
    return String(row.valor_numerico);
  }

  return null;
}

function normalizeSearchableText(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function hasRespuestaValue(row: FormularioRespuestaRow) {
  if (row.valor_numerico !== null) {
    return true;
  }

  if (typeof row.valor_texto === 'string' && row.valor_texto.trim()) {
    return true;
  }

  return typeof row.valor_seleccion === 'string' && row.valor_seleccion.trim().length > 0;
}

function hasInstrumentalParameter(rows: FormularioRespuestaRow[], patterns: string[]) {
  const normalizedPatterns = patterns.map((pattern) => normalizeSearchableText(pattern));

  return rows.some((row) => {
    const fieldMeta = getFormularioCampo(row);
    const searchableText = normalizeSearchableText(
      `${fieldMeta?.field_key ?? ''} ${fieldMeta?.field_label ?? ''}`,
    );

    return (
      normalizedPatterns.some((pattern) => searchableText.includes(pattern)) &&
      hasRespuestaValue(row)
    );
  });
}

function hasRequiredInstrumentation(rows: FormularioRespuestaRow[]) {
  return (
    hasInstrumentalParameter(rows, ['temperatura', 'temperature', 'temp']) &&
    hasInstrumentalParameter(rows, [
      'presion diferencial',
      'presion',
      'pressure',
      'diferencial',
      'succion',
    ]) &&
    hasInstrumentalParameter(rows, ['humedad', 'humidity', 'relative humidity', 'rh'])
  );
}

function findRespuestaValue(rows: FormularioRespuestaRow[], patterns: string[]) {
  const normalizedPatterns = patterns.map((pattern) => normalizeSearchableText(pattern));

  for (const row of rows) {
    const fieldMeta = getFormularioCampo(row);
    const searchableText = normalizeSearchableText(
      `${fieldMeta?.field_key ?? ''} ${fieldMeta?.field_label ?? ''}`,
    );

    if (normalizedPatterns.some((pattern) => searchableText.includes(pattern))) {
      const value = getRespuestaValue(row);

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function getDeltaPStatus(value: string | null, fallback: HealthStatus): HealthStatus {
  const normalizedValue = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (normalizedValue.includes('normal') || normalizedValue.includes('approved')) {
    return 'Healthy';
  }

  if (
    normalizedValue.includes('attention') ||
    normalizedValue.includes('atencion') ||
    normalizedValue.includes('revision')
  ) {
    return 'Attention';
  }

  if (normalizedValue.includes('critical') || normalizedValue.includes('critico')) {
    return 'Critical';
  }

  return fallback;
}

export async function getHvacDashboard(): Promise<HvacDashboardPayload> {
  const supabase = await createSupabaseServerClient();

  const [activosResult, mantenimientosResult, respuestasResult] = await Promise.all([
    supabase
      .from('activos')
      .select(HVAC_ACTIVOS_SELECT, { count: 'exact' })
      .ilike('asset_type', '%hvac%')
      .order('asset_code', { ascending: true })
      .range(0, 8),
    supabase
      .from('mantenimientos_registros')
      .select(
        'id, asset_code, status, scheduled_date, executed_at, supervisor_signed_at, supervisor_signed_by, quality_signed_at, quality_signed_by, management_signed_at, management_signed_by',
      ),
    supabase
      .from('formularios_respuestas')
      .select(
        'id, mantenimiento_id, valor_texto, valor_seleccion, valor_numerico, formularios_campos!formularios_respuestas_campo_id_fkey(field_key, field_label)',
      ),
  ]);

  if (activosResult.error) {
    throw new Error(`No se pudieron consultar los activos HVAC: ${activosResult.error.message}`);
  }

  const publicActivosResult =
    (activosResult.data ?? []).length === 0
      ? await publicSupabase
          .from('activos')
          .select(HVAC_ACTIVOS_SELECT, { count: 'exact' })
          .ilike('asset_type', '%hvac%')
          .order('asset_code', { ascending: true })
          .range(0, 8)
      : null;

  if (publicActivosResult?.error) {
    console.error('[HVAC DASHBOARD] Fallback publico de activos fallo', {
      code: publicActivosResult.error.code,
      message: publicActivosResult.error.message,
      hint: publicActivosResult.error.hint,
    });
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

  const activosData = (
    publicActivosResult?.data && publicActivosResult.data.length > 0
      ? publicActivosResult.data
      : activosResult.data ?? []
  ) as HvacAssetRow[];
  const mantenimientosData = (mantenimientosResult.data ?? []) as MantenimientoRegistroRow[];
  const formulariosRespuestasData = (respuestasResult.data ?? []) as FormularioRespuestaRow[];
  const mantenimientosByAssetCode = groupMantenimientosByAssetCode(mantenimientosData);
  const respuestasByMaintenanceId = groupRespuestasByMaintenanceId(formulariosRespuestasData);

  const assets = activosData.map((asset) => {
    const assetMantenimientos = mantenimientosByAssetCode.get(asset.asset_code) ?? [];
    const latestMaintenance = getLatestMaintenance(assetMantenimientos);
    const healthStatus = getHealthStatus(latestMaintenance?.status);
    const latestMaintenanceDisplay = getLatestMaintenanceDisplay(latestMaintenance?.status);
    const latestResponses = latestMaintenance
      ? respuestasByMaintenanceId.get(latestMaintenance.id) ?? []
      : [];
    const assetModelLabel = [asset.brand, asset.model].filter(Boolean).join(' ').trim();
    const primaryFilterModel =
      findRespuestaValue(latestResponses, ['filter', 'filtro', 'hepa']) ||
      assetModelLabel ||
      null;
    const deltaPValue = findRespuestaValue(latestResponses, [
      'delta p',
      'deltap',
      'presion diferencial',
      'diferencial',
    ]);
    const getMaintenanceResponses = (row: MantenimientoRegistroRow) =>
      respuestasByMaintenanceId.get(row.id) ?? [];

    return {
      ...asset,
      healthStatus,
      latestMaintenanceStatus: latestMaintenance?.status ?? null,
      latestMaintenanceDisplayLabel: latestMaintenanceDisplay.label,
      latestMaintenanceTone: latestMaintenanceDisplay.tone,
      latestMaintenanceExecutedAt: latestMaintenance?.executed_at ?? null,
      latestMaintenanceScheduledDate: latestMaintenance?.scheduled_date ?? null,
      primaryFilterModel,
      deltaPStatus: getDeltaPStatus(deltaPValue, healthStatus),
      maintenanceCount: assetMantenimientos.length,
      total_orders: assetMantenimientos.length,
      pending_orders: assetMantenimientos.filter((row) => isPendingMaintenanceStatus(row.status))
        .length,
      rejected_orders: assetMantenimientos.filter((row) => isRejectedMaintenanceStatus(row.status))
        .length,
      orders_in_execution: assetMantenimientos.filter((row) =>
        isOrderInExecution(row, getMaintenanceResponses(row)),
      ).length,
      orders_in_review: assetMantenimientos.filter((row) =>
        isOrderInReview(row, getMaintenanceResponses(row)),
      ).length,
      orders_in_signoff: assetMantenimientos.filter((row) =>
        isOrderInSignoff(row, getMaintenanceResponses(row)),
      ).length,
      orders_rejected: assetMantenimientos.filter((row) => isRejectedMaintenanceStatus(row.status))
        .length,
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
    if (activosData.length === 0) {
      console.log("[DATA RECOVERY ALERT]: Query returned 0 assets. Check table strings or missing authenticated SELECT policies.");
    }
    console.log("=====================================================");
  }

  return {
    assets,
    counters,
    healthScore,
    formulariosRespuestasTotal: formulariosRespuestasData.length,
  };
}
