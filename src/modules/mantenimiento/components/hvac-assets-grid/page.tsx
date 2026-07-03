import Link from 'next/link';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import type { Activo, ActivoEstado } from '@/modules/activos/activos.interface';
import { GridRefreshOnMount } from './grid-refresh-on-mount';
import { TechnicalHistoryGrid } from './technical-history-grid';

const ENABLE_SUPERADMIN_DEBUG_LOGS: boolean | 'verbose' = false;

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
  | 'pending_technician'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'pending_management'
  | 'rejected'
  | 'approved'
  | 'DRAFT'
  | 'PENDING_TECHNICIAN'
  | 'PENDING_SUPERVISOR'
  | 'PENDING_QUALITY'
  | 'PENDING_MANAGEMENT'
  | 'RECHAZADO_TECNICO'
  | 'APPROVED'
  | 'CLOSED'
  | 'VALIDATED'
  | 'closed'
  | 'validated';

type MantenimientoRegistro = {
  uuid: string;
  record_code?: string | null;
  asset_code: string | null;
  status: MaintenanceStatus;
  created_at?: string | null;
  assigned_technician?: string | null;
  executed_at: string | null;
  scheduled_date: string | null;
  supervisor_signed_by?: string | null;
  supervisor_signed_at?: string | null;
  quality_signed_by?: string | null;
  quality_signed_at: string | null;
  management_signed_by?: string | null;
  management_signed_at?: string | null;
  notes?: string | null;
  field_responses_payload?: unknown;
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

type CanonicalMaintenanceStatus =
  | 'draft'
  | 'pending_technician'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'pending_management'
  | 'rejected'
  | 'approved';

const orderStatusClasses: Record<CanonicalMaintenanceStatus, string> = {
  draft: 'border-amber-200 bg-amber-50 text-amber-800 shadow-sm',
  pending_technician: 'border-amber-200 bg-amber-50 text-amber-800 shadow-sm',
  pending_supervisor: 'border-cyan-200 bg-indigo-50/70 text-slate-800 shadow-sm',
  pending_quality: 'border-cyan-200 bg-indigo-50/70 text-slate-800 shadow-sm',
  pending_management: 'border-cyan-200 bg-indigo-50/70 text-slate-800 shadow-sm',
  rejected: 'border-red-200 bg-red-50 text-red-800 shadow-sm',
  approved: 'border-emerald-800 bg-emerald-900 text-white shadow-sm',
};

const orderStatusLabel: Record<CanonicalMaintenanceStatus, string> = {
  draft: 'Borrador',
  pending_technician: 'Pendiente Tecnico',
  pending_supervisor: 'Pendiente Supervisor',
  pending_quality: 'Pendiente Calidad',
  pending_management: 'Pendiente Gerencia',
  rejected: 'Rechazado Tecnico',
  approved: 'REGISTRO CERRADO',
};

const tabs: Array<{ href: string; label: string; value: DashboardView }> = [
  {
    href: '/mantenimiento/hvac/rui/activo',
    label: 'Activos / Ordenes Pendientes',
    value: 'pending',
  },
  {
    href: '/mantenimiento/hvac/rui/enviado',
    label: 'Activos / Ordenes Enviados',
    value: 'sent',
  },
  {
    href: '/mantenimiento/hvac/rui/rechazado',
    label: 'Activos / Ordenes Rechazados',
    value: 'rejected',
  },
  {
    href: '/mantenimiento/hvac/rui/ht',
    label: 'Historial Tecnico',
    value: 'history',
  },
];

const SENT_STATUSES: Array<MantenimientoRegistro['status']> = [
  'PENDING_SUPERVISOR',
  'PENDING_QUALITY',
  'PENDING_MANAGEMENT',
];
const PENDING_STATUSES: Array<MantenimientoRegistro['status']> = [
  'DRAFT',
  'PENDING_TECHNICIAN',
];
const REJECTED_STATUSES: Array<MantenimientoRegistro['status']> = [
  'RECHAZADO_TECNICO',
];
const HISTORY_STATUSES = [
  'APPROVED',
  'CLOSED',
  'VALIDATED',
  'approved',
  'closed',
  'validated',
  'PENDING_MANAGEMENT',
] as const satisfies ReadonlyArray<MantenimientoRegistro['status']>;
type DashboardRoleScope = 'technician' | 'supervisor' | 'quality' | 'management';

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

function normalizeMaintenanceStatus(
  status: MantenimientoRegistro['status'] | string | null | undefined,
): CanonicalMaintenanceStatus {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');

  if (
    normalized === 'pending_technician' ||
    normalized === 'pendiente_tecnico' ||
    normalized === 'pending_tecnico'
  ) {
    return 'pending_technician';
  }

  if (normalized === 'pending_supervisor' || normalized === 'pendiente_supervisor') {
    return 'pending_supervisor';
  }

  if (normalized === 'pending_quality' || normalized === 'pendiente_calidad') {
    return 'pending_quality';
  }

  if (normalized === 'pending_management' || normalized === 'pendiente_gerencia') {
    return 'pending_management';
  }

  if (
    normalized === 'rejected' ||
    normalized === 'rechazado' ||
    normalized === 'rechazado_tecnico'
  ) {
    return 'rejected';
  }

  if (
    normalized === 'approved' ||
    normalized === 'closed' ||
    normalized === 'validated' ||
    normalized === 'aprobado' ||
    normalized === 'completed' ||
    normalized === 'cerrado'
  ) {
    return 'approved';
  }

  return 'draft';
}

function isStatusInList(
  status: MantenimientoRegistro['status'],
  statusList: Array<MantenimientoRegistro['status']>,
) {
  const canonicalStatus = normalizeMaintenanceStatus(status);

  return statusList.some(
    (allowedStatus) => normalizeMaintenanceStatus(allowedStatus) === canonicalStatus,
  );
}

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

function normalizeRoleValue(role: string | null | undefined) {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function resolveDashboardRoleScope(
  role: string | null | undefined,
  email: string | null | undefined,
): DashboardRoleScope {
  if (isGlobalDashboardEmail(email) || isGlobalDashboardRole(role)) {
    return 'management';
  }

  const normalizedRole = normalizeRoleValue(role);

  if (normalizedRole === 'supervisor') {
    return 'supervisor';
  }

  if (
    normalizedRole === 'calidad' ||
    normalizedRole === 'qa' ||
    normalizedRole === 'quality' ||
    normalizedRole === 'auditor'
  ) {
    return 'quality';
  }

  return 'technician';
}

function resolvePendingStatusesForRole(
  roleScope: DashboardRoleScope,
): Array<MantenimientoRegistro['status']> {
  if (roleScope === 'supervisor') {
    return ['PENDING_SUPERVISOR'];
  }

  if (roleScope === 'quality') {
    return ['PENDING_QUALITY'];
  }

  if (roleScope === 'management') {
    return ['PENDING_MANAGEMENT'];
  }

  return PENDING_STATUSES;
}

function resolveStatusesForView(
  view: DashboardView,
  roleScope: DashboardRoleScope,
): Array<MantenimientoRegistro['status']> {
  if (view === 'history') {
    return [...HISTORY_STATUSES];
  }

  if (view === 'sent') {
    return SENT_STATUSES;
  }

  if (view === 'rejected') {
    return REJECTED_STATUSES;
  }

  return resolvePendingStatusesForRole(roleScope);
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

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function hasArrayPayload(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  if (typeof value !== 'string') {
    return false;
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return value.trim().length > 0;
  }
}

function containsEvidenceReference(value: unknown): boolean {
  if (!value) {
    return false;
  }

  if (typeof value === 'string') {
    const normalized = value.toLowerCase();

    return (
      normalized.includes('dropzone') ||
      normalized.includes('signature') ||
      normalized.includes('firma') ||
      normalized.includes('attachment') ||
      normalized.includes('evidencias-mantenimiento') ||
      normalized.includes('evidencias/') ||
      normalized.includes('evidencias_hvac') ||
      normalized.includes('publicurl') ||
      normalized.includes('storage')
    );
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsEvidenceReference(item));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) =>
      containsEvidenceReference(item),
    );
  }

  return false;
}

