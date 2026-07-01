import Link from 'next/link';
import { ArrowRight, Layers, Wind } from 'lucide-react';

export default function ActivosPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto grid w-full max-w-7xl gap-5">
        <header>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            PharmaOps 360 / Activos
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-normal">Listado General de Activos</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Acceso auditable a dashboards especializados por sistema validado.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            className="group rounded-lg border border-slate-100 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            href="/activos/hvac"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  <Wind aria-hidden="true" size={14} />
                  Sistemas HVAC
                </p>
                <h2 className="mt-3 text-lg font-black text-slate-950">
                  HVAC Fleet Dashboard
                </h2>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
                  Estado operativo, inspecciones y trazabilidad por activo HVAC.
                </p>
              </div>
              <Layers aria-hidden="true" className="text-slate-300" size={24} />
            </div>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-slate-700 transition group-hover:text-slate-950">
              Abrir dashboard
              <ArrowRight aria-hidden="true" size={14} />
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
