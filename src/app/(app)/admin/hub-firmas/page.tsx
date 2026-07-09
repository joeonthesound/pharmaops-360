import Link from 'next/link';
import { FileCheck2, ShieldCheck } from 'lucide-react';
import {
  fetchPendingChangeControls,
  type ChangeControlReviewRow,
} from '@/modules/activos/actions/qa-signoff.actions';

function StampBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs font-black uppercase tracking-wide text-white shadow-sm">
      [{label}: {value}]
    </span>
  );
}

function getJsonStringValue(source: Record<string, unknown>, key: string) {
  const value = source[key];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveAssetReference(row: ChangeControlReviewRow) {
  return (
    getJsonStringValue(row.datos_nuevos, 'asset_code') ??
    getJsonStringValue(row.datos_anteriores, 'asset_code') ??
    `ASSET_ID:${row.asset_id}`
  );
}

function resolveRequestTimestamp(row: ChangeControlReviewRow) {
  const metadataTimestamp = getJsonStringValue(row.metadata_seguridad, 'timestamp');
  const rawTimestamp = row.creado_at ?? metadataTimestamp;

  if (!rawTimestamp) {
    return 'Timestamp no disponible';
  }

  const date = new Date(rawTimestamp);

  return Number.isNaN(date.getTime())
    ? rawTimestamp
    : `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

export default async function QaSignoffHubPage() {
  const { rows, error } = await fetchPendingChangeControls();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6">
        <header className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap justify-end gap-2">
            <StampBadge label="FORM_ID" value="FOR-QA-SIGNOFF" />
            <StampBadge label="SCREEN_ID" value="SCREEN-QA-SIGNOFF-01" />
          </div>
          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-700" />
                Hub de Firmas QA / Supervisor
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-normal text-slate-950 md:text-5xl">
                Validacion GxP de controles de cambio
              </h1>
            </div>
            <span className="inline-flex w-fit rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-xs font-black uppercase tracking-wide text-emerald-800">
              PENDIENTES:{rows.length}
            </span>
          </div>
        </header>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-700">
              <FileCheck2 aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-700" />
              Cola de solicitudes pendientes
            </h2>
          </div>

          {error ? (
            <div className="m-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-900">
              No fue posible cargar la cola QA: {error.message}
            </div>
          ) : null}

          {!error && rows.length === 0 ? (
            <div className="m-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-bold text-slate-600">
              No existen controles de cambio pendientes de firma.
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="overflow-hidden">
              <div className="hidden grid-cols-[1fr_1.6fr_1fr_180px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500 lg:grid">
                <span>Asset Reference</span>
                <span>Operator UUID</span>
                <span>Request Date (UTC)</span>
                <span className="text-right">Operacion</span>
              </div>
              <div className="divide-y divide-slate-200">
                {rows.map((row) => (
                  <article
                    className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_1.6fr_1fr_180px] lg:items-center"
                    key={row.id}
                  >
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 lg:hidden">
                        Asset Reference
                      </p>
                      <p className="font-mono text-sm font-black text-slate-950">
                        {resolveAssetReference(row)}
                      </p>
                      <p className="font-mono text-xs font-bold text-slate-500">
                        ASSET_ID:{row.asset_id}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 lg:hidden">
                        Operator UUID
                      </p>
                      <p className="truncate font-mono text-sm font-bold text-slate-700">
                        {row.creado_por}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 lg:hidden">
                        Request Date (UTC)
                      </p>
                      <p className="font-mono text-sm font-bold text-slate-700">
                        {resolveRequestTimestamp(row)}
                      </p>
                    </div>
                    <div className="flex justify-start lg:justify-end">
                      <Link
                        className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-black text-white transition hover:bg-slate-800"
                        href={`/admin/hub-firmas/${encodeURIComponent(row.id)}`}
                      >
                        Revisar Auditoría Forense
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
