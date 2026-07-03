const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

export default function RuiStatusLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-2">
            <div className="h-4 w-24 animate-pulse rounded bg-emerald-200" />
            <div className="h-8 w-48 animate-pulse rounded bg-slate-300" />
            <div className="h-5 w-80 max-w-full animate-pulse rounded bg-slate-200" />
          </div>
          <div className="h-12 w-12 animate-pulse rounded-md bg-slate-200" />
        </header>

        <nav className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-4">
          {['Pendientes', 'Enviados', 'Rechazados', 'Historial'].map((label) => (
            <div
              aria-hidden="true"
              className="flex min-h-12 items-center justify-center rounded-md bg-slate-100"
              key={label}
            >
              <span className="h-4 w-24 animate-pulse rounded bg-slate-300" />
            </div>
          ))}
        </nav>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {skeletonCards.map((item) => (
            <article
              aria-hidden="true"
              className="grid min-h-72 gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              key={item}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid flex-1 gap-2">
                  <div className="h-6 w-40 animate-pulse rounded bg-slate-300" />
                  <div className="h-4 w-56 max-w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="h-7 w-28 animate-pulse rounded-full bg-emerald-200" />
              </div>

              <div className="grid gap-2">
                <div className="h-10 animate-pulse rounded-md bg-slate-100" />
                <div className="h-16 animate-pulse rounded-md bg-slate-100" />
                <div className="h-14 animate-pulse rounded-md bg-slate-100" />
                <div className="h-11 animate-pulse rounded-md bg-slate-900/20" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
