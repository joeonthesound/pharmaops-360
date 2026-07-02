'use client';

import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Monitor, ShieldCheck, TriangleAlert, X } from 'lucide-react';

export type AuditTrailRow = {
  accion: string | null;
  comentarios: string | null;
  entity: string | null;
  entity_uuid: string | null;
  timestamp: string | null;
  usuario: string | null;
};

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

type AuditLifecycleSheetProps = {
  auditRows: AuditTrailRow[];
  recordUuid: string | null;
};

function parseAuditComments(rawValue: string | null): ParsedAuditComments & { rawText?: string } {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ParsedAuditComments;
    }

    return { rawText: rawValue };
  } catch {
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

function formatCycleTime(start: string | null, end: string | null) {
  if (!start || !end) {
    return '0h';
  }

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return '0h';
  }

  const totalMinutes = Math.round((endMs - startMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
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

function summarizeDevice(userAgent: string | undefined) {
  if (!userAgent) {
    return 'Dispositivo no reportado';
  }

  if (/windows/i.test(userAgent)) {
    return 'Windows Workstation';
  }

  if (/iphone|ipad|android/i.test(userAgent)) {
    return 'Mobile Device';
  }

  if (/mac os|macintosh/i.test(userAgent)) {
    return 'macOS Workstation';
  }

  return 'Browser Client';
}

export function AuditLifecycleSheet({ auditRows, recordUuid }: AuditLifecycleSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const mappedRows = useMemo(
    () =>
      auditRows
        .map((row) => {
          const parsedComments = parseAuditComments(row.comentarios);
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
    [auditRows],
  );

  const firstTimestamp = mappedRows[0]?.timestamp ?? null;
  const lastTimestamp = mappedRows.at(-1)?.timestamp ?? null;
  const cycleLabel = formatCycleTime(firstTimestamp, lastTimestamp);
  const rejectionCount = mappedRows.filter((row) =>
    String(row.accion ?? '').toUpperCase().includes('REJECT'),
  ).length;
  const rowsWithDevice = mappedRows.filter(
    (row) => typeof row.parsedComments.environment_metadata?.userAgent === 'string',
  ).length;
  const deviceCoverage = mappedRows.length > 0 ? Math.round((rowsWithDevice / mappedRows.length) * 100) : 0;
  const donutProgress = Math.min(92, Math.max(12, mappedRows.length * 18));
  const donutCircumference = 2 * Math.PI * 44;
  const donutOffset = donutCircumference - (donutProgress / 100) * donutCircumference;

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
                  Fuente exclusiva: public.audit_trail {recordUuid ? `(${recordUuid})` : ''}
                </p>
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

            <div className="grid gap-4 p-5">
              <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Authorized Devices
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {rowsWithDevice} de {mappedRows.length} eventos con metadata ambiental verificable
                      </p>
                    </div>
                    <Monitor aria-hidden="true" className="h-8 w-8 text-emerald-700" />
                  </div>
                  <div className="mt-4 h-4 overflow-hidden rounded-md bg-slate-200" aria-hidden="true">
                    <div className="flex h-full">
                      <div
                        className="rounded-l-md bg-emerald-600"
                        style={{ width: `${deviceCoverage}%` }}
                      />
                      <div
                        className="rounded-r-md bg-slate-300"
                        style={{ width: `${100 - deviceCoverage}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>{deviceCoverage}% con userAgent</span>
                    <span>{100 - deviceCoverage}% sin metadata</span>
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
                        {donutProgress}%
                      </text>
                      <text
                        className="fill-slate-500 text-[9px] font-bold"
                        dominantBaseline="middle"
                        textAnchor="middle"
                        x="56"
                        y="68"
                      >
                        auditado
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
                    {mappedRows.length > 0 ? (
                      mappedRows.map((row, index) => {
                        const tone = resolveActionTone(row.accion);

                        return (
                          <div className="relative flex items-center" key={`${row.timestamp}-${row.accion}-${index}`}>
                            <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center gap-2">
                                <span className={`h-3 w-3 rounded-full ${tone.dot}`} />
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${tone.badge}`}>
                                  {tone.icon}
                                  {row.accion ?? 'SIN_ACCION'}
                                </span>
                              </div>
                              <p className="mt-3 truncate text-xs font-bold text-slate-900">
                                {row.usuario ?? 'Operador no registrado'}
                              </p>
                              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                                {formatDateTime(row.timestamp)}
                              </p>
                            </div>
                            {index < mappedRows.length - 1 ? (
                              <svg aria-hidden="true" className="mx-2 h-12 w-16 shrink-0" viewBox="0 0 64 48">
                                <path
                                  className={tone.line}
                                  d="M2 24 C20 4, 42 4, 62 24"
                                  fill="none"
                                  strokeWidth="3"
                                />
                                <path d="M55 18 L62 24 L55 30" fill="none" stroke="#334155" strokeWidth="2" />
                              </svg>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
                        Sin eventos en public.audit_trail para este registro.
                      </div>
                    )}
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
                      {mappedRows.length === 0 ? (
                        <tr>
                          <td className="px-3 py-5 text-center text-sm font-semibold text-slate-500" colSpan={5}>
                            No hay filas de auditoría para mostrar.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
