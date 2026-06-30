import Link from 'next/link';
import { supabase } from '@/shared/lib/supabase';
import type { Activo, ActivoEstado } from '@/modules/activos/activos.interface';

type DashboardPageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

type DashboardView = 'pending' | 'sent' | 'rejected' | 'history';

type ActivoConUuid = Activo & {
  uuid: string;
};

type MantenimientoRegistro = {
  uuid: string;
  asset_code: string | null;
  status: 'draft' | 'pending_supervisor' | 'pending_quality' | 'rejected' | 'approved';
  executed_at: string | null;
  rejection_comments?: string | null;
};

const estadoClasses: Record<ActivoEstado, string> = {
  Operativo: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'En mantenimiento': 'border-amber-200 bg-amber-50 text-amber-800',
  'Fuera de servicio': 'border-red-200 bg-red-50 text-red-800',
};

const orderStatusClasses: Record<MantenimientoRegistro['status'], string> = {
  draft: 'border-slate-200 bg-slate-100 text-slate-700',
  pending_supervisor: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_quality: 'border-sky-200 bg-sky-50 text-sky-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const orderStatusLabel: Record<MantenimientoRegistro['status'], string> = {
  draft: 'Borrador',
  pending_supervisor: 'Pendiente Supervisor',
  pending_quality: 'Pendiente Calidad',
  rejected: 'Rechazado',
  approved: 'Aprobado',
};

const tabs: Array<{ label: string; value: DashboardView }> = [
  { label: 'Activos / Ordenes Pendientes', value: 'pending' },
  { label: 'Activos / Ordenes Enviados', value: 'sent' },
  { label: 'Activos / Ordenes Rechazados', value: 'rejected' },
  { label: 'Historial Tecnico', value: 'history' },
];

const SENT_STATUSES: Array<MantenimientoRegistro['status']> = [
  'pending_supervisor',
  'pending_quality',
];
const REJECTED_STATUS: MantenimientoRegistro['status'] = 'rejected';

function formatLocation(activo: Activo | null | undefined) {
  if (!activo) {
    return 'Ubicacion no disponible';
  }

  return [activo.location_detail, activo.area].filter(Boolean).join(' / ') || activo.area;
}

function normalizeView(value: string | undefined): DashboardView {
  if (value === 'sent' || value === 'rejected' || value === 'history') {
    return value;
  }

  return 'pending';
}

function getOrderHref(_registro: MantenimientoRegistro, activo?: ActivoConUuid) {
  if (activo?.uuid) {
    return `/mantenimiento/${activo.uuid}`;
  }

  return '/dashboard';
}

