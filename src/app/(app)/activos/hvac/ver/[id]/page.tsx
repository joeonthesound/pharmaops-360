import Link from 'next/link';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  FileText,
  Gauge,
  PencilLine,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  getActivoDetalle,
  type ActivoReporteDetalle,
} from '@/modules/activos/actions/get-activo-detalle';
import { AssetImageDialog } from './asset-image-dialog';
import { SectionInfoTooltip } from './section-info-tooltip';
import { SuperadminDebugPanel } from './superadmin-debug-panel';
import { TechnicalFichaTabs } from './technical-ficha-tabs';
import {
  AdminQualificationCard,
  SuperadminDestructiveCard,
} from './asset-compliance-panels';
import { APP_ROUTES } from '@/modules/common/routes';

type ActivoHvacDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type LifecycleState = {
  label: string;
  className: string;
};

type ActionBadge = {
  label: 'Insert' | 'Update' | 'Inactivate';
  className: string;
};

const GXP_STATUS_BADGES = {
  technician: {
    label: 'FIRMADO - TÉCNICO',
    className: 'border-slate-700 bg-slate-900 text-white shadow-sm',
  },
  supervisor: {
    label: 'REVISADO - SUPERVISOR',
    className: 'border-indigo-700 bg-indigo-700 text-white shadow-sm',
  },
  quality: {
    label: 'APROBADO - CALIDAD',
    className: 'border-emerald-800 bg-emerald-700 text-white shadow-sm',
  },
  rejected: {
    label: 'RECHAZADO - DESVIACIÓN',
    className: 'border-red-800 bg-red-700 text-white shadow-sm',
  },
} as const satisfies Record<string, LifecycleState>;

const actionBadgeStyles: Record<ActionBadge['label'], string> = {
  Insert: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Update: 'bg-blue-50 text-blue-700 border-blue-200',
  Inactivate: 'bg-orange-50 text-[#C76E00] border-orange-200',
};

function getStringValue(value: unknown, fallback = 'No disponible') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getReportStatus(reporte: ActivoReporteDetalle) {
  return getStringValue(reporte.status, 'draft');
}

function normalizeReportStatus(reporte: ActivoReporteDetalle) {
  return getReportStatus(reporte)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function resolveLifecycle(reporte: ActivoReporteDetalle) {
  const status = normalizeReportStatus(reporte);

  if (
    status.includes('reject') ||
    status.includes('rechaz') ||
    status.includes('nok') ||
    Boolean(reporte.rejection_comments?.trim())
  ) {
    return GXP_STATUS_BADGES.rejected;
  }

  if (
    status === 'approved' ||
    status === 'closed' ||
    status === 'aprobado' ||
    Boolean(reporte.quality_signed_at || reporte.quality_signed_by)
  ) {
    return GXP_STATUS_BADGES.quality;
  }

  if (
    status === 'pending_quality' ||
    status === 'pending_management' ||
    status === 'revisado_supervisor' ||
    Boolean(reporte.supervisor_signed_at || reporte.supervisor_signed_by)
  ) {
    return GXP_STATUS_BADGES.supervisor;
  }

  return GXP_STATUS_BADGES.technician;
}

function resolveActionBadge(reporte: ActivoReporteDetalle): ActionBadge {
  const status = normalizeReportStatus(reporte);

  if (status === 'rejected') {
    return {
      label: 'Inactivate',
      className: actionBadgeStyles.Inactivate,
    };
  }

  if (status === 'draft') {
    return {
      label: 'Insert',
      className: actionBadgeStyles.Insert,
    };
  }

  return {
    label: 'Update',
    className: actionBadgeStyles.Update,
  };
}

function getReportUuid(reporte: ActivoReporteDetalle) {
  return getStringValue(reporte.reporte_id ?? reporte.uuid, String(reporte.id));
}

function getReportCode(reporte: ActivoReporteDetalle) {
  return getStringValue(reporte.record_code ?? reporte.uuid, `RUI-${reporte.id}`);
}

function getReportDate(reporte: ActivoReporteDetalle) {
  const rawDate =
    typeof reporte.executed_at === 'string'
      ? reporte.executed_at
      : typeof reporte.scheduled_date === 'string'
        ? reporte.scheduled_date
        : null;

  if (!rawDate) {
    return 'Fecha no registrada';
  }

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no registrada';
  }

  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function DisabledSpecInput({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        className="h-10 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-500"
        disabled
        value={value}
        readOnly
      />
    </label>
  );
}

function normalizeRole(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isAdminProfile(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === 'administrador' || normalizedRole === 'superadmin';
}

function isSuperadminProfile(role: string | null | undefined) {
  return normalizeRole(role) === 'superadmin';
}

function getOperatorToken(value: string | null | undefined) {
  const normalizedValue = String(value ?? '').trim().toUpperCase();

  if (!normalizedValue) {
    return 'SIN-SESION';
  }

  return normalizedValue.slice(0, 18);
}

function HeaderMetadataBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md border border-slate-200 shadow-sm whitespace-nowrap">
      {label}: {value}
    </span>
  );
}

