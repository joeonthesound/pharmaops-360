import Link from 'next/link';
import { ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { getHvacDashboard } from '@/modules/activos/actions/get-hvac-dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HvacDashboardData = Awaited<ReturnType<typeof getHvacDashboard>>;
type HvacDashboardAsset = HvacDashboardData['assets'][number];
type DisplayAsset = HvacDashboardAsset;

export default async function HvacFleetDashboardPage() {
  let dashboardData: HvacDashboardData | null = null;

  try {
    dashboardData = await getHvacDashboard();
  } catch (error) {
    console.error('[HVAC DASHBOARD] Error cargando datos productivos', error);
  }

  const data = dashboardData
    ? {
        ...dashboardData,
        activosRaw: dashboardData.assets,
      }
    : null;
  const realAssets: DisplayAsset[] = data?.activosRaw || [];
  const displayAssets = realAssets;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      {/* MAIN_LAYOUT_GRID_STRUCTURE */}
      <div className="w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6 grid gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              PharmaOps 360 / HVAC Fleet
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-normal text-slate-950">
              Dashboard Operacion HVAC
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Estado ambiental, salud operativa y activos criticos bajo control GxP.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
              <ShieldCheck aria-hidden="true" size={16} />
              Sistema Validado
            </span>
          </div>
        </header>

        {/* SUBSECTION_ID: SUB-HVAC-GRID-CONTAINER */}
        <section className="grid w-full grid-cols-1 gap-5 md:grid-cols-3">
          {displayAssets.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 md:col-span-3">
              No hay activos HVAC registrados en la base de datos.
            </div>
          ) : null}

          {displayAssets.map((asset) => (
            /* COMP-HVAC-CARD-NODE */
            <article
              className="flex min-h-full flex-col justify-between gap-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              key={asset.uuid}
            >
              <div className="grid gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="select-text rounded-md border border-slate-300 bg-slate-950 px-3 py-1.5 font-mono text-sm font-black uppercase tracking-wide text-white">
                    {asset.asset_code}
                  </p>
                  <span className="cursor-text select-text rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-xs font-black uppercase tracking-wide text-slate-700">
                    REV: {asset.version || 1}
                  </span>
                </div>

                <h2 className="select-text text-lg font-black leading-6 text-slate-950">
                  {asset.asset_name}
                </h2>
              </div>

              <Link
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-black text-white transition-colors hover:bg-slate-800"
                href={`/activos/hvac/ver/${encodeURIComponent(asset.asset_code || asset.uuid)}`}
              >
                <Search aria-hidden="true" size={16} />
                Consultar
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </article>
          ))}

        </section>
      </div>
    </main>
  );
}
