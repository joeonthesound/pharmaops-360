import Link from 'next/link';

const analyticsCards = [
  {
    title: 'HEPA Filters',
    description: 'Indicadores de saturacion, reemplazo y cumplimiento por activo.',
  },
  {
    title: 'Air Changes',
    description: 'Placeholder para renovaciones por hora y tendencias de flujo.',
  },
  {
    title: 'Temperature / Humidity',
    description: 'Placeholder para parametros ambientales y desviaciones.',
  },
];

export default function HvacDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Mantenimientos de Planta
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">
            Dashboard Operacion HVAC
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Vista estructural para analitica operacional de climatizacion, preparada para graficas
            validadas y KPIs de cumplimiento.
          </p>
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          {analyticsCards.map((card) => (
            <article
              className="min-h-36 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              key={card.title}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {card.title}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-700">
                {card.description}
              </p>
            </article>
          ))}
        </div>

        <Link
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-fit"
          href="/mantenimiento/hvac/activos"
        >
          Ver activos HVAC
        </Link>
      </section>
    </main>
  );
}
