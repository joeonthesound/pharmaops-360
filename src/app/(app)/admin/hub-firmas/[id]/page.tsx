import Link from 'next/link';
import { ArrowLeft, FileSignature, Network, ShieldAlert } from 'lucide-react';
import {
  approveChangeControlAction,
  fetchChangeControlReview,
  rejectChangeControlAction,
  type JsonObject,
} from '@/modules/activos/actions/qa-signoff.actions';

type QaReviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function renderJsonValue(value: unknown) {
  if (value === null || typeof value === 'undefined') {
    return 'null';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function JsonDiffPanel({
  borderClassName,
  data,
  title,
}: {
  borderClassName: string;
  data: JsonObject;
  title: string;
}) {
  const entries = Object.entries(data);

  return (
    <section className={`rounded-lg border bg-white p-5 shadow-sm ${borderClassName}`}>
      <h2 className="font-mono text-sm font-black uppercase tracking-wide text-slate-900">
        {title}
      </h2>
      <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
        {entries.length > 0 ? (
          entries.map(([key, value]) => (
            <div className="grid gap-2 border-b border-slate-100 p-3 last:border-b-0 md:grid-cols-[220px_1fr]" key={key}>
              <dt className="font-mono text-xs font-black uppercase tracking-wide text-slate-500">
                {key}
              </dt>
              <dd className="break-words font-mono text-sm font-bold text-slate-800">
                {renderJsonValue(value)}
              </dd>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm font-bold text-slate-500">Sin datos JSONB registrados.</p>
        )}
      </div>
    </section>
  );
}

function getMetadataString(metadata: JsonObject, key: string) {
  const value = metadata[key];

  return typeof value === 'string' && value.trim() ? value.trim() : 'No disponible';
}

export default async function QaReviewPage({ params }: QaReviewPageProps) {
  const resolvedParams = await params;
  const { row, error } = await fetchChangeControlReview(resolvedParams.id);

  if (error || !row) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <div className="w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6">
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h1 className="mt-3 text-2xl font-black text-slate-950">
              Solicitud no localizada
            </h1>
            <p className="mt-2 text-sm font-semibold text-amber-950">
              {error?.message ?? 'No existe un control de cambios para el identificador solicitado.'}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6">
        <header className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              className="mr-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
              href="/admin/hub-firmas"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
              Volver al Hub
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <FileSignature aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-700" />
                Revisión y Firma Electrónica QA
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-normal text-slate-950 md:text-5xl">
                Control de cambio {row.id}
              </h1>
            </div>
            <div className="grid gap-2 text-left lg:text-right">
              <p className="font-mono text-xs font-black uppercase tracking-wide text-slate-500">
                ASSET_ID NUMERIC:{row.asset_id}
              </p>
              <p className="font-mono text-xs font-black uppercase tracking-wide text-indigo-700">
                STATUS_CONTROL:{row.status_control}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <JsonDiffPanel
            borderClassName="border-slate-300 border-t-4 border-t-slate-700"
            data={row.datos_anteriores}
            title="datos_anteriores"
          />
          <JsonDiffPanel
            borderClassName="border-indigo-300 border-t-4 border-t-indigo-700"
            data={row.datos_nuevos}
            title="datos_nuevos"
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
              Justificación técnica
            </h2>
            <p className="mt-3 whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-800">
              {row.justificacion_tecnica}
            </p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-700">
              <Network aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-700" />
              Metadata seguridad
            </h2>
            <dl className="mt-3 grid gap-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <dt className="font-mono text-[11px] font-black uppercase tracking-wide text-slate-500">
                  IP
                </dt>
                <dd className="mt-1 break-words font-mono text-sm font-bold text-slate-800">
                  {getMetadataString(row.metadata_seguridad, 'ip')}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <dt className="font-mono text-[11px] font-black uppercase tracking-wide text-slate-500">
                  User-Agent
                </dt>
                <dd className="mt-1 break-words font-mono text-sm font-bold text-slate-800">
                  {getMetadataString(row.metadata_seguridad, 'userAgent')}
                </dd>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <dt className="font-mono text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Timestamp
                </dt>
                <dd className="mt-1 break-words font-mono text-sm font-bold text-slate-800">
                  {getMetadataString(row.metadata_seguridad, 'timestamp')}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="mt-5 rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-700">
            <ShieldAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-red-700" />
            Bloque de firma electronica 21 CFR Part 11
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <form action={approveChangeControlAction}>
              <input name="change_control_id" type="hidden" value={row.id} />
              <button
                className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-800"
                type="submit"
              >
                Firmar y Aprobar Cambio GxP
              </button>
            </form>

            <form action={rejectChangeControlAction} className="grid gap-3">
              <input name="change_control_id" type="hidden" value={row.id} />
              <textarea
                className="min-h-24 rounded-md border border-red-200 bg-red-50/60 px-3 py-3 text-sm font-semibold text-red-950 outline-none transition focus:border-red-700 focus:ring-2 focus:ring-red-100"
                minLength={15}
                name="rejection_comment"
                placeholder="Comentario obligatorio de rechazo"
                required
              />
              <button
                className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-red-700 px-5 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-red-800"
                type="submit"
              >
                Rechazar Desviación
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
