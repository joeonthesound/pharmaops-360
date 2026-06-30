import Link from 'next/link';
import { supabase } from '@/shared/lib/supabase';
import type { Activo, ActivoEstado } from '@/modules/activos/activos.interface';

export const runtime = 'edge';

type DashboardPageProps = {
  searchParams?: Promise<{
    asset?: string;
    aging?: string;
    deviations?: string;
    q?: string;
    risk?: string;
    view?: string;
  }>;
};

type DashboardView = 'pending' | 'sent' | 'rejected' | 'history';

type ActivoConUuid = Activo & {
  uuid: string;
};

type MaintenanceStatus =
  | 'draft'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'rejected'
  | 'approved'
  | 'Draft'
  | 'Pending_Supervisor'
  | 'Pending_Quality'
  | 'Rejected'
  | 'Approved'
  | 'Completed'
  | 'Borrador'
  | 'Pendiente_Supervisor'
  | 'Pendiente_Calidad'
  | 'Rechazado'
  | 'Aprobado'
  | 'Cerrado';

type MantenimientoRegistro = {
  uuid: string;
  asset_code: string | null;
  status: MaintenanceStatus;
  executed_at: string | null;
  scheduled_date: string | null;
  quality_signed_at: string | null;
  rejection_comments?: string | null;
};

type DashboardOrder = MantenimientoRegistro & {
  activos: ActivoConUuid | ActivoConUuid[] | null;
};

const estadoClasses: Record<ActivoEstado, string> = {
  Operativo: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'En mantenimiento': 'border-amber-200 bg-amber-50 text-amber-800',
  'Fuera de servicio': 'border-red-200 bg-red-50 text-red-800',
};

