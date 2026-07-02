import Link from 'next/link';

type DashboardPageProps = {
  searchParams?: Promise<{
    order_created?: string;
    record?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const orderCreated = resolvedSearchParams.order_created === '1';
  const createdRecordUuid = String(resolvedSearchParams.record ?? '');

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              PharmaOps 360
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Vista general de acceso. Las ordenes HVAC se consultan desde su ruta de planta
              dedicada para mantener aislados los filtros por rol y estado.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            href="/mantenimiento/hvac/rui/activo"
          >
            Abrir planta HVAC
          </Link>
        </header>

        {orderCreated ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
            Orden de mantenimiento generada correctamente en Fase 1: Tecnico.
            {createdRecordUuid ? (
              <span className="ml-1 font-mono text-xs text-emerald-800">
                {createdRecordUuid}
              </span>
            ) : null}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Modulo activo
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">HVAC</p>
            <p className="mt-1 text-sm text-slate-600">
              Ruta segregada para inspeccion tecnica, revision y cierre GxP.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Aislamiento
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">Por rol</p>
            <p className="mt-1 text-sm text-slate-600">
              Tecnico, Supervisor, Calidad y Gerencia cargan allow-lists independientes.
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Historial
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">Cerrado</p>
            <p className="mt-1 text-sm text-slate-600">
              Solo registros aprobados o pendientes de gerencia en la ruta dedicada.
            </p>
          </article>
        </section>
      </section>
    </main>
  );
}
