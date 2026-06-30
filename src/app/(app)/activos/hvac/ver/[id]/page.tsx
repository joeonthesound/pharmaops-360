import Image from 'next/image';
import Link from 'next/link';
import { FileText, ImageIcon, ShieldCheck, Wrench } from 'lucide-react';
import {
  getActivoDetalle,
  type ActivoReporteDetalle,
} from '@/modules/activos/actions/get-activo-detalle';
import { EvidencePreviewGallery } from './evidence-preview-gallery';

type ActivoHvacDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type LifecycleState = {
  slug: 'activo' | 'enviado' | 'rechazado' | 'ht';
  label: string;
  className: string;
};

const lifecycleByStatus: Record<string, LifecycleState> = {
  draft: {
    slug: 'activo',
    label: 'Documento activo',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  pending_supervisor: {
    slug: 'enviado',
    label: 'Enviado a supervisor',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  pending_quality: {
    slug: 'enviado',
    label: 'Enviado a calidad',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  rejected: {
    slug: 'rechazado',
    label: 'Rechazado',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  approved: {
    slug: 'ht',
    label: 'Historial tecnico',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
};

function getStringValue(value: unknown, fallback = 'No disponible') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getReportStatus(reporte: ActivoReporteDetalle) {
  return getStringValue(reporte.status, 'draft');
}

function resolveLifecycle(reporte: ActivoReporteDetalle) {
  return lifecycleByStatus[getReportStatus(reporte)] ?? lifecycleByStatus.draft;
}

function getReportUuid(reporte: ActivoReporteDetalle) {
  return getStringValue(reporte.reporte_id ?? reporte.uuid, String(reporte.id));
}

function getReportCode(reporte: ActivoReporteDetalle) {
  return getStringValue(reporte.record_code ?? reporte.uuid, `RUI-${reporte.id}`);
}

function getReportDate(reporte: ActivoReporteDetalle) {
  const rawDate =
    typeof reporte.executed_at === 'string'
      ? reporte.executed_at
      : typeof reporte.scheduled_date === 'string'
        ? reporte.scheduled_date
        : null;

  if (!rawDate) {
    return 'Fecha no registrada';
  }

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no registrada';
  }

  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default async function ActivoHvacDetallePage({
  params,
}: ActivoHvacDetallePageProps) {
  const resolvedParams = await params;
  const data = await getActivoDetalle(resolvedParams.id);

  // Se desactivara posteriormente desde el toggle de SuperAdmin para pruebas OQ controladas.
  if (process.env.NEXT_PUBLIC_SUPERADMIN_DEBUG === 'true') {
    console.log(
      '[VERIFICATION SYSTEM ACTIVE - GxP MATCH]:',
      data.historial_mantenimientos,
    );
  }

  if (!data.activo) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
        <section className="mx-auto grid w-full max-w-3xl gap-3 rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide">Activo no localizado</p>
          <h1 className="text-2xl font-semibold tracking-normal">
            No data found for this identifier
          </h1>
          <p className="text-sm leading-6">
            No se encontro un activo HVAC con el identificador solicitado. Verifique el UUID o codigo
            del activo antes de continuar.
          </p>
        </section>
      </main>
    );
  }

  const activo = data.activo;
  const location = [activo.location_detail, activo.area, activo.site].filter(Boolean).join(' / ');

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Perfil maestro de activo HVAC
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">
              {activo.asset_code}
            </h1>
            <p className="mt-1 text-sm text-slate-600">{activo.asset_name}</p>
          </div>

          {data.seguridad.puedeEditar ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              href={`/activos/gestionar?id=${encodeURIComponent(activo.uuid)}`}
            >
              Editar Parametros de Calificacion
            </Link>
          ) : null}
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <ShieldCheck aria-hidden="true" className="text-slate-700" size={20} />
              <h2 className="text-base font-semibold text-slate-950">Datos de calificacion</h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetadataItem label="Codigo" value={activo.asset_code} />
              <MetadataItem label="Nombre" value={activo.asset_name} />
              <MetadataItem label="Ubicacion" value={location || 'Ubicacion no disponible'} />
              <MetadataItem label="Estado operacional" value={activo.status} />
              <MetadataItem label="Marca / Modelo" value={`${activo.brand} / ${activo.model}`} />
              <MetadataItem
                label="Capacidad"
                value={`${activo.capacity} ${activo.capacity_unit}`}
              />
              <MetadataItem label="Serie" value={activo.serial_number} />
              <MetadataItem
                label="Fecha de instalacion"
                value={activo.installation_date ?? 'No registrada'}
              />
              <MetadataItem
                label="Proximo mantenimiento"
                value={activo.next_maintenance_date ?? 'No programado'}
              />
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-slate-950">Imagen del Activo</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                HVAC
              </span>
            </div>

            <div className="mt-4 aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              {activo.imagen_url ? (
                <div className="relative h-full w-full">
                  <Image
                    alt={`Imagen del activo ${activo.asset_code}`}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 420px, 90vw"
                    src={activo.imagen_url}
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500">
                    <Wrench aria-hidden="true" size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Plano tecnico pendiente
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Registre una imagen maestra para inspeccion visual del activo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Historial inmutable RUI
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Registros de mantenimiento y evidencias
              </h2>
            </div>
            <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
              {data.historial_mantenimientos.length} RUI asociado(s)
            </span>
          </div>

          <div className="mt-4">
            {data.historial_mantenimientos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-medium text-slate-600">
                No existen reportes RUI asociados a este activo.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="hidden grid-cols-[1.25fr_1fr_1fr_1.6fr_140px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid">
                  <span>Codigo RUI</span>
                  <span>Fecha de Inspeccion</span>
                  <span>Estado / Fase GxP</span>
                  <span>Evidencias Multimedia</span>
                  <span className="text-right">Accion</span>
                </div>

                <div className="divide-y divide-slate-200">
                  {data.historial_mantenimientos.map((rui) => {
                    const lifecycle = resolveLifecycle(rui);
                    const reportUuid = getReportUuid(rui);
                    const reportCode = getReportCode(rui);
                    const truncatedUuid =
                      reportUuid.length > 18
                        ? `${reportUuid.slice(0, 8)}...${reportUuid.slice(-6)}`
                        : reportUuid;
                    const reportHref = `/mantenimiento/hvac/rui/ht/${reportUuid}`;

                    return (
                      <div
                        className="grid gap-3 bg-white px-4 py-4 lg:grid-cols-[1.25fr_1fr_1fr_1.6fr_140px] lg:items-center"
                        key={`${reportCode}-${reportUuid}`}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                            Codigo RUI
                          </p>
                          <div className="mt-1 flex min-w-0 items-center gap-2 lg:mt-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                              <FileText aria-hidden="true" size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {reportCode}
                              </p>
                              <p className="font-mono text-xs text-slate-500">
                                {truncatedUuid}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                            Fecha de Inspeccion
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-700 lg:mt-0">
                            {getReportDate(rui)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:hidden">
                            Estado / Fase GxP
                          </p>
                          <span
                            className={`mt-1 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold lg:mt-0 ${lifecycle.className}`}
                          >
                            {lifecycle.label}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2 lg:hidden">
                            <ImageIcon aria-hidden="true" className="text-slate-500" size={16} />
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                              Evidencias Multimedia ({rui.imagenes_evidencia.length})
                            </p>
                          </div>
                          <EvidencePreviewGallery
                            images={rui.imagenes_evidencia}
                            reportLabel={reportCode}
                          />
                        </div>

                        <div className="flex justify-start lg:justify-end">
                          <Link
                            className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                            href={reportHref}
                          >
                            Ver Reporte
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