function resolveDataSignals(registro: MantenimientoRegistro) {
  const notes = parseJsonObject(registro.notes);
  const fieldResponsesPayload = registro.field_responses_payload ?? notes.field_responses_payload;
  const progressStep = Number(notes.progress_step ?? 0);
  const hasFormPayload =
    hasArrayPayload(fieldResponsesPayload) ||
    progressStep >= 2 ||
    normalizeMaintenanceStatus(registro.status) !== 'pending_technician';

  return {
    hasCompletedForm: hasFormPayload,
    hasEvidence: containsEvidenceReference(notes),
  };
}

function resolveSignatureProgress(registro: MantenimientoRegistro) {
  const canonicalStatus = normalizeMaintenanceStatus(registro.status);
  const tecnicoSigned = Boolean(registro.executed_at || registro.assigned_technician);
  const supervisorSigned = Boolean(
    registro.supervisor_signed_at ||
      registro.supervisor_signed_by ||
      ['pending_quality', 'pending_management', 'approved'].includes(canonicalStatus),
  );
  const qualitySigned = Boolean(
    registro.quality_signed_at ||
      registro.quality_signed_by ||
      ['pending_management', 'approved'].includes(canonicalStatus),
  );
  const managementSigned = Boolean(
    registro.management_signed_at ||
      registro.management_signed_by ||
      canonicalStatus === 'approved',
  );
  const steps = [
    { label: 'Tecnico', complete: tecnicoSigned },
    { label: 'Supervisor', complete: supervisorSigned },
    { label: 'Calidad', complete: qualitySigned },
    { label: 'Gerencia', complete: managementSigned },
  ];
  const completedCount = steps.filter((step) => step.complete).length;

  return {
    completedCount,
    totalCount: steps.length,
    steps,
  };
}

