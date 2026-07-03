'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Monitor, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import {
  fetchAuditTrailLifecycleAction,
  type AuditTrailLifecycleRow,
} from '@/modules/mantenimiento/actions';
import { ENABLE_SUPERADMIN_DEBUG_LOGS } from '@/modules/mantenimiento/debug';

type ParsedAuditComments = {
  environment_metadata?: {
    clientIp?: string;
    deviceTimestamp?: string;
    userAgent?: string;
    [key: string]: unknown;
  };
  rejection_comments?: string | null;
  validation_comments?: string | null;
};

type ParsedAuditRow = AuditTrailLifecycleRow & {
  evidenceComment: string;
  parsedComments: ParsedAuditComments & { rawText?: string };
  timeMs: number;
};

type DeviceMetrics = {
  Android: number;
  iPhone: number;
  Macintosh: number;
  Windows: number;
  Other: number;
  Unknown: number;
};

type DeviceSegment = {
  className: string;
  label: keyof DeviceMetrics;
  percent: number;
};

type AuditLifecycleSheetProps = {
  assetMetadata: AuditLifecycleAssetMetadata;
  currentStatus: string;
  fallbackRecord: MaintenanceAuditFallbackRecord | null;
  recordCode: string | null;
  recordUuid: string;
};

type AuditLifecycleAssetMetadata = {
  assetCode: string | null;
  assetName: string | null;
  locationArea: string | null;
};

export type MaintenanceAuditFallbackRecord = {
  assigned_technician: string | null;
  created_at?: string | null;
  executed_at: string | null;
  management_email?: string | null;
  management_signed_at: string | null;
  management_signed_by: string | null;
  quality_signed_at: string | null;
  quality_signed_by: string | null;
  supervisor_signed_at: string | null;
  supervisor_signed_by: string | null;
  technician_email?: string | null;
  uuid: string;
};

type TimelineEntry = {
  actionLabel: string;
  comment: string;
  device: string;
  isRejected: boolean;
  operator: string;
  roleLabel: string;
  timestamp: string;
};

const EMPTY_AUDIT_MESSAGE =
  '📋 No se encontraron registros de auditoría ni firmas para este RUI en la bitácora oficial.';
const CONNECTION_ERROR_MESSAGE =
  '⚠️ Error de comunicación con el servidor GxP. No se pudo verificar la integridad del ciclo de vida.';

function parseAuditComments(
  rawValue: string | null,
  rowIndex: number,
): ParsedAuditComments & { rawText?: string } {
  if (!rawValue) {
    if (ENABLE_SUPERADMIN_DEBUG_LOGS) {
      console.log('[FRONTEND AUDIT COMMENT PARSE]', {
        rowIndex,
        mode: 'empty',
      });
    }

    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (ENABLE_SUPERADMIN_DEBUG_LOGS) {
        console.log('[FRONTEND AUDIT COMMENT PARSE]', {
          rowIndex,
          mode: 'json',
          keys: Object.keys(parsed),
        });
      }

      return parsed as ParsedAuditComments;
    }

    if (ENABLE_SUPERADMIN_DEBUG_LOGS) {
      console.log('[FRONTEND AUDIT COMMENT PARSE]', {
        rowIndex,
        mode: 'non_object_json',
      });
    }

    return { rawText: rawValue };
  } catch (error) {
    if (ENABLE_SUPERADMIN_DEBUG_LOGS) {
      console.log('[FRONTEND AUDIT COMMENT PARSE]', {
        rowIndex,
        mode: 'legacy_raw_text',
        error: error instanceof Error ? error.message : 'parse_error',
      });
    }

    return { rawText: rawValue };
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Sin timestamp';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function computeCycleHours(firstTimestamp: string | null, lastTimestamp: string | null) {
  if (!firstTimestamp || !lastTimestamp) {
    return 0;
  }

  const startMs = new Date(firstTimestamp).getTime();
  const endMs = new Date(lastTimestamp).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return 0;
  }

  return Number(((endMs - startMs) / 3600000).toFixed(2));
}

