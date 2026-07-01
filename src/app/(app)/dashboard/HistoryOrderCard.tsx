import Link from 'next/link';
import {
  formatLocation,
  orderStatusClasses,
  orderStatusLabel,
  resolveRelatedAsset,
  type DashboardOrder,
} from './dashboardTypes';

export function HistoryOrderCard({ registro }: { registro: DashboardOrder }) {
  const activo = resolveRelatedAsset(registro);
  const displayAssetCode = activo?.asset_code ?? registro.asset_code ?? 'Activo no disponible';
  const displayAssetName = activo?.asset_name ?? 'Orden de mantenimiento aprobada';
  const displayLocation = formatLocation(activo);
  const actionHref = `/mantenimiento/hvac/rui/ht/${registro.uuid}`;

  return (
    <article
      className="grid gap-3 rounded-lg border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm md:grid-cols-[1.1fr_1fr_auto] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-bold tracking-normal text-slate-950">
            {displayAssetCode}
          </p>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${orderStatusClasses[registro.status]}`}
          >
            {orderStatusLabel[registro.status]}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-slate-700">
          {displayAssetName}
        </p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">
          UUID: {registro.uuid}
        </p>
      </div>

      <div className="grid gap-1 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">{displayLocation}</span>
        <span className="text-xs font-medium text-slate-500">
          Fecha de ejecucion: {registro.executed_at ?? 'No registrada'}
        </span>
        <span className="text-xs font-medium text-slate-500">
          Firma Calidad: {registro.quality_signed_at ?? 'No registrada'}
        </span>
      </div>

      <Link
        className="flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
        href={actionHref}
      >
        Ver Reporte Inmutable
      </Link>
    </article>
  );
}