function formatDateTimeUtc(value: string | null | undefined) {
  if (!value) {
    return 'No registrada';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-PA', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function resolveRelatedAsset(registro: DashboardOrder) {
  if (Array.isArray(registro.activos)) {
    return registro.activos[0];
  }

  return registro.activos ?? undefined;
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
    if (ENABLE_SUPERADMIN_DEBUG_LOGS) {
      console.log('[DEBUG RLS ISOLATION] Asset lookup failed during split fetch:', {
        code: activosError.code,
        message: activosError.message,
      });
    }

    return orders.map((order) => ({ ...order, activos: null }));
  }

  if (ENABLE_SUPERADMIN_DEBUG_LOGS) {
    console.log('[DEBUG RLS ISOLATION] Asset rows resolved after split fetch:', activosData?.length || 0);
  }

  const activosByCode = new Map(
    (activosData ?? []).map((activo) => [String(activo.asset_code ?? ''), activo]),
  );

  return orders.map((order) => ({
    ...order,
    activos: activosByCode.get(String(order.asset_code ?? '')) ?? null,
  })) as DashboardOrder[];
}

function getOrderHref(registro: MantenimientoRegistro, activo?: ActivoConUuid) {
  const canonicalStatus = normalizeMaintenanceStatus(registro.status);

  if (canonicalStatus === 'approved') {
    return `/mantenimiento/hvac/rui/ht/${registro.uuid}`;
  }

  if (
    canonicalStatus === 'pending_supervisor' ||
    canonicalStatus === 'pending_quality' ||
    canonicalStatus === 'pending_management'
  ) {
    return `/mantenimiento/hvac/rui/enviado/${registro.uuid}`;
  }

  if (canonicalStatus === 'rejected') {
    return `/mantenimiento/hvac/rui/rechazado/${registro.uuid}`;
  }

  if (canonicalStatus === 'draft' || canonicalStatus === 'pending_technician') {
    return `/mantenimiento/hvac/rui/activo/${registro.uuid}`;
  }

  if (activo?.uuid) {
    return `/mantenimiento/hvac/rui/activo/${activo.uuid}`;
  }

  return '/mantenimiento/hvac/rui/activo';
}