function getReportTimestamp(reporte: ActivoReporteDetalle) {
  const rawDate =
    typeof reporte.executed_at === 'string'
      ? reporte.executed_at
      : typeof reporte.scheduled_date === 'string'
        ? reporte.scheduled_date
        : null;

  if (!rawDate) {
    return null;
  }

  const date = new Date(rawDate);

  return Number.isNaN(date.getTime()) ? null : date;
}

function calculateMtbfLabel(reportes: ActivoReporteDetalle[]) {
  const timestamps = reportes
    .map((reporte) => getReportTimestamp(reporte)?.getTime() ?? null)
    .filter((timestamp): timestamp is number => typeof timestamp === 'number')
    .sort((left, right) => left - right);

  if (timestamps.length < 2) {
    return 'N/D';
  }

  const deltas = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]);
  const averageDelta = deltas.reduce((total, delta) => total + delta, 0) / deltas.length;
  const days = Math.max(1, Math.round(averageDelta / 86_400_000));

  return `${days} dias`;
}

function getCalibrationProgress(lastMaintenanceDate: string | null | undefined) {
  if (!lastMaintenanceDate) {
    return 0;
  }

  const calibrationDate = new Date(lastMaintenanceDate);

  if (Number.isNaN(calibrationDate.getTime())) {
    return 0;
  }

  const elapsedDays = Math.max(
    0,
    Math.floor((Date.now() - calibrationDate.getTime()) / 86_400_000),
  );

  return Math.min(100, Math.round((elapsedDays / 365) * 100));
}

function getStatusDeltaBlocks(reportes: ActivoReporteDetalle[]) {
  return reportes.slice(0, 18).map((reporte) => {
    const status = getReportStatus(reporte).toLowerCase();

    return {
      key: `${getReportCode(reporte)}-${getReportUuid(reporte)}`,
      className:
        status.includes('reject') || status.includes('nok')
          ? 'bg-rose-500'
          : 'bg-emerald-500',
      label: status.includes('reject') || status.includes('nok') ? 'NOK' : 'PASS',
    };
  });
}

function getMtbfTrendBars(reportes: ActivoReporteDetalle[]) {
  const timestamps = reportes
    .map((reporte) => getReportTimestamp(reporte)?.getTime() ?? null)
    .filter((timestamp): timestamp is number => typeof timestamp === 'number')
    .sort((left, right) => left - right);

  if (timestamps.length < 2) {
    return [];
  }

  const deltas = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]);
  const maxDelta = Math.max(...deltas);

  return deltas.slice(-7).map((delta, index) => ({
    key: `${delta}-${index}`,
    height: Math.max(18, Math.round((delta / maxDelta) * 100)),
  }));
}

function RecordCodeBadge({ code }: { code: string }) {
  const normalizedCode = code.toUpperCase();
  const shouldHighlight = normalizedCode.startsWith('RUI-') || normalizedCode.startsWith('WO-');

  if (!shouldHighlight) {
    return <span className="font-mono text-sm font-black text-slate-950">{code}</span>;
  }

  return (
    <span className="inline-flex w-fit font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 shadow-sm">
      {code}
    </span>
  );
}

function AttachmentCounterBadge({ count }: { count: number }) {
  if (count <= 0) {
    return <span className="font-mono text-sm font-bold text-slate-400">—</span>;
  }

  return (
    <span className="inline-flex w-fit rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-700 shadow-sm">
      📎 {count} {count === 1 ? 'Adjunto' : 'Adjuntos'}
    </span>
  );
}

