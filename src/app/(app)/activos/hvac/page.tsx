import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { getHvacDashboard } from '@/modules/activos/actions/get-hvac-dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HvacDashboardData = Awaited<ReturnType<typeof getHvacDashboard>>;
type HvacDashboardAsset = HvacDashboardData['assets'][number];
type DisplayAsset = HvacDashboardAsset;

function EquipmentMetaRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[18px_1fr] gap-2 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
        <div className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

type WorkflowSemaphoreStage = 'execution' | 'review' | 'signoff' | 'rejected';

function getSemaphoreDotClass(stage: WorkflowSemaphoreStage, count: number) {
  if (count <= 0) {
    return 'bg-slate-700';
  }

  if (stage === 'execution') {
    return 'bg-amber-500 animate-pulse';
  }

  if (stage === 'review') {
    return 'bg-blue-500';
  }

  if (stage === 'signoff') {
    return 'bg-emerald-500';
  }

  return 'bg-rose-500';
}

function WorkflowSemaphoreRow({
  count,
  label,
  stage,
}: {
  count: number;
  label: string;
  stage: WorkflowSemaphoreStage;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="inline-flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${getSemaphoreDotClass(stage, count)}`}
        />
        <span className="truncate font-mono text-[11px] font-black uppercase tracking-wide text-slate-600">
          {label}
        </span>
      </span>
      <span className="font-mono text-sm font-black text-slate-950">{count}</span>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'No registrada';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatLocation({
  area,
  location_detail,
}: {
  area: string | null;
  location_detail: string | null;
}) {
  return [area, location_detail].filter(Boolean).join(' / ') || 'Sin ubicacion registrada';
}

function getOperationalStatusBadge(status: string | null) {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();

  if (normalizedStatus.includes('mantenimiento') || normalizedStatus.includes('revision')) {
    return {
      label: 'MANTENIMIENTO',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (
    normalizedStatus.includes('operativo') ||
    normalizedStatus.includes('active') ||
    normalizedStatus.includes('approved')
  ) {
    return {
      label: 'OPERATIVO',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  return {
    label: status?.trim().toUpperCase() || 'SIN ESTADO',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  };
}

function getGxpStatusBadge(status: DisplayAsset['status_gxp']) {
  if (status === 'APROBADO') {
    return {
      label: 'APROBADO',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  if (status === 'EVALUACIÓN') {
    return {
      label: 'EVALUACIÓN',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (status === 'RECHAZADO') {
    return {
      label: 'RECHAZADO',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  }

  return {
    label: 'SIN ESTADO GXP',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  };
}

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
            <span className="rounded border border-slate-300 bg-white px-3 py-2 font-mono text-[11px] font-black uppercase tracking-wide text-slate-700">
              FORM_ID: FOR-MNT-HVAC-DASH
            </span>
            <span className="rounded border border-slate-300 bg-white px-3 py-2 font-mono text-[11px] font-black uppercase tracking-wide text-slate-700">
              SCREEN_ID: SCREEN-MNT-HVAC-DASH-01
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

          {displayAssets.map((asset) => {
            const operationalStatus = getOperationalStatusBadge(asset.status);
            const gxpStatus = getGxpStatusBadge(asset.status_gxp);

            return (
              /* COMP-HVAC-CARD-NODE */
              <article
                className="flex min-h-full flex-col rounded-lg border border-slate-100 bg-white px-4 py-3.5 shadow-sm"
                key={asset.uuid}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                        {asset.asset_code}
                      </p>
                      <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wide text-slate-700">
                        Rev. {asset.version || 1}
                      </span>
                    </div>
                    <h2 className="mt-1 line-clamp-2 text-[15px] font-black leading-5 text-slate-950">
                      {asset.asset_name}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wide ${operationalStatus.className}`}
                  >
                    {operationalStatus.label}
                  </span>
                </div>

                <div className="grid flex-1 py-2">
                  <EquipmentMetaRow
                    icon={<ShieldCheck aria-hidden="true" size={14} />}
                    label="Estado Regulatorio GxP"
                    value={
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wide ${gxpStatus.className}`}
                      >
                        {gxpStatus.label}
                      </span>
                    }
                  />
                  <EquipmentMetaRow
                    icon={<MapPin aria-hidden="true" size={14} />}
                    label="Ubicacion"
                    value={formatLocation(asset)}
                  />
                  <EquipmentMetaRow
                    icon={<CalendarDays aria-hidden="true" size={14} />}
                    label="Proximo Mantenimiento"
                    value={formatDate(asset.next_maintenance_date)}
                  />
                  <EquipmentMetaRow
                    icon={<Activity aria-hidden="true" size={14} />}
                    label="Responsable Interno"
                    value={asset.internal_responsible || 'No asignado'}
                  />
                  <EquipmentMetaRow
                    icon={<Activity aria-hidden="true" size={14} />}
                    label="Órdenes Creadas"
                    value={
                      <span className="font-mono text-sm font-black text-slate-900">
                        {asset.total_orders || 0}
                      </span>
                    }
                  />
                  <div className="border-b border-slate-100 py-2.5 last:border-b-0">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Ciclo de Vida de Aprobaciones
                    </p>
                    <div className="grid gap-2">
                      <WorkflowSemaphoreRow
                        count={asset.orders_in_execution || 0}
                        label="Técnico"
                        stage="execution"
                      />
                      <WorkflowSemaphoreRow
                        count={asset.orders_in_review || 0}
                        label="QA/Prod"
                        stage="review"
                      />
                      <WorkflowSemaphoreRow
                        count={asset.orders_in_signoff || 0}
                        label="Gerencia"
                        stage="signoff"
                      />
                      <WorkflowSemaphoreRow
                        count={asset.orders_rejected || 0}
                        label="Desviaciones"
                        stage="rejected"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-1 flex justify-end border-t border-slate-100 pt-3">
                  <Link
                    href={`/activos/hvac/ver/${encodeURIComponent(asset.asset_code)}`}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2 h-12"
                  >
                    <Activity aria-hidden="true" size={15} />
                    Consultar
                    <ArrowRight aria-hidden="true" size={14} />
                  </Link>
                </div>
              </article>
            );
          })}

        </section>
      </div>
    </main>
  );
}
