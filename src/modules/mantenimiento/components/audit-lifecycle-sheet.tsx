'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Monitor, ShieldCheck, TriangleAlert, X } from 'lucide-react';
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
  currentStatus: string;
  fallbackRecord: MaintenanceAuditFallbackRecord | null;
  recordUuid: string;
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

type LifecycleStep = {
  actionHint: string;
  completed: boolean;
  label: string;
  timestamp: string | null;
  tone: 'active' | 'approved' | 'pending' | 'rejected';
  usuario: string | null;
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

function resolveActionTone(action: string | null) {
  const normalizedAction = String(action ?? '').toUpperCase();

  if (normalizedAction.includes('REJECT')) {
    return {
      badge: 'border-red-200 bg-red-50 text-red-700',
      dot: 'bg-red-600',
      line: 'stroke-red-600',
      icon: <TriangleAlert aria-hidden="true" className="h-4 w-4" />,
    };
  }

  if (normalizedAction.includes('SUBMISSION') || normalizedAction.includes('APPROVE')) {
    return {
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-600',
      line: 'stroke-emerald-600',
      icon: <CheckCircle2 aria-hidden="true" className="h-4 w-4" />,
    };
  }

  return {
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    line: 'stroke-amber-500',
    icon: <Clock3 aria-hidden="true" className="h-4 w-4" />,
  };
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

function normalizeDisplayStatus(status: string) {
  const normalizedStatus = String(status || '').trim().toUpperCase();

  return normalizedStatus || 'SIN_ESTADO';
}

function resolveCurrentStatusLabel(currentStatus: string, record: MaintenanceAuditFallbackRecord | null) {
  if (record?.management_signed_at) {
    return '🔐 CERRADO INMUTABLE';
  }

  return normalizeDisplayStatus(currentStatus);
}

function findFirstAction(rows: ParsedAuditRow[], pattern: RegExp) {
  return rows.find((row) => pattern.test(String(row.accion ?? '').toUpperCase())) ?? null;
}

function buildLifecycleSteps(rows: ParsedAuditRow[], currentStatus: string): LifecycleStep[] {
  const normalizedStatus = normalizeDisplayStatus(currentStatus);
  const submissionRow = findFirstAction(rows, /SUBMISSION|SUBMIT|DRAFT|CREATE|ADD/);
  const approvalRows = rows.filter((row) =>
    /APPROVE|SIGN|VALID|MANAGEMENT_SEAL/.test(String(row.accion ?? '').toUpperCase()),
  );
  const rejectionRow = findFirstAction(rows, /REJECT/);
  const stepDefinitions = [
    {
      actionHint: 'Confeccion tecnica',
      label: 'DRAFT',
      row: submissionRow ?? rows[0] ?? null,
      completed: rows.length > 0,
    },
    {
      actionHint: 'Firma Supervisor',
      label: 'PENDING_SUPERVISOR',
      row: approvalRows[0] ?? null,
      completed: approvalRows.length >= 1,
    },
    {
      actionHint: 'Firma Calidad',
      label: 'PENDING_QUALITY',
      row: approvalRows[1] ?? null,
      completed: approvalRows.length >= 2,
    },
    {
      actionHint: 'Cierre Gerencia',
      label: 'PENDING_MANAGEMENT',
      row: approvalRows[2] ?? null,
      completed: approvalRows.length >= 3 || /APPROVED|CLOSED/.test(normalizedStatus),
    },
  ];

  const baseSteps = stepDefinitions.map((step): LifecycleStep => {
    const isActive = normalizedStatus === step.label;

    return {
      actionHint: step.actionHint,
      completed: step.completed,
      label: step.label,
      timestamp: step.row?.timestamp ?? null,
      tone: isActive ? 'active' : step.completed ? 'approved' : 'pending',
      usuario: step.row?.usuario ?? null,
    };
  });

  if (rejectionRow) {
    baseSteps.push({
      actionHint: 'Desvio documentado',
      completed: true,
      label: 'REJECT_WITH_DEVIATION',
      timestamp: rejectionRow.timestamp,
      tone: 'rejected',
      usuario: rejectionRow.usuario ?? null,
    });
  }

  return baseSteps;
}

function resolveStepClasses(tone: LifecycleStep['tone']) {
  if (tone === 'rejected') {
    return {
      badge: 'border-red-200 bg-red-50 text-red-700',
      dot: 'bg-red-600',
      line: 'stroke-red-600',
      node: 'border-red-200 bg-red-50',
    };
  }

  if (tone === 'approved') {
    return {
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-600',
      line: 'stroke-emerald-600',
      node: 'border-emerald-200 bg-emerald-50',
    };
  }

  if (tone === 'active') {
    return {
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
      line: 'stroke-amber-500',
      node: 'border-amber-200 bg-amber-50',
    };
  }

  return {
    badge: 'border-slate-200 bg-slate-50 text-slate-500',
    dot: 'bg-slate-300',
    line: 'stroke-slate-300',
    node: 'border-slate-200 bg-white',
  };
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
  currentStatus,
  fallbackRecord,
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
            'Sin comentarios registrados';

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
  const lifecycleSteps = useMemo(
    () => buildLifecycleSteps(mappedRows, currentStatusLabel),
    [currentStatusLabel, mappedRows],
  );

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
          aria-label="Forensic Lifecycle and Audit Sheet"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm print:hidden"
          onClick={() => setIsOpen(false)}
          role="dialog"
        >
          <div
            className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Forensic Lifecycle & Audit Sheet
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Métricas de ciclo de vida regulado
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
              <div className="grid gap-4 p-5">
                <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Authorized Devices
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
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3">
                      {Object.entries(deviceMetricsObject.percentages).map(([label, percent]) => (
                        <span key={label}>
                          {label}: {percent}%
                        </span>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Total Cycle Time
                        </p>
                        <p className="mt-2 text-3xl font-black text-slate-950">{cycleLabel}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {mappedRows.length} eventos auditados, {rejectionCount} desvío(s)
                        </p>
                      </div>
                      <svg aria-label="Indicador circular de ciclo total" className="h-28 w-28" viewBox="0 0 112 112">
                        <circle
                          cx="56"
                          cy="56"
                          fill="transparent"
                          r="44"
                          stroke="#E2E8F0"
                          strokeWidth="12"
                        />
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
                        <text
                          className="fill-slate-900 text-sm font-black"
                          dominantBaseline="middle"
                          textAnchor="middle"
                          x="56"
                          y="52"
                        >
                          {cycleLabel}
                        </text>
                        <text
                          className="fill-slate-500 text-[9px] font-bold"
                          dominantBaseline="middle"
                          textAnchor="middle"
                          x="56"
                          y="68"
                        >
                          ciclo
                        </text>
                      </svg>
                    </div>
                  </article>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Sankey / Timeline Flowchart
                      </p>
                      <h3 className="mt-1 text-base font-black text-slate-950">
                        Flujo de acciones humanas y desvíos
                      </h3>
                    </div>
                    <ShieldCheck aria-hidden="true" className="h-7 w-7 text-emerald-700" />
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <div className="grid min-w-[720px] grid-flow-col auto-cols-fr items-center gap-3">
                      {lifecycleSteps.map((step, index) => {
                        const stepClasses = resolveStepClasses(step.tone);

                        return (
                          <div className="relative flex items-center" key={`${step.label}-${index}`}>
                            <div className={`min-w-0 rounded-xl border p-3 ${stepClasses.node}`}>
                              <div className="flex items-center gap-2">
                                <span className={`h-3 w-3 rounded-full ${stepClasses.dot}`} />
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${stepClasses.badge}`}>
                                  {step.tone === 'rejected' ? (
                                    <TriangleAlert aria-hidden="true" className="h-4 w-4" />
                                  ) : step.completed ? (
                                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                                  ) : (
                                    <Clock3 aria-hidden="true" className="h-4 w-4" />
                                  )}
                                  {step.label}
                                </span>
                              </div>
                              <p className="mt-3 text-xs font-black text-slate-900">
                                {step.actionHint}
                              </p>
                              <p className="mt-3 truncate text-xs font-bold text-slate-900">
                                {step.usuario ?? 'Operador pendiente'}
                              </p>
                              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                {step.timestamp ? formatDateTime(step.timestamp) : 'Sin firma registrada'}
                              </p>
                            </div>
                            {index < lifecycleSteps.length - 1 ? (
                              <svg aria-hidden="true" className="mx-2 h-12 w-16 shrink-0" viewBox="0 0 64 48">
                                <path
                                  className={stepClasses.line}
                                  d="M2 24 C20 4, 42 4, 62 24"
                                  fill="none"
                                  strokeWidth="3"
                                />
                                <path d="M55 18 L62 24 L55 30" fill="none" stroke="#334155" strokeWidth="2" />
                              </svg>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Bottom Trail Log
                  </p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Operator</th>
                          <th className="px-3 py-2">Action</th>
                          <th className="px-3 py-2">Comments</th>
                          <th className="px-3 py-2">Device</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {mappedRows.map((row, index) => {
                          const tone = resolveActionTone(row.accion);
                          const userAgent = row.parsedComments.environment_metadata?.userAgent;

                          return (
                            <tr key={`${row.timestamp}-${row.usuario}-${index}`} className="align-top">
                              <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-700">
                                {formatDateTime(row.timestamp)}
                              </td>
                              <td className="px-3 py-3 font-semibold text-slate-900">
                                {row.usuario ?? 'N/A'}
                              </td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${tone.badge}`}>
                                  {row.accion ?? 'SIN_ACCION'}
                                </span>
                              </td>
                              <td className="max-w-md px-3 py-3 text-slate-700">
                                {row.evidenceComment}
                              </td>
                              <td className="px-3 py-3 text-xs font-semibold text-slate-500">
                                {summarizeDevice(userAgent)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