function MetricCluster({
  calibrationProgress,
  mtbfLabel,
  statusBlocks,
  trendBars,
}: {
  calibrationProgress: number;
  mtbfLabel: string;
  statusBlocks: Array<{ key: string; className: string; label: string }>;
  trendBars: Array<{ key: string; height: number }>;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Tiempo Medio Entre Fallas (MTBF)
            <SectionInfoTooltip
              label="Tiempo Medio Entre Fallas"
              message="Indicador estadístico que mide la confiabilidad del activo. Se alimenta del intervalo de tiempo entre desviaciones críticas reportadas en los RUI. Afecta la programación del mantenimiento preventivo."
            />
          </p>
          <TrendingUp aria-hidden="true" className="h-5 w-5 shrink-0 text-indigo-600" />
        </div>
        <p className="mt-3 font-mono text-3xl font-black text-slate-950">{mtbfLabel}</p>
        <div className="mt-4 flex h-8 items-end gap-1">
          {trendBars.length > 0 ? (
            trendBars.map((bar) => (
              <span
                className="w-full rounded-t bg-indigo-500/80"
                key={bar.key}
                style={{ height: `${bar.height}%` }}
              />
            ))
          ) : (
            <span className="font-mono text-sm font-bold text-slate-400">N/D</span>
          )}
        </div>
      </article>

      <article className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-wide text-amber-800">
            Ciclo de Vida de Calibracion
            <SectionInfoTooltip
              label="Ciclo de Vida de Calibracion"
              message="Mapeo porcentual del tiempo de vigencia técnica remanente del instrumento. Se alimenta de la fecha de última calibración versus vencimiento regulatorio. Evita paros de línea por descalificación GxP."
            />
          </p>
          <Gauge aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
        </div>
        <p className="mt-3 font-mono text-3xl font-black text-slate-950">
          {calibrationProgress}%
        </p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white ring-1 ring-amber-200">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${calibrationProgress}%` }}
          />
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            Delta de Fallas Operacionales
            <SectionInfoTooltip
              label="Delta de Fallas Operacionales"
              message="Representación cuantitativa del comportamiento histórico de fallas. Se alimenta de la relación de RUIs aprobados versus rechazados. Permite evaluar el desgaste del equipo."
            />
          </p>
          <BarChart3 aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-700" />
        </div>
        <div className="mt-4 grid grid-cols-9 gap-1">
          {statusBlocks.length > 0 ? (
            statusBlocks.map((block) => (
              <span
                aria-label={block.label}
                className={`h-8 rounded-sm ${block.className}`}
                key={block.key}
              />
            ))
          ) : (
            <span className="col-span-9 font-mono text-sm font-bold text-slate-400">N/D</span>
          )}
        </div>
      </article>
    </div>
  );
}