const orderStatusClasses: Record<MantenimientoRegistro['status'], string> = {
  draft: 'border-slate-200 bg-slate-100 text-slate-700',
  pending_supervisor: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_quality: 'border-sky-200 bg-sky-50 text-sky-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Draft: 'border-slate-200 bg-slate-100 text-slate-700',
  Pending_Supervisor: 'border-amber-200 bg-amber-50 text-amber-800',
  Pending_Quality: 'border-sky-200 bg-sky-50 text-sky-800',
  Rejected: 'border-red-200 bg-red-50 text-red-800',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Borrador: 'border-slate-200 bg-slate-100 text-slate-700',
  Pendiente_Supervisor: 'border-amber-200 bg-amber-50 text-amber-800',
  Pendiente_Calidad: 'border-sky-200 bg-sky-50 text-sky-800',
  Rechazado: 'border-red-200 bg-red-50 text-red-800',
  Aprobado: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cerrado: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const orderStatusLabel: Record<MantenimientoRegistro['status'], string> = {
  draft: 'Borrador',
  pending_supervisor: 'Pendiente Supervisor',
  pending_quality: 'Pendiente Calidad',
  rejected: 'Rechazado',
  approved: 'Aprobado',
  Draft: 'Borrador',
  Pending_Supervisor: 'Pendiente Supervisor',
  Pending_Quality: 'Pendiente Calidad',
  Rejected: 'Rechazado',
  Approved: 'Aprobado',
  Completed: 'Completado',
  Borrador: 'Borrador',
  Pendiente_Supervisor: 'Pendiente Supervisor',
  Pendiente_Calidad: 'Pendiente Calidad',
  Rechazado: 'Rechazado',
  Aprobado: 'Aprobado',
  Cerrado: 'Cerrado',
};

const tabs: Array<{ label: string; value: DashboardView }> = [
  { label: 'Activos / Ordenes Pendientes', value: 'pending' },
  { label: 'Activos / Ordenes Enviados', value: 'sent' },
  { label: 'Activos / Ordenes Rechazados', value: 'rejected' },
  { label: 'Historial Tecnico', value: 'history' },
];

const SENT_STATUSES: Array<MantenimientoRegistro['status']> = [
  'pending_supervisor',
  'pending_quality',
  'Pending_Supervisor',
  'Pending_Quality',
  'Pendiente_Supervisor',
  'Pendiente_Calidad',
];
const PENDING_STATUSES: Array<MantenimientoRegistro['status']> = [
  'draft',
  'Draft',
  'Borrador',
];
const REJECTED_STATUSES: Array<MantenimientoRegistro['status']> = [
  'rejected',
  'Rejected',
  'Rechazado',
];
const ACTIVE_WORKFLOW_STATUSES: Array<MantenimientoRegistro['status']> = [
  ...PENDING_STATUSES,
  ...REJECTED_STATUSES,
  ...SENT_STATUSES,
];
const CLOSED_WORKFLOW_STATUSES: Array<MantenimientoRegistro['status']> = [
  'approved',
  'Approved',
  'Aprobado',
  'Completed',
  'Cerrado',
];
const CLOSED_STATUS_FILTER = `(${CLOSED_WORKFLOW_STATUSES.map((status) => `"${status}"`).join(',')})`;

function formatLocation(activo: Activo | null | undefined) {
  if (!activo) {
    return 'Ubicacion no disponible';
  }

  return [activo.location_detail, activo.area].filter(Boolean).join(' / ') || activo.area;
}

function normalizeAssetCode(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeView(value: string | undefined): DashboardView {
  if (value === 'sent' || value === 'rejected' || value === 'history') {
    return value;
  }

  return 'pending';
}

function calculateDaysRemaining(targetDate: string | null | undefined) {
  if (!targetDate) {
    return null;
  }

  const target = new Date(`${targetDate}T00:00:00`);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.ceil((target.getTime() - todayStart.getTime()) / millisecondsPerDay);
}

function resolveRelatedAsset(registro: DashboardOrder) {
  if (Array.isArray(registro.activos)) {
    return registro.activos[0];
  }

  return registro.activos ?? undefined;
}

function getOrderHref(registro: MantenimientoRegistro, activo?: ActivoConUuid) {
  if (registro.status !== 'draft') {
    return `/mantenimiento/${registro.uuid}`;
  }

  if (activo?.uuid) {
    return `/mantenimiento/${activo.uuid}`;
  }

  return '/dashboard';
}

function getOrderActionLabel(status: MantenimientoRegistro['status']) {
  if (PENDING_STATUSES.includes(status)) {
    return 'Continuar Inspeccion';
  }

  if (SENT_STATUSES.includes(status)) {
    return 'Consultar';
  }

  if (REJECTED_STATUSES.includes(status)) {
    return 'Consultar';
  }

  if (status === 'approved') {
    return 'Ver Reporte';
  }

  return 'Revisar y Firmar';
}

function isClosedWorkflowRecord(registro: MantenimientoRegistro) {
  return (
    CLOSED_WORKFLOW_STATUSES.includes(registro.status) ||
    Boolean(registro.quality_signed_at)
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentView = normalizeView(resolvedSearchParams.view);
  const historySearchTerm = String(resolvedSearchParams.q ?? '');
  const selectedHistoryAsset = String(resolvedSearchParams.asset ?? '');
  const showOnlyDeviations = resolvedSearchParams.deviations === 'true';
  const showAgingSignatures = resolvedSearchParams.aging === '72h';
  const selectedRiskLevel = resolvedSearchParams.risk === 'high' ? 'high' : 'all';
  let dashboardOrders: DashboardOrder[] = [];
  let queryError: { code?: string; message?: string } | null = null;
  const effectiveExcludedStatuses =
    currentView === 'history' ? [] : CLOSED_WORKFLOW_STATUSES;

  console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 1 [Llamada a Ordenes Activas]', {
    table: 'mantenimientos_registros',
    select: '*, activos(*)',
    status: currentView === 'history' ? ['approved'] : ACTIVE_WORKFLOW_STATUSES,
    excludedStatus: effectiveExcludedStatuses,
    view: currentView,
  });

  try {
    let registrosQuery = supabase
      .from('mantenimientos_registros')
      .select('*, activos!fk_mantenimientos_registros_activos(*)')
      .order('executed_at', { ascending: false });

    registrosQuery =
      currentView === 'history'
        ? registrosQuery.eq('status', 'approved')
        : registrosQuery
            .in('status', ACTIVE_WORKFLOW_STATUSES)
            .not('status', 'in', CLOSED_STATUS_FILTER)
            .is('quality_signed_at', null);

    const { data: registrosData, error: registrosError } = await registrosQuery;

    if (registrosError) {
      queryError = {
        code: registrosError.code,
        message: registrosError.message,
      };

      console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 3 [Ordenes por Estado]', {
        result: 'supabase_error',
        error: {
          code: registrosError.code,
          message: registrosError.message,
        },
      });
    } else {
      dashboardOrders =
        currentView === 'history'
          ? ((registrosData ?? []) as DashboardOrder[])
          : ((registrosData ?? []) as DashboardOrder[]).filter(
              (registro) => !isClosedWorkflowRecord(registro),
            );
    }

    console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 2 [Resultado / Respuesta del Servidor]', {
      result: queryError ? 'supabase_error' : 'supabase_success',
      selectClause: queryError ? null : '*, activos!fk_mantenimientos_registros_activos(*)',
      orderRecords: dashboardOrders.length,
      assetCodes: dashboardOrders.map((orden) => orden.asset_code),
      joinedAssetCodes: dashboardOrders.map((orden) => resolveRelatedAsset(orden)?.asset_code ?? null),
      orderStatusMap: dashboardOrders.map((registro) => ({
        uuid: registro.uuid,
        asset_code: registro.asset_code,
        status: registro.status,
      })),
      appliedHistoryFilters: {
        q: historySearchTerm,
        asset: selectedHistoryAsset,
        deviations: showOnlyDeviations,
        aging: showAgingSignatures,
        risk: selectedRiskLevel,
      },
    });
  } catch (error) {
    queryError = {
      message: error instanceof Error ? error.message : 'Error inesperado',
    };

    console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 2 [Resultado / Respuesta del Servidor]', {
      result: 'exception',
      error: queryError,
    });
  }

  const pendingOrders = dashboardOrders.filter((registro) =>
    PENDING_STATUSES.includes(registro.status),
  );
  const sentOrders = dashboardOrders.filter((registro) =>
    SENT_STATUSES.includes(registro.status),
  );
  const rejectedOrders = dashboardOrders.filter(
    (registro) => REJECTED_STATUSES.includes(registro.status),
  );
  const historyOrders =
    currentView === 'history'
      ? dashboardOrders
      : dashboardOrders.filter((registro) => registro.status === 'approved');
  const normalizedHistorySearchTerm = historySearchTerm.trim().toLowerCase();
  const filteredHistoryOrders = historyOrders.filter((registro) => {
    const activo = resolveRelatedAsset(registro);
    const matchesSearch =
      !normalizedHistorySearchTerm ||
      registro.uuid.toLowerCase() === normalizedHistorySearchTerm ||
      String(registro.uuid).toLowerCase().includes(normalizedHistorySearchTerm) ||
      String(registro.asset_code ?? '').toLowerCase().includes(normalizedHistorySearchTerm) ||
      String(activo?.asset_code ?? '').toLowerCase().includes(normalizedHistorySearchTerm);
    const matchesAsset =
      !selectedHistoryAsset ||
      (activo?.asset_code ?? registro.asset_code ?? '') === selectedHistoryAsset;

    return matchesSearch && matchesAsset;
  });
  const visibleOrders =
    currentView === 'pending'
      ? pendingOrders
      : currentView === 'sent'
        ? sentOrders
        : currentView === 'history'
          ? filteredHistoryOrders
        : rejectedOrders;
  const historyAssetOptions = Array.from(
    new Set(
      historyOrders
        .map((registro) => resolveRelatedAsset(registro)?.asset_code ?? registro.asset_code)
        .filter((assetCode): assetCode is string => Boolean(assetCode)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Piloto HVAC
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Activos</h1>
            <p className="mt-1 text-sm text-slate-600">
              Flota registrada para mantenimiento preventivo e inspeccion tecnica.
            </p>
          </div>
          <button
            aria-label="Escanear codigo QR"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xl shadow-sm"
            type="button"
          >
            QR
          </button>
        </header>

        <nav className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-3">
          {tabs.map((tab) => {
            const isActive = currentView === tab.value;

            return (
              <Link
                className={`flex min-h-11 items-center justify-center rounded-md px-3 text-center text-sm font-semibold transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
                href={`/dashboard?view=${tab.value}`}
                key={tab.value}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {queryError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            No fue posible cargar los activos HVAC desde Supabase.
          </div>
        ) : null}

        {!queryError && currentView === 'history' ? (
          <section
            aria-label="Filtros de historial tecnico"
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm"
          >
            <form className="grid gap-4" method="get">
              <input name="view" type="hidden" value="history" />
              <div className="grid gap-3 md:grid-cols-[1fr_190px_190px_auto]">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                  <span>{`C\u00f3digo de Reporte / UUID`}</span>
                  <input
                    className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    defaultValue={historySearchTerm}
                    name="q"
                    placeholder={`Buscar por C\u00f3digo de Reporte o UUID`}
                    type="search"
                  />
                </label>

                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                  <span>Filtrar por Activo</span>
                  <select
                    className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    defaultValue={selectedHistoryAsset}
                    name="asset"
                  >
                    <option value="">Todos los activos</option>
                    {historyAssetOptions.map((assetCode) => (
                      <option key={assetCode} value={assetCode}>
                        {assetCode}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                  <span>Riesgo</span>
                  <select
                    className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    defaultValue={selectedRiskLevel}
                    name="risk"
                  >
                    <option value="all">Todos</option>
                    <option value="high">Alta Criticidad</option>
                  </select>
                </label>

                <button
                  className="flex h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 md:self-end"
                  type="submit"
                >
                  Aplicar
                </button>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <label
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${
                      showOnlyDeviations
                        ? 'border-transparent bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      className="sr-only"
                      defaultChecked={showOnlyDeviations}
                      name="deviations"
                      type="checkbox"
                      value="true"
                    />
                    <span aria-hidden="true">{`\u26a0\ufe0f`}</span>
                    <span>Ver solo Desviaciones (Fuera de Rango)</span>
                  </label>

                  <label
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${
                      showAgingSignatures
                        ? 'border-transparent bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      className="sr-only"
                      defaultChecked={showAgingSignatures}
                      name="aging"
                      type="checkbox"
                      value="72h"
                    />
                    <span aria-hidden="true">{`\u23f3`}</span>
                    <span>Firmas Pendientes &gt; 72h</span>
                  </label>
                </div>
              </div>
            </form>
          </section>
        ) : null}

        {!queryError && visibleOrders.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
            No hay ordenes en esta pestana segun el estado transaccional actual.
          </div>
        ) : null}

        {!queryError && currentView === 'history' && visibleOrders.length > 0 ? (
          <section aria-label="Historial tecnico aprobado" className="grid gap-3">
            {visibleOrders.map((registro) => {
              const activo = resolveRelatedAsset(registro);
              const displayAssetCode =
                activo?.asset_code ?? registro.asset_code ?? 'Activo no disponible';
              const displayAssetName = activo?.asset_name ?? 'Orden de mantenimiento aprobada';
              const displayLocation = formatLocation(activo);
              const actionHref = getOrderHref(registro, activo);

              return (
                <article
                  className="grid gap-3 rounded-lg border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm md:grid-cols-[1.1fr_1fr_auto] md:items-center"
                  key={registro.uuid}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold tracking-normal text-slate-950">
                        {displayAssetCode}
                      </p>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${orderStatusClasses[registro.status]}`}
                      >
                        {orderStatusLabel[registro.status]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                      {displayAssetName}
                    </p>
                    <p className="mt-1 truncate text-xs font-medium text-slate-500">
                      UUID: {registro.uuid}
                    </p>
                  </div>

                  <div className="grid gap-1 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{displayLocation}</span>
                    <span className="text-xs font-medium text-slate-500">
                      Fecha de ejecucion: {registro.executed_at ?? 'No registrada'}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Firma Calidad: {registro.quality_signed_at ?? 'No registrada'}
                    </span>
                  </div>

                  <Link
                    className="flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    href={actionHref}
                  >
                    Ver Reporte Inmutable
                  </Link>
                </article>
              );
            })}
          </section>
        ) : null}

        {!queryError && currentView !== 'history' ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleOrders.map((registro) => {
              const activo = resolveRelatedAsset(registro);
              const displayAssetCode =
                activo?.asset_code ?? registro.asset_code ?? 'Activo no disponible';
              const displayAssetName = activo?.asset_name ?? 'Orden de mantenimiento';
              const displayLocation = formatLocation(activo);
              const daysRemaining = calculateDaysRemaining(
                registro.scheduled_date ?? activo?.next_maintenance_date,
              );
              const isRejected = REJECTED_STATUSES.includes(registro.status);
              const actionHref = getOrderHref(registro, activo);

              return (
                <article
                  className={`rounded-lg border bg-white p-4 shadow-sm ${
                    isRejected ? 'border-red-200' : 'border-slate-200'
                  }`}
                  key={registro.uuid}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold tracking-normal text-slate-950">
                        {displayAssetCode}
                      </p>
                      <h2 className="mt-1 text-sm font-medium leading-5 text-slate-700">
                        {displayAssetName}
                      </h2>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${orderStatusClasses[registro.status]}`}
                    >
                      {orderStatusLabel[registro.status]}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    <div className="rounded-md bg-slate-100 px-3 py-2 text-slate-700">
                      {displayLocation}
                    </div>
                    {activo ? (
                      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                        <span className="text-slate-600">Estado del activo</span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${estadoClasses[activo.status]}`}
                        >
                          {activo.status}
                        </span>
                      </div>
                    ) : null}
                    <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 font-semibold text-sky-800">
                      {daysRemaining === null
                        ? 'Sin fecha programada para el proximo mantenimiento'
                        : `${daysRemaining} dias para el proximo mantenimiento`}
                    </div>
                    {isRejected ? (
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                        {registro.rejection_comments ?? 'Requiere accion correctiva urgente.'}
                      </div>
                    ) : null}
                  </div>

                  <Link
                    className={`mt-4 flex h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 ${
                      isRejected
                        ? 'bg-red-700 hover:bg-red-800 focus:ring-red-200 active:bg-red-900'
                        : registro.status === 'draft'
                          ? 'bg-sky-700 hover:bg-sky-800 focus:ring-sky-200 active:bg-sky-900'
                          : 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-300 active:bg-slate-950'
                    }`}
                    href={actionHref}
                  >
                    {getOrderActionLabel(registro.status)}
                  </Link>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}