function getOrderActionLabel(status: MantenimientoRegistro['status']) {
  if (status === 'draft') {
    return 'Continuar Inspeccion';
  }

  if (status === 'pending_supervisor' || status === 'pending_quality') {
    return 'Consultar';
  }

  if (status === REJECTED_STATUS) {
    return 'Consultar';
  }

  if (status === 'approved') {
    return 'Ver Reporte';
  }

  return 'Revisar y Firmar';
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentView = normalizeView(resolvedSearchParams.view);
  let activos: ActivoConUuid[] = [];
  let registros: MantenimientoRegistro[] = [];
  let queryError: { code?: string; message?: string } | null = null;

  console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 1 [Llamada a Tabla Activos]', {
    table: 'activos',
    select: '*',
    order: 'asset_code asc',
  });

  try {
    const [
      { data: activosData, error: activosError },
      { data: registrosData, error: registrosError },
    ] = await Promise.all([
      supabase.from('activos').select('*').order('asset_code', { ascending: true }),
      supabase
        .from('mantenimientos_registros')
        .select('uuid, asset_code, status, executed_at, rejection_comments')
        .in('status', ['draft', 'pending_supervisor', 'pending_quality', 'rejected', 'approved'])
        .order('executed_at', { ascending: false }),
    ]);

    if (activosError) {
      queryError = {
        code: activosError.code,
        message: activosError.message,
      };
    } else {
      activos = (activosData ?? []) as ActivoConUuid[];
    }

    if (registrosError) {
      console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 3 [Ordenes por Estado]', {
        result: 'supabase_error',
        error: {
          code: registrosError.code,
          message: registrosError.message,
        },
      });
    } else {
      registros = (registrosData ?? []) as MantenimientoRegistro[];
    }

    console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 2 [Resultado / Respuesta del Servidor]', {
      result: queryError ? 'supabase_error' : 'supabase_success',
      recordsReturned: activos.length,
      assetCodes: activos.map((activo) => activo.asset_code),
      orderRecords: registros.length,
      orderStatusMap: registros.map((registro) => ({
        uuid: registro.uuid,
        asset_code: registro.asset_code,
        status: registro.status,
      })),
    });
  } catch (error) {
    queryError = {
      message: error instanceof Error ? error.message : 'Error inesperado',
    };

    console.log('[DIAGNOSTICO DASHBOARD P360] ETAPA 2 [Resultado / Respuesta del Servidor]', {
      result: 'exception',
      error: queryError,
    });
  }

  const activosPorCodigo = new Map<string, ActivoConUuid>();

  activos.forEach((activo) => {
    activosPorCodigo.set(activo.asset_code, activo);
  });

  const pendingOrders = registros.filter((registro) => registro.status === 'draft');
  const sentOrders = registros.filter((registro) =>
    SENT_STATUSES.includes(registro.status),
  );
  const rejectedOrders = registros.filter(
    (registro) => registro.status === REJECTED_STATUS,
  );
  const historyOrders = registros.filter((registro) => registro.status === 'approved');
  const visibleOrders =
    currentView === 'pending'
      ? pendingOrders
      : currentView === 'sent'
        ? sentOrders
        : currentView === 'history'
          ? historyOrders
        : rejectedOrders;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Piloto HVAC
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Activos</h1>
            <p className="mt-1 text-sm text-slate-600">
              Flota registrada para mantenimiento preventivo e inspeccion tecnica.
            </p>
          </div>
          <button
            aria-label="Escanear codigo QR"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xl shadow-sm"
            type="button"
          >
            QR
          </button>
        </header>

        <nav className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-3">
          {tabs.map((tab) => {
            const isActive = currentView === tab.value;

            return (
              <Link
                className={`flex min-h-11 items-center justify-center rounded-md px-3 text-center text-sm font-semibold transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
                href={`/dashboard?view=${tab.value}`}
                key={tab.value}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {queryError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            No fue posible cargar los activos HVAC desde Supabase.
          </div>
        ) : null}

        {!queryError && visibleOrders.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
            No hay ordenes en esta pestana segun el estado transaccional actual.
          </div>
        ) : null}

        {!queryError ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleOrders.map((registro) => {
              const activo = registro.asset_code
                ? activosPorCodigo.get(registro.asset_code)
                : undefined;
              const isRejected = registro.status === 'rejected';
              const actionHref = getOrderHref(registro, activo);

              return (
                <article
                  className={`rounded-lg border bg-white p-4 shadow-sm ${
                    isRejected ? 'border-red-200' : 'border-slate-200'
                  }`}
                  key={registro.uuid}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold tracking-normal text-slate-950">
                        {registro.asset_code ?? 'Activo no disponible'}
                      </p>
                      <h2 className="mt-1 text-sm font-medium leading-5 text-slate-700">
                        {activo?.asset_name ?? 'Orden de mantenimiento'}
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
                      {formatLocation(activo)}
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
                        : registro.status === 'draft'
                          ? 'bg-sky-700 hover:bg-sky-800 focus:ring-sky-200 active:bg-sky-900'
                          : 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-300 active:bg-slate-950'
                    }`}
                    href={actionHref}
                  >
                    {getOrderActionLabel(registro.status)}
                  </Link>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}