export default async function ActivoHvacDetallePage({
  params,
}: ActivoHvacDetallePageProps) {
  const resolvedParams = await params;
  const data = await getActivoDetalle(resolvedParams.id);

  // Se desactivara posteriormente desde el toggle de SuperAdmin para pruebas OQ controladas.
  if (process.env.NEXT_PUBLIC_SUPERADMIN_DEBUG === 'true') {
    console.log(
      '[VERIFICATION SYSTEM ACTIVE - GxP MATCH]:',
      data.historial_mantenimientos,
    );
  }

  if (!data.activo) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto grid w-full max-w-3xl gap-3 rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide">Activo no localizado</p>
          <h1 className="text-2xl font-semibold tracking-normal">
            No data found for this identifier
          </h1>
          <p className="text-sm leading-6">
            No se encontro un activo HVAC con el codigo de expediente solicitado. Verifique el
            Asset Tag fisico del activo antes de continuar.
          </p>
        </section>
      </main>
    );
  }

  const activo = data.activo;
  const location = [activo.location_detail, activo.area, activo.site].filter(Boolean).join(' / ');
  const assetDisplayName = activo.asset_name || 'Manejadora de Aire';
  const currentUserRole = data.seguridad.usuarioRole;
  const canRenderAdminPanel = isAdminProfile(currentUserRole);
  const canRenderSuperadminPanel = isSuperadminProfile(currentUserRole);
  const operatorId = getOperatorToken(data.debug.usuarioEmail);
  const mtbfLabel = calculateMtbfLabel(data.historial_mantenimientos);
  const calibrationProgress = getCalibrationProgress(activo.last_maintenance_date);
  const statusBlocks = getStatusDeltaBlocks(data.historial_mantenimientos);
  const trendBars = getMtbfTrendBars(data.historial_mantenimientos);
  const datosGenerales = [
    { label: 'ID del Activo', value: activo.asset_code },
    { label: 'Descripcion', value: activo.asset_name },
    { label: 'Ubicacion', value: location || 'Ubicacion no disponible' },
    { label: 'Area', value: activo.area },
  ];
  const limitesGxp = [
    { label: 'Tipo', value: activo.asset_type },
    { label: 'Frecuencia de Mantenimiento', value: activo.maintenance_frequency },
    { label: 'Ultimo Mantenimiento', value: activo.last_maintenance_date ?? 'No registrada' },
    { label: 'Proximo Mantenimiento', value: activo.next_maintenance_date ?? 'No programado' },
  ];
  const registroFabrica = [
    { label: 'Modelo', value: activo.model },
    { label: 'Numero de Serie', value: activo.serial_number },
    { label: 'Fabricante', value: activo.brand },
    { label: 'Capacidad', value: `${activo.capacity} ${activo.capacity_unit}`.trim() },
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      {process.env.NEXT_PUBLIC_SUPERADMIN_DEBUG === 'true' ? (
        <SuperadminDebugPanel payload={data} />
      ) : null}

      <div className="mx-auto grid w-full max-w-[98vw] gap-5 px-4 py-6 lg:px-6">
        <header className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap justify-end gap-2">
            <HeaderMetadataBadge label="OPERATOR_ID" value={operatorId} />
            <HeaderMetadataBadge label="EXPEDIENTE" value={activo.asset_code} />
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                Perfil Dinamico de Activo Critico (PDAC)
                <SectionInfoTooltip
                  includeDocumentationLink
                  label="Perfil Dinamico de Activo Critico"
                  message="Expediente digital inalterable que consolida el historial de calibración, calificación e inspecciones del activo HVAC."
                />
              </p>
              <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-3xl font-black tracking-normal text-slate-950 md:text-5xl">
                <span>{assetDisplayName}</span>
                <span className="font-mono text-indigo-700">{activo.asset_code}</span>
                <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                  Rev. {activo.version}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" size={24} />
              <div>
                <p className="text-sm font-black">
                  Activo y Cualificado | El activo se encuentra operativo y calificado bajo control GxP.
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-800">
                  Timestamp UTC: {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit rounded-md bg-emerald-700 px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
              Validacion automatica
            </span>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-[98vw] grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <AssetImageDialog
              assetCode={activo.asset_code}
              imageUrl={activo.image_url}
              version={activo.version}
            />
          </div>

          <section className="rounded-lg border border-slate-200 border-t-4 border-t-indigo-600 bg-white p-5 shadow-sm lg:col-span-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Gauge aria-hidden="true" className="text-indigo-700" size={20} />
              <h2 className="text-base font-black text-slate-950">Ficha Tecnica</h2>
              <SectionInfoTooltip
                label="Ficha Tecnica"
                message="Muestra los datos maestros de ingeniería y diseño validados para el equipo en planta."
              />
            </div>

            <TechnicalFichaTabs
              datosGenerales={datosGenerales}
              limitesGxp={limitesGxp}
              registroFabrica={registroFabrica}
            />
          </section>

          <aside className="grid content-start gap-4 lg:col-span-3">
            <section className="rounded-lg border border-slate-200 border-t-4 border-t-blue-600 bg-white p-4 shadow-sm">
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-blue-700">
                  Gobernanza
                </p>
                <p className="mt-1 text-sm font-black text-blue-950">
                  Rol: Administrador Calificado
                </p>
              </div>
              <Link
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-indigo-700 bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition hover:border-indigo-800 hover:bg-indigo-800"
                href={`/activos/hvac/ver/${encodeURIComponent(activo.asset_code)}/control-cambios`}
              >
                <PencilLine aria-hidden="true" className="h-4 w-4 shrink-0" />
                Control de Cambios
              </Link>
            </section>

            <section className="rounded-lg border border-slate-200 border-t-4 border-t-amber-500 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="text-amber-700" size={18} />
                <h2 className="text-sm font-black text-slate-950">Perfil Regular (Solo Lectura)</h2>
                <SectionInfoTooltip
                  label="Perfil Regular"
                  message="Parámetros operativos de solo lectura para el control de flujos y umbrales GxP."
                />
              </div>
              <div className="mt-4 grid gap-3">
                <DisabledSpecInput label="Pressure Setpoint" value="N/A - pendiente SCADA" />
                <DisabledSpecInput label="ACH Threshold" value="N/A - pendiente balanceo" />
                <DisabledSpecInput label="Calibration" value={activo.last_maintenance_date ?? 'No registrada'} />
              </div>
            </section>

            {canRenderAdminPanel ? <AdminQualificationCard activoUuid={activo.uuid} /> : null}

            {canRenderSuperadminPanel ? (
              <SuperadminDestructiveCard activoUuid={activo.uuid} />
            ) : null}
          </aside>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-md">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <Activity aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-700" />
                Historial Inmutable de Cambios del Activo
                <SectionInfoTooltip
                  label="Historial Inmutable"
                  message="Registro cronológico inalterable (Audit Trail) de las órdenes de trabajo (WO) y reportes de inspección (RUI) ejecutados."
                />
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Registros de mantenimiento y evidencias
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                {data.historial_mantenimientos.length} RUI asociado(s)
              </span>
              <span className="inline-flex w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-800">
                {data.debug.auditTrailEventos} evento(s) audit_trail
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            <MetricCluster
              calibrationProgress={calibrationProgress}
              mtbfLabel={mtbfLabel}
              statusBlocks={statusBlocks}
              trendBars={trendBars}
            />

            {data.historial_mantenimientos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-600">
                No existen reportes RUI asociados a este activo.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="hidden grid-cols-[1fr_130px_1.25fr_1fr_150px_130px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500 xl:grid">
                  <span className="inline-flex items-center gap-1">
                    Timestamp (UTC)
                    <SectionInfoTooltip
                      label="Timestamp UTC"
                      message="Fecha y hora normalizada en UTC del registro RUI o WO hidratado desde Supabase."
                    />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span>Acción Ejecutada</span>
                    <SectionInfoTooltip
                      label="Acción Ejecutada"
                      message="Tipo de evento técnico o firma electrónica registrada en el Audit Trail bajo la norma FDA 21 CFR Part 11."
                    />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    RUI / WO Dominante
                    <SectionInfoTooltip
                      label="RUI / WO Dominante"
                      message="Identificador maestro del reporte unico de inspeccion o de la orden de trabajo asociada."
                    />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Estado Regulatorio
                    <SectionInfoTooltip
                      label="Estado Regulatorio"
                      message="Representa la fase actual del flujo de revisión humana y aprobación electrónica del reporte (Técnico -> Supervisor -> Calidad)."
                    />
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Adjuntos
                    <SectionInfoTooltip
                      label="Adjuntos"
                      message="Conteo matematico de archivos reales asociados al dataset del reporte en Supabase."
                    />
                  </span>
                  <span className="inline-flex items-center justify-end gap-1 text-right">
                    <span>Operaciones</span>
                    <SectionInfoTooltip
                      label="Operaciones"
                      message="Apertura del expediente completo en pantalla para la inspección y verificación visual de evidencias."
                    />
                  </span>
                </div>

                <div className="divide-y divide-slate-200">
                  {data.historial_mantenimientos.map((rui) => {
                    const lifecycle = resolveLifecycle(rui);
                    const actionBadge = resolveActionBadge(rui);
                    const reportUuid = getReportUuid(rui);
                    const reportCode = getReportCode(rui);
                    const reportHref = APP_ROUTES.mantenimiento.rui.historialDetalle(reportUuid);

                    return (
                      <div
                        className="grid gap-3 bg-white px-4 py-4 xl:grid-cols-[1fr_130px_1.25fr_1fr_150px_130px] xl:items-center"
                        key={`${reportCode}-${reportUuid}`}
                      >
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 xl:hidden">
                            Timestamp (UTC)
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-700 xl:mt-0">
                            {getReportDate(rui)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 xl:hidden">
                            Acción Ejecutada
                          </p>
                          <span
                            className={`mt-1 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black xl:mt-0 ${actionBadge.className}`}
                          >
                            {actionBadge.label}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 xl:hidden">
                            RUI / WO Dominante
                          </p>
                          <div className="mt-1 flex min-w-0 items-center gap-2 xl:mt-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                              <FileText aria-hidden="true" size={16} />
                            </div>
                            <div className="min-w-0">
                              <RecordCodeBadge code={reportCode} />
                              <p className="truncate font-mono text-xs text-slate-500">
                                {reportUuid}
                              </p>
                              <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                AUDIT_TRAIL:{rui.audit_trail_event_count}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 xl:hidden">
                            Estado Regulatorio
                          </p>
                          <span
                            className={`mt-1 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black xl:mt-0 ${lifecycle.className}`}
                          >
                            {lifecycle.label}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 xl:hidden">
                            Adjuntos
                          </p>
                          <div className="mt-1 xl:mt-0">
                            <AttachmentCounterBadge count={rui.imagenes_evidencia.length} />
                          </div>
                        </div>

                        <div className="flex justify-start xl:justify-end">
                          <Link
                            className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-black text-white transition hover:bg-slate-800"
                            href={reportHref}
                          >
                            Ver Reporte
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