function formatCycleHours(hours: number) {
  if (hours === 0) {
    return '0h';
  }

  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }

  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`;
}

function resolveDeviceType(userAgent: string | undefined): keyof DeviceMetrics {
  if (!userAgent) {
    return 'Unknown';
  }

  if (/android/i.test(userAgent)) {
    return 'Android';
  }

  if (/iphone|ipad/i.test(userAgent)) {
    return 'iPhone';
  }

  if (/windows/i.test(userAgent)) {
    return 'Windows';
  }

  if (/macintosh|mac os/i.test(userAgent)) {
    return 'Macintosh';
  }

  return 'Other';
}

function summarizeDevice(userAgent: string | undefined) {
  const deviceType = resolveDeviceType(userAgent);

  if (deviceType === 'Unknown') {
    return 'Dispositivo no reportado';
  }

  return deviceType;
}

function computeDeviceMetrics(rows: ParsedAuditRow[]) {
  const counts: DeviceMetrics = {
    Android: 0,
    iPhone: 0,
    Macintosh: 0,
    Windows: 0,
    Other: 0,
    Unknown: 0,
  };

  rows.forEach((row) => {
    const deviceType = resolveDeviceType(row.parsedComments.environment_metadata?.userAgent);
    counts[deviceType] += 1;
  });

  const total = rows.length || 1;
  const percentages = Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, Math.round((value / total) * 100)]),
  ) as DeviceMetrics;

  const baseSegments: DeviceSegment[] = [
    { label: 'Windows', percent: percentages.Windows, className: 'bg-emerald-600 rounded-l-md' },
    { label: 'Macintosh', percent: percentages.Macintosh, className: 'bg-emerald-500' },
    { label: 'iPhone', percent: percentages.iPhone, className: 'bg-sky-500' },
    { label: 'Android', percent: percentages.Android, className: 'bg-amber-500' },
    { label: 'Other', percent: percentages.Other, className: 'bg-slate-400' },
    { label: 'Unknown', percent: percentages.Unknown, className: 'bg-slate-300 rounded-r-md' },
  ];
  const segments = baseSegments.filter((segment) => segment.percent > 0);

  return {
    counts,
    percentages,
    segments,
  };
}

function createSyntheticAuditRow(
  recordUuid: string,
  action: string,
  usuario: string | null,
  timestamp: string | null,
  validationComment: string,
): AuditTrailLifecycleRow | null {
  if (!timestamp) {
    return null;
  }

  return {
    accion: action,
    comentarios: JSON.stringify({
      validation_comments: validationComment,
      rejection_comments: null,
      environment_metadata: {
        source: 'mantenimientos_registros',
        synthetic: true,
      },
    }),
    entity: 'mantenimientos_registros',
    entity_uuid: recordUuid,
    timestamp,
    usuario: usuario ?? 'Operador historico no registrado',
  };
}

function buildSyntheticAuditTrailRows(
  recordUuid: string,
  record: MaintenanceAuditFallbackRecord | null,
): AuditTrailLifecycleRow[] {
  if (!record) {
    return [];
  }

  const creationTimestamp = record.created_at ?? record.executed_at;
  const syntheticRows = [
    createSyntheticAuditRow(
      recordUuid,
      'CREATION',
      record.technician_email ?? record.assigned_technician,
      creationTimestamp,
      'Registro historico reconstruido desde mantenimientos_registros.',
    ),
    createSyntheticAuditRow(
      recordUuid,
      'APPROVE',
      'Supervisor Validado',
      record.supervisor_signed_at,
      'Firma historica de supervisor reconstruida desde mantenimientos_registros.',
    ),
    createSyntheticAuditRow(
      recordUuid,
      'APPROVE',
      'Calidad Validada',
      record.quality_signed_at,
      'Firma historica de calidad reconstruida desde mantenimientos_registros.',
    ),
    createSyntheticAuditRow(
      recordUuid,
      'MANAGEMENT_SEAL',
      record.management_email ?? record.management_signed_by ?? 'Gerencia Validada',
      record.management_signed_at,
      'Sello historico de gerencia reconstruido desde mantenimientos_registros.',
    ),
  ];

  return syntheticRows.filter((row): row is AuditTrailLifecycleRow => Boolean(row));
}

function resolveCurrentStatusLabel(currentStatus: string, record: MaintenanceAuditFallbackRecord | null) {
  if (record?.management_signed_at) {
    return '🔐 CERRADO INMUTABLE';
  }

  if (currentStatus.trim()) {
    return '⏳ EN REVISIÓN';
  }

  return '⏳ EN REVISIÓN';
}

function resolveSpanishActionLabel(action: string | null) {
  const normalizedAction = String(action ?? '').toUpperCase();

  if (normalizedAction.includes('REJECT')) {
    return 'Rechazo con desvío';
  }

  if (normalizedAction.includes('MANAGEMENT_SEAL')) {
    return 'Sello de Gerencia';
  }

  if (normalizedAction.includes('APPROVE') || normalizedAction.includes('SIGN')) {
    return 'Aprobación / Firma';
  }

  if (normalizedAction.includes('CREATION') || normalizedAction.includes('SUBMISSION')) {
    return 'Creación del Registro';
  }

  return action ?? 'Acción registrada';
}

function resolveTimelineRole(row: ParsedAuditRow, index: number) {
  const normalizedAction = String(row.accion ?? '').toUpperCase();

  if (normalizedAction.includes('MANAGEMENT')) {
    return 'Gerencia';
  }

  if (normalizedAction.includes('REJECT')) {
    return 'Revisión con desvío';
  }

  if (normalizedAction.includes('CREATION') || normalizedAction.includes('SUBMISSION') || index === 0) {
    return 'Técnico';
  }

  if (index === 1) {
    return 'Supervisor';
  }

  if (index === 2) {
    return 'Calidad';
  }

  if (index >= 3) {
    return 'Gerencia';
  }

  return 'Evento GxP';
}

function buildTimelineEntries(rows: ParsedAuditRow[]): TimelineEntry[] {
  return rows.map((row, index) => {
    const userAgent = row.parsedComments.environment_metadata?.userAgent;
    const isRejected = String(row.accion ?? '').toUpperCase().includes('REJECT');

    return {
      actionLabel: resolveSpanishActionLabel(row.accion),
      comment: row.evidenceComment,
      device: summarizeDevice(userAgent),
      isRejected,
      operator: row.usuario ?? 'Operador no registrado',
      roleLabel: resolveTimelineRole(row, index),
      timestamp: formatDateTime(row.timestamp),
    };
  });
}

function resolveLegalMeaning(entry: TimelineEntry) {
  if (entry.isRejected) {
    return 'Evento de rechazo documentado como desviacion controlada. Requiere trazabilidad completa, revision humana y cierre de acciones antes de liberacion documental.';
  }

  if (entry.roleLabel === 'TÃ©cnico' || entry.roleLabel === 'Técnico') {
    return 'Ejecucion tecnica atribuible: el operador declara la captura inicial del registro y sus evidencias asociadas bajo principios ALCOA+.';
  }

  if (entry.roleLabel === 'Supervisor') {
    return 'Revision tecnica independiente: el supervisor confirma consistencia operativa, completitud del RUI y continuidad del flujo de validacion.';
  }

  if (entry.roleLabel === 'Calidad') {
    return 'Dictamen QA: Aseguramiento de Calidad verifica cumplimiento regulatorio y aptitud documental para liberacion GxP.';
  }

  if (entry.roleLabel === 'Gerencia') {
    return 'Sello institucional: Gerencia formaliza la aceptacion ejecutiva del registro cerrado como evidencia controlada.';
  }

  return 'Evento GxP registrado en la bitacora oficial con atribucion, timestamp y trazabilidad documental.';
}

function normalizeObservationComment(comment: string | null | undefined) {
  return String(comment ?? '').trim();
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 p-5" aria-label="Cargando bitácora de auditoría">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
        <div className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      </div>
      <div className="h-44 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    </div>
  );
}

export function AuditLifecycleSheet({
  assetMetadata,
  currentStatus,
  fallbackRecord,
  recordCode,
  recordUuid,
}: AuditLifecycleSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawRows, setRawRows] = useState<AuditTrailLifecycleRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetUuid = recordUuid.trim();
  const currentStatusLabel = resolveCurrentStatusLabel(currentStatus, fallbackRecord);
  const currentStatusBadgeClass = fallbackRecord?.management_signed_at
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isCancelled = false;

    async function loadAuditRows() {
      setIsLoading(true);
      setErrorMessage(null);

      if (ENABLE_SUPERADMIN_DEBUG_LOGS) {
        console.log('[FRONTEND AUDIT SHEET FETCH START]', {
          activeUuid: targetUuid,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const result = await fetchAuditTrailLifecycleAction(targetUuid);

        if (isCancelled) {
          return;
        }

        if (!result.ok) {
          setRawRows([]);
          setErrorMessage(CONNECTION_ERROR_MESSAGE);
          return;
        }

        setRawRows(result.rows ?? []);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (ENABLE_SUPERADMIN_DEBUG_LOGS) {
          console.error('[FRONTEND AUDIT SHEET FETCH ERROR]', {
            activeUuid: targetUuid,
            error: error instanceof Error ? error.message : 'unknown_error',
          });
        }

        setRawRows([]);
        setErrorMessage(CONNECTION_ERROR_MESSAGE);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAuditRows();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, targetUuid]);

  const syntheticRows = useMemo(
    () => buildSyntheticAuditTrailRows(targetUuid, fallbackRecord),
    [fallbackRecord, targetUuid],
  );
  const reconciledRows = rawRows.length > 0 ? rawRows : syntheticRows;

  const mappedRows = useMemo<ParsedAuditRow[]>(
    () =>
      reconciledRows
        .map((row, index) => {
          const parsedComments = parseAuditComments(row.comentarios, index);
          const evidenceComment =
            parsedComments.rejection_comments ??
            parsedComments.validation_comments ??
            parsedComments.rawText ??
            '';

          return {
            ...row,
            evidenceComment,
            parsedComments,
            timeMs: row.timestamp ? new Date(row.timestamp).getTime() : 0,
          };
        })
        .sort((left, right) => left.timeMs - right.timeMs),
    [reconciledRows],
  );

  const firstTimestamp = mappedRows[0]?.timestamp ?? null;
  const lastTimestamp = mappedRows.at(-1)?.timestamp ?? null;
  const cycleHours = computeCycleHours(firstTimestamp, lastTimestamp);
  const cycleLabel = formatCycleHours(cycleHours);
  const rejectionCount = mappedRows.filter((row) =>
    String(row.accion ?? '').toUpperCase().includes('REJECT'),
  ).length;
  const deviceMetricsObject = useMemo(() => computeDeviceMetrics(mappedRows), [mappedRows]);
  const authorizedDevicePercent = 100 - deviceMetricsObject.percentages.Unknown;
  const donutProgress = mappedRows.length > 0 ? Math.min(100, Math.max(8, Math.round(cycleHours * 4))) : 0;
  const donutCircumference = 2 * Math.PI * 44;
  const donutOffset = donutCircumference - (donutProgress / 100) * donutCircumference;
  const timelineEntries = useMemo(() => buildTimelineEntries(mappedRows), [mappedRows]);

  useEffect(() => {
    if (!isOpen || isLoading || errorMessage) {
      return;
    }

    if (ENABLE_SUPERADMIN_DEBUG_LOGS) {
      console.log('🔬 [FRONTEND AUDIT SHEET LIVE DATA]', {
        activeUuid: targetUuid,
        rowCount: rawRows?.length || 0,
        devicesMap: deviceMetricsObject,
      });
      console.log('🔮 [RECONCILIACIÓN HÍBRIDA TRAIL GxP]', {
        recordUuid,
        reconciledSynthetically: rawRows?.length === 0,
        finalComputedStatus: fallbackRecord?.management_signed_at ? 'CLOSED' : 'IN_PROGRESS',
      });
    }
  }, [
    deviceMetricsObject,
    errorMessage,
    fallbackRecord?.management_signed_at,
    isLoading,
    isOpen,
    rawRows,
    recordUuid,
    targetUuid,
  ]);

  return (
    <>
      <button
        className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 print:hidden"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <BarChart3 aria-hidden="true" className="h-4 w-4 text-emerald-700" />
        Ver Métricas de Ciclo de Vida
      </button>

      {isOpen ? (
        <div
          aria-label="Hoja forense de ciclo de vida y auditoría"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm print:hidden"
          onClick={() => setIsOpen(false)}
          role="dialog"
        >
          <div
            className="max-w-[89vw] w-full h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Hoja Forense de Ciclo de Vida
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Métricas de Ciclo de Vida Regulado
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Fuente exclusiva: public.audit_trail {targetUuid ? `(${targetUuid})` : ''}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Estado Actual
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${currentStatusBadgeClass}`}>
                    {currentStatusLabel}
                  </span>
                </div>
              </div>
              <button
                aria-label="Cerrar métricas de ciclo de vida"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </header>

            {isLoading ? <LoadingSkeleton /> : null}

            {!isLoading && errorMessage ? (
              <div className="p-5">
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-800">
                  {errorMessage}
                </div>
              </div>
            ) : null}

            {!isLoading && !errorMessage && mappedRows.length === 0 ? (
              <div className="p-5">
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-bold text-slate-600">
                  {EMPTY_AUDIT_MESSAGE}
                </div>
              </div>
            ) : null}

            {!isLoading && !errorMessage && mappedRows.length > 0 ? (
              <div className="grid gap-5 p-5 lg:grid-cols-[35fr_65fr]">
                <aside className="grid content-start gap-4">
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                      Información del Registro
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div>
                        <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">RUI UUID</dt>
                        <dd className="mt-1 break-all font-mono text-xs font-bold text-slate-900">{targetUuid}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">Código de Registro</dt>
                        <dd className="mt-1 font-bold text-slate-900">{recordCode ?? 'Sin código registrado'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">Datos del Activo</dt>
                        <dd className="mt-1 font-bold text-slate-900">
                          {assetMetadata.assetName ?? 'Activo no disponible'}
                        </dd>
                        <dd className="text-xs font-semibold text-slate-600">
                          {assetMetadata.assetCode ?? 'Código no disponible'}
                        </dd>
                        <dd className="text-xs font-semibold text-slate-600">
                          {assetMetadata.locationArea ?? 'Ubicación no disponible'}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Dispositivos Autorizados
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {authorizedDevicePercent}% de eventos con dispositivo identificado
                        </p>
                      </div>
                      <Monitor aria-hidden="true" className="h-8 w-8 text-emerald-700" />
                    </div>
                    <div className="mt-4 h-4 overflow-hidden rounded-md bg-slate-200" aria-hidden="true">
                      <div className="flex h-full">
                        {deviceMetricsObject.segments.map((segment) => (
                          <div
                            className={segment.className}
                            key={segment.label}
                            style={{ width: `${segment.percent}%` }}
                            title={`${segment.label}: ${segment.percent}%`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
                      {Object.entries(deviceMetricsObject.percentages).map(([label, percent]) => (
                        <span key={label}>
                          {label}: {percent}%
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Tiempo Total de Ciclo
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-950">{cycleLabel}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {mappedRows.length} eventos auditados, {rejectionCount} desvío(s)
                        </p>
                      </div>
                      <svg aria-label="Indicador circular de tiempo total de ciclo" className="h-28 w-28" viewBox="0 0 112 112">
                        <circle cx="56" cy="56" fill="transparent" r="44" stroke="#E2E8F0" strokeWidth="12" />
                        <circle
                          cx="56"
                          cy="56"
                          fill="transparent"
                          r="44"
                          stroke={rejectionCount > 0 ? '#DC2626' : '#10B981'}
                          strokeDasharray={donutCircumference}
                          strokeDashoffset={donutOffset}
                          strokeLinecap="round"
                          strokeWidth="12"
                          transform="rotate(-90 56 56)"
                        />
                        <text className="fill-slate-900 text-sm font-black" dominantBaseline="middle" textAnchor="middle" x="56" y="52">
                          {cycleLabel}
                        </text>
                        <text className="fill-slate-500 text-[9px] font-bold" dominantBaseline="middle" textAnchor="middle" x="56" y="68">
                          ciclo
                        </text>
                      </svg>
                    </div>
                  </section>
                </aside>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Bitácora Vertical de Firmas
                      </p>
                      <h3 className="mt-1 text-base font-black text-slate-950">
                        Flujo de validación humana y comentarios GxP
                      </h3>
                    </div>
                    <ShieldCheck aria-hidden="true" className="h-7 w-7 text-emerald-700" />
                  </div>

                  <ol className="mt-5 space-y-5 border-l-2 border-emerald-500 pl-5">
                    {timelineEntries.map((entry, index) => (
                      <li className="relative" key={`${entry.timestamp}-${entry.operator}-${index}`}>
                        <span
                          className={`absolute -left-[30px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-4 border-white ${
                            entry.isRejected ? 'bg-red-600' : 'bg-emerald-600'
                          }`}
                          aria-hidden="true"
                        />
                        <article
                          className={`rounded-xl border p-4 ${
                            entry.isRejected ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <span
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase ${
                                  entry.isRejected
                                    ? 'border-red-200 bg-white text-red-700'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {entry.isRejected ? (
                                  <TriangleAlert aria-hidden="true" className="h-4 w-4" />
                                ) : (
                                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                                )}
                                {entry.roleLabel}: {entry.operator}
                              </span>
                              <p className="mt-2 text-sm font-black text-slate-950">{entry.actionLabel}</p>
                            </div>
                            <time className="font-mono text-xs font-bold text-slate-600">{entry.timestamp}</time>
                          </div>

                          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-100 p-3 text-slate-700">
                            <p className="text-[11px] font-black uppercase tracking-wide">
                              GXP LEGAL MEANING
                            </p>
                            <p className="mt-1 text-sm font-semibold leading-6">
                              {resolveLegalMeaning(entry)}
                            </p>
                          </div>

                          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-slate-700">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                              COMENTARIO GXP / OBSERVACIONES
                            </p>
                            {normalizeObservationComment(entry.comment) ? (
                              <p className="mt-1 text-sm font-semibold leading-6">
                                {normalizeObservationComment(entry.comment)}
                              </p>
                            ) : (
                              <p className="mt-1 text-sm italic leading-6 text-slate-400">
                                Sin observaciones documentadas.
                              </p>
                            )}
                          </div>

                          <p className="mt-3 text-xs font-semibold text-slate-500">
                            Dispositivo: {entry.device}
                          </p>
                        </article>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
