import Link from 'next/link';
import {
  calculateDaysRemaining,
  estadoClasses,
  formatLocation,
  getOrderActionLabel,
  getOrderHref,
  orderStatusClasses,
  orderStatusLabel,
  REJECTED_STATUSES,
  resolveRelatedAsset,
  type DashboardOrder,
} from './dashboardTypes';

export function OrderCard({ registro }: { registro: DashboardOrder }) {
  const activo = resolveRelatedAsset(registro);
  const displayAssetCode = activo?.asset_code ?? registro.asset_code ?? 'Activo no disponible';
  const displayAssetName = activo?.asset_name ?? 'Orden de mantenimiento';
  const displayLocation = formatLocation(activo);
  const daysRemaining = calculateDaysRemaining(
    registro.scheduled_date ?? activo?.next_maintenance_date,
  );
  const isRejected = REJECTED_STATUSES.includes(registro.status as (typeof REJECTED_STATUSES)[number]);
  const actionHref = getOrderHref(registro, activo);

  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        isRejected ? 'border-red-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold tracking-normal text-slate-950">{displayAssetCode}</p>
          <h2 className="mt-1 text-sm font-medium leading-5 text-slate-700">
            {displayAssetName}
          </h2>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${orderStatusClasses[registro.status]}`}
        >
          {orderStatusLabel[registro.status]}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <div className="rounded-md bg-slate-100 px-3 py-2 text-slate-700">
          {displayLocation}
        </div>
        {activo ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
            <span className="text-slate-600">Estado del activo</span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${estadoClasses[activo.status]}`}
            >
              {activo.status}
            </span>
          </div>
        ) : null}
        <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 font-semibold text-sky-800">
          {daysRemaining === null
            ? 'Sin fecha programada para el proximo mantenimiento'
            : `${daysRemaining} dias para el proximo mantenimiento`}
        </div>
        {isRejected ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
            {registro.rejection_comments ?? 'Requiere accion correctiva urgente.'}
          </div>
        ) : null}
      </div>

      <Link
        className={`mt-4 flex h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 ${
          isRejected
            ? 'bg-red-700 hover:bg-red-800 focus:ring-red-200 active:bg-red-900'
            : registro.status === 'DRAFT'
              ? 'bg-sky-700 hover:bg-sky-800 focus:ring-sky-200 active:bg-sky-900'
              : 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-300 active:bg-slate-950'
        }`}
        href={actionHref}
      >
        {getOrderActionLabel(registro.status)}
      </Link>
    </article>
  );
}
