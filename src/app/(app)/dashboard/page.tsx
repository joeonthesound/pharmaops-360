import Link from 'next/link';

type DashboardPageProps = {
  searchParams?: Promise<{
    order_created?: string;
    record?: string;
  }>;
};

type ExecutiveMetric = {
  detail: string;
  label: string;
  tone: string;
  value: string;
};

type ValidationQueue = {
  count: number;
  href: string;
  label: string;
  owner: string;
  tone: string;
};

type MasterOperationalStats = {
  complianceRate: number;
  generatedAt: string;
  openRuis: number;
  pendingQuality: number;
  pendingSupervisor: number;
  plantAreasOnline: number;
  validationQueues: ValidationQueue[];
};

async function fetchMasterOperationalStats(): Promise<MasterOperationalStats> {
  /*
   * This mock adapter keeps the dashboard independent from the data layer.
   * Replace this function with Supabase aggregate counts when the canonical
   * status taxonomy is finalized across plant areas.
   */
  return {
    complianceRate: 96.8,
    generatedAt: new Date().toISOString(),
    openRuis: 31,
    pendingQuality: 8,
    pendingSupervisor: 14,
    plantAreasOnline: 4,
    validationQueues: [
      {
        count: 14,
        href: '/mantenimiento/hvac/rui/enviado',
        label: 'Revision supervisor',
        owner: 'Supervisor de mantenimiento',
        tone: 'border-amber-200 bg-amber-50 text-amber-950',
      },
      {
        count: 8,
        href: '/dashboard?view=sent',
        label: 'Liberacion calidad',
        owner: 'Aseguramiento de Calidad',
        tone: 'border-indigo-200 bg-indigo-50 text-indigo-950',
      },
      {
        count: 9,
        href: '/mantenimiento/hvac/rui/activo',
        label: 'Ejecucion tecnica',
        owner: 'Tecnicos de planta',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
      },
    ],
  };
}

function buildExecutiveMetrics(stats: MasterOperationalStats): ExecutiveMetric[] {
  return [
    {
      label: 'RUI abiertos',
      value: String(stats.openRuis),
      detail: 'Registros vivos entre ejecucion, revision y liberacion.',
      tone: 'border-slate-200 bg-white text-slate-950',
    },
    {
      label: 'Pendientes supervisor',
      value: String(stats.pendingSupervisor),
      detail: 'Items esperando validacion operativa de mantenimiento.',
      tone: 'border-amber-200 bg-amber-50 text-amber-950',
    },
    {
      label: 'Pendientes calidad',
      value: String(stats.pendingQuality),
      detail: 'Items esperando dictamen QA o liberacion GxP.',
      tone: 'border-indigo-200 bg-indigo-50 text-indigo-950',
    },
    {
      label: 'Cumplimiento sistema',
      value: `${stats.complianceRate.toFixed(1)}%`,
      detail: 'Indicador ejecutivo mock listo para agregados canonicos.',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    },
  ];
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const orderCreated = resolvedSearchParams.order_created === '1';
  const createdRecordUuid = String(resolvedSearchParams.record ?? '');
  const stats = await fetchMasterOperationalStats();
  const executiveMetrics = buildExecutiveMetrics(stats);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                Master Operational Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-normal">
                Panel General de Operaciones GxP
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700">
                Centro ejecutivo para monitorear RUIs abiertos, colas de validacion y salud
                regulatoria de la planta desde una entrada comun del shell.
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              Corte operativo:{' '}
              <span className="font-mono text-slate-950">
                {new Date(stats.generatedAt).toLocaleString('es-PA', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'America/Panama',
                })}
              </span>
            </div>
          </div>
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

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {executiveMetrics.map((metric) => (
            <article className={`rounded-lg border p-4 shadow-sm ${metric.tone}`} key={metric.label}>
              <p className="text-xs font-black uppercase tracking-wide opacity-75">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-normal">{metric.value}</p>
              <p className="mt-2 text-sm font-semibold leading-5 opacity-80">{metric.detail}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Validation Command Center
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-950">
                  Colas transversales de aprobacion
                </h2>
              </div>
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                href="/mantenimiento/hvac/rui/activo"
              >
                Abrir planta HVAC
              </Link>
            </div>

            <div className="mt-4 grid gap-3">
              {stats.validationQueues.map((queue) => (
                <Link
                  className={`grid gap-2 rounded-lg border p-4 transition hover:brightness-95 md:grid-cols-[1fr_auto] md:items-center ${queue.tone}`}
                  href={queue.href}
                  key={queue.label}
                >
                  <span>
                    <span className="block text-sm font-black text-slate-950">{queue.label}</span>
                    <span className="mt-1 block text-sm font-semibold opacity-75">{queue.owner}</span>
                  </span>
                  <span className="text-3xl font-black tracking-normal">{queue.count}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Plant Readiness
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Estado ejecutivo</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                <p className="text-sm font-black">Areas operativas en linea</p>
                <p className="mt-2 text-3xl font-black">{stats.plantAreasOnline}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Ruta canonica del hub</p>
                <p className="mt-2 font-mono text-sm font-bold text-slate-700">/dashboard</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-950">Fuente de datos</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Adaptador mock desacoplado, preparado para agregados Supabase por estado,
                  area, responsable y ventana de cumplimiento.
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Executive shortcuts
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Accesos de operacion</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Entrada rapida a los flujos que alimentan el tablero ejecutivo.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ['Gestion de activos', '/activos'],
              ['Crear ordenes', '/mantenimiento/crear-ordenes'],
              ['Auditoria', '/auditoria'],
            ].map(([label, href]) => (
              <Link
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-950 transition hover:border-emerald-300 hover:bg-emerald-50"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