function getOrderActionLabel(status: MantenimientoRegistro['status']) {
  const canonicalStatus = normalizeMaintenanceStatus(status);

  if (canonicalStatus === 'draft' || canonicalStatus === 'pending_technician') {
    return 'Continuar Inspeccion';
  }

  if (
    canonicalStatus === 'pending_supervisor' ||
    canonicalStatus === 'pending_quality' ||
    canonicalStatus === 'pending_management'
  ) {
    return 'Consultar';
  }

  if (canonicalStatus === 'rejected') {
    return 'Consultar';
  }

  if (canonicalStatus === 'approved') {
    return 'Ver Reporte';
  }

  return 'Revisar y Firmar';
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const technicianEmail = user?.email?.trim().toLowerCase() ?? null;
  const { data: usuarioData } = technicianEmail
    ? await supabase
        .from('usuarios_roles')
        .select('role')
        .eq('user_email', technicianEmail)
        .eq('active', true)
        .maybeSingle()
    : { data: null };
  const role = (usuarioData as { role?: string | null } | null)?.role;
  const isSuperadminDebugEnabled =
    ENABLE_SUPERADMIN_DEBUG_LOGS &&
    String(role ?? '').trim().toLowerCase() === 'administrativo';
  const roleScope = resolveDashboardRoleScope(role, technicianEmail);
  const visiblePendingStatuses = resolvePendingStatusesForRole(roleScope);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentView = normalizeView(resolvedSearchParams.view);
  const statusesForView = resolveStatusesForView(currentView, roleScope);
  const statusFilterForView =
    currentView === 'pending' ? visiblePendingStatuses : statusesForView;
  const historySearchTerm = String(resolvedSearchParams.q ?? '');
  const selectedHistoryAsset = String(resolvedSearchParams.asset ?? '');
  const showOnlyDeviations = resolvedSearchParams.deviations === 'true';
  const showAgingSignatures = resolvedSearchParams.aging === '72h';
  const selectedRiskLevel = resolvedSearchParams.risk === 'high' ? 'high' : 'all';
  let dashboardOrders: DashboardOrder[] = [];
  let queryError: { code?: string; message?: string } | null = null;
  let absoluteTotalCount = 0;
  let allRecordsByStatus: Record<string, number> = {};

  if (isSuperadminDebugEnabled) {
    console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 1 [Llamada a Ordenes Activas]', {
      table: 'mantenimientos_registros',
      select: '*, activos(*)',
      status: statusesForView,
      roleScope,
      view: currentView,
    });
  }

  try {
    let registrosQuery = supabase
      .from('mantenimientos_registros')
      .select('*')
      .order('executed_at', { ascending: false });

    if (currentView !== 'history') {
      registrosQuery = registrosQuery.in('status', statusFilterForView);
    }

    if (roleScope === 'technician') {
      registrosQuery = registrosQuery.ilike('assigned_technician', technicianEmail ?? '');
    }

    const [{ data: rawOrders }, { count: absoluteTotal }] = await Promise.all([
      supabase
        .from('mantenimientos_registros')
        .select('id, status, asset_code'),
      supabase
        .from('mantenimientos_registros')
        .select('*', { count: 'exact', head: true }),
    ]);

    absoluteTotalCount = absoluteTotal ?? rawOrders?.length ?? 0;
    allRecordsByStatus = (rawOrders ?? []).reduce<Record<string, number>>((accumulator, order) => {
      const statusKey = String(order.status ?? 'SIN_STATUS');
      accumulator[statusKey] = (accumulator[statusKey] ?? 0) + 1;
      return accumulator;
    }, {});

    if (isSuperadminDebugEnabled) {
      console.log('[DEBUG RLS ISOLATION] Raw orders without asset join:', rawOrders?.length || 0);
      console.log('[DEBUG HISTORIAL STATUS MAP]', {
        statuses: Array.from(new Set((rawOrders ?? []).map((order) => order.status))),
        allRecordsByStatus,
      });
    }

    const { data: registrosData, error: registrosError } = await registrosQuery;

    if (registrosError) {
      queryError = {
        code: registrosError.code,
        message: registrosError.message,
      };

      if (isSuperadminDebugEnabled) {
        console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 3 [Ordenes por Estado]', {
          result: 'supabase_error',
          error: {
            code: registrosError.code,
            message: registrosError.message,
          },
        });
      }
    } else {
      const finalRecords = await attachAssetsToOrders(
        supabase,
        (registrosData ?? []).map((registro) => ({
          ...registro,
          activos: null,
        })) as DashboardOrder[],
      );

      dashboardOrders =
        currentView === 'history'
          ? finalRecords
          : finalRecords.filter((registro) => isStatusInList(registro.status, statusFilterForView));
    }

    if (ENABLE_SUPERADMIN_DEBUG_LOGS === 'verbose' && isSuperadminDebugEnabled) {
      const { data: allRecordsDump } = await supabase
        .from('mantenimientos_registros')
        .select('uuid, record_code');

      console.log('============= [AUDITORIA TOTAL DE RUI UUIDS] =============');
      console.log({
        totalContados: allRecordsDump?.length || 0,
        listadoUuids: allRecordsDump?.map((record) => ({
          code: record.record_code,
          uuid: record.uuid,
        })),
      });
      console.log('==========================================================');
    }

    if (isSuperadminDebugEnabled) {
      console.log('[TELEMETRIA METRICAS ABSOLUTAS P360]', {
        totalRegistrosEnSistema: absoluteTotalCount,
        totalFiltradosEnVistaActual: dashboardOrders?.length || 0,
        activeAssetScope: 'hvac',
        diagnosticMessage: 'Métrica total absoluta cargada para auditoría de Superadmin',
        allRecordsByStatus,
      });
      console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 2 [Resultado / Respuesta del Servidor]', {
        result: queryError ? 'supabase_error' : 'supabase_success',
        selectClause: queryError ? null : 'mantenimientos_registros(*) + split activos lookup',
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
    }
  } catch (error) {
    queryError = {
      message: error instanceof Error ? error.message : 'Error inesperado',
    };

    if (isSuperadminDebugEnabled) {
      console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 2 [Resultado / Respuesta del Servidor]', {
        result: 'exception',
        error: queryError,
      });
    }
  }

  const historyOrders = dashboardOrders;
  const visibleOrders = dashboardOrders;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <GridRefreshOnMount />
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

        <nav className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-4">
          {tabs.map((tab) => {
            const isActive = currentView === tab.value;

            return (
              <Link
                className={`flex min-h-11 items-center justify-center rounded-md px-3 text-center text-sm font-semibold transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
                href={tab.href}
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

        {!queryError && currentView !== 'history' && visibleOrders.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
            No hay ordenes en esta pestana segun el estado transaccional actual.
          </div>
        ) : null}

        {!queryError && currentView === 'history' ? (
          <TechnicalHistoryGrid
            initialSearchTerm={historySearchTerm}
            orders={historyOrders}
            roleScope={roleScope}
          />
        ) : null}

        {!queryError && currentView !== 'history' ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleOrders.map((registro) => {
              if (currentView === 'pending' && registro.status === 'CLOSED') {
                return null;
              }

              const activo = resolveRelatedAsset(registro);
              const displayAssetCode =
                activo?.asset_code ?? registro.asset_code ?? 'Activo no disponible';
              const displayAssetName = activo?.asset_name ?? 'Orden de mantenimiento';
              const displayLocation = formatLocation(activo);
              const daysRemaining = calculateDaysRemaining(
                registro.scheduled_date ?? activo?.next_maintenance_date,
              );
              const canonicalStatus = normalizeMaintenanceStatus(registro.status);
              const statusClassName = orderStatusClasses[canonicalStatus];
              const statusLabel =
                canonicalStatus === 'approved' ? '🔐 REGISTRO CERRADO' : orderStatusLabel[canonicalStatus];
              const isRejected = canonicalStatus === 'rejected';
              const actionHref = getOrderHref(registro, activo);
              const signatureProgress = resolveSignatureProgress(registro);
              const dataSignals = resolveDataSignals(registro);

              return (
                <article
                  className={`rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md ${
                    canonicalStatus === 'approved'
                      ? 'border-emerald-900/20 bg-emerald-950/[0.02]'
                      : isRejected
                        ? 'border-red-200'
                        : 'border-slate-200'
                  }`}
                  key={registro.uuid}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-lg font-black tracking-normal text-slate-950">
                        {registro.record_code || 'SIN_CODIGO'}
                      </p>
                      <h2 className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-700">
                        {displayAssetName}
                      </h2>
                      <p className="mt-1 truncate font-mono text-[11px] font-semibold text-slate-400">
                        Activo: {displayAssetCode}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${statusClassName}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="rounded-md bg-slate-100 px-3 py-2 text-slate-700">
                      {displayLocation}
                    </div>
                    <div className="grid gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-500">Tecnico ejecutor</span>
                        <span className="truncate text-right font-bold text-slate-800">
                          {registro.assigned_technician ?? 'No asignado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-500">Ejecucion UTC</span>
                        <span className="text-right font-bold text-slate-800">
                          {formatDateTimeUtc(registro.executed_at)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-slate-700">
                          Firmas: {signatureProgress.completedCount} de {signatureProgress.totalCount} autorizadas
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
                          {signatureProgress.steps
                            .filter((step) => step.complete)
                            .map((step) => step.label.slice(0, 3))
                            .join(' / ') || 'Sin firmas'}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1">
                        {signatureProgress.steps.map((step) => (
                          <div
                            aria-label={`${step.label}: ${step.complete ? 'autorizada' : 'pendiente'}`}
                            className={`h-1.5 rounded-full ${
                              step.complete ? 'bg-emerald-600' : 'bg-slate-200'
                            }`}
                            key={step.label}
                            title={`${step.label}: ${step.complete ? 'autorizada' : 'pendiente'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dataSignals.hasCompletedForm ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                          📝 Formulario Diligenciado
                        </span>
                      ) : null}
                      {dataSignals.hasEvidence ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                          📸 Evidencia Adjunta
                        </span>
                      ) : null}
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
                        : canonicalStatus === 'draft' || canonicalStatus === 'pending_technician'
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

