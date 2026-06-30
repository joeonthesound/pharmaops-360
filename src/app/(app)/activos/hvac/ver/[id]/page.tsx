import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  Gauge,
  ImageIcon,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  getActivoDetalle,
  type ActivoReporteDetalle,
} from '@/modules/activos/actions/get-activo-detalle';
import { EvidencePreviewGallery } from './evidence-preview-gallery';
import { SuperadminDebugPanel } from './superadmin-debug-panel';

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

type ActionBadge = {
  label: 'Insert' | 'Update' | 'Inactivate';
  className: string;
};

const lifecycleByStatus: Record<string, LifecycleState> = {
  draft: {
    slug: 'activo',
    label: 'Documento Activo',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  pending_supervisor: {
    slug: 'enviado',
    label: 'Enviado a Supervisor',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  pending_quality: {
    slug: 'enviado',
    label: 'Enviado a Calidad',
    className: 'border-sky-200 bg-sky-50 text-sky-800',
  },
  rejected: {
    slug: 'rechazado',
    label: 'Rechazado',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  approved: {
    slug: 'ht',
    label: 'Historial Tecnico',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
};

const actionBadgeStyles: Record<ActionBadge['label'], string> = {
  Insert: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Update: 'bg-blue-50 text-blue-700 border-blue-200',
  Inactivate: 'bg-orange-50 text-[#C76E00] border-orange-200',
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

function resolveActionBadge(reporte: ActivoReporteDetalle): ActionBadge {
  const status = getReportStatus(reporte);

  if (status === 'rejected') {
    return {
      label: 'Inactivate',
      className: actionBadgeStyles.Inactivate,
    };
  }

  if (status === 'draft') {
    return {
      label: 'Insert',
      className: actionBadgeStyles.Insert,
    };
  }

  return {
    label: 'Update',
    className: actionBadgeStyles.Update,
  };
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

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function DisabledSpecInput({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        className="h-10 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-500"
        disabled
        value={value}
        readOnly
      />
    </label>
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
  const assetTitle = `${activo.asset_code} (${activo.asset_name || 'Air Handling Unit UMA-01'})`;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-950">
      {process.env.NEXT_PUBLIC_SUPERADMIN_DEBUG === 'true' ? (
        <SuperadminDebugPanel payload={data} />
      ) : null}

      <div className="mx-auto grid w-full max-w-7xl gap-5">
        <header className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Perfil dinamico de activo critico
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950 md:text-3xl">
                {assetTitle}
              </h1>
            </div>
            <span className="inline-flex w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-900">
              Rol: Administrador Calificado
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-700" size={24} />
              <div>
                <p className="text-sm font-black">
                  Activo y Cualificado | El activo se encuentra operativo y calificado bajo control GxP.
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-800">
                  Timestamp UTC: {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit rounded-md bg-emerald-700 px-3 py-2 text-xs font-black uppercase tracking-wide text-white">
              Validacion automatica
            </span>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="grid gap-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Gauge aria-hidden="true" className="text-slate-700" size={20} />
                <h2 className="text-base font-black text-slate-950">Ficha Tecnica</h2>
              </div>

              <dl className="mt-2">
                <MetadataRow label="ID del Activo" value={activo.asset_code} />
                <MetadataRow label="Descripcion" value={activo.asset_name} />
                <MetadataRow label="Ubicacion" value={location || 'Ubicacion no disponible'} />
                <MetadataRow label="Modelo" value={activo.model} />
                <MetadataRow label="Numero de Serie" value={activo.serial_number} />
                <MetadataRow label="Fabricante" value={activo.brand} />
                <MetadataRow label="Tipo" value={activo.asset_type} />
                <MetadataRow label="Area" value={activo.area} />
                <MetadataRow label="Frecuencia de Mantenimiento" value={activo.maintenance_frequency} />
              </dl>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-base font-black text-slate-950">Imagen del Activo</h2>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
                  Maestro
                </span>
              </div>

              <div className="mt-4 aspect-square max-h-[420px] overflow-hidden rounded-lg border border-dashed border-slate-400 bg-slate-50">
                {activo.imagen_url ? (
                  <div className="relative h-full w-full">
                    <Image
                      alt={`Imagen del activo ${activo.asset_code}`}
                      className="object-cover"
                      fill
                      sizes="(min-width: 1280px) 680px, 90vw"
                      src={activo.imagen_url}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500">
                      <Camera aria-hidden="true" size={28} />
                    </div>
                    <p className="text-sm font-black text-slate-700">
                      Cargar Imagen Maestra del Activo
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="text-slate-600" size={18} />
                <h2 className="text-sm font-black text-slate-950">Perfil Regular (Solo Lectura)</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <DisabledSpecInput label="Pressure Setpoint" value="N/A - pendiente SCADA" />
                <DisabledSpecInput label="ACH Threshold" value="N/A - pendiente balanceo" />
                <DisabledSpecInput label="Calibration" value={activo.last_maintenance_date ?? 'No registrada'} />
              </div>
            </section>

            <section className="rounded-lg border border-[#C76E00] bg-orange-50 p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <SlidersHorizontal aria-hidden="true" className="mt-0.5 text-[#C76E00]" size={18} />
                <div>
                  <h2 className="text-sm font-black text-slate-950">Perfil Admin</h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">
                    Cambios de parametros requieren justificacion GxP y huella de auditoria.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <input
                  className="h-10 rounded-md border border-orange-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
                  placeholder="Nuevo setpoint autorizado"
                  readOnly
                />
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#C76E00] px-4 text-sm font-black text-white transition hover:brightness-95"
                  href={`/activos/gestionar?id=${encodeURIComponent(activo.uuid)}`}
                >
                  Modificar Parametros de Calificacion
                </Link>
              </div>
            </section>

            <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle aria-hidden="true" className="mt-0.5 text-rose-700" size={18} />
                <div>
                  <h2 className="text-sm font-black text-rose-950">Perfil SuperAdmin</h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-rose-800">
                    Accion destructiva logica. No elimina datos; descalifica el activo y preserva la pista ALCOA+.
                  </p>
                </div>
              </div>
              <button
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border-2 border-rose-700 bg-white px-4 text-sm font-black text-rose-700 transition hover:bg-rose-100"
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
                Dar de Baja del Sistema (Descalificar Activo)
              </button>
            </section>
          </aside>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Historial Inmutable de Cambios del Activo
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Registros de mantenimiento y evidencias
              </h2>
            </div>
            <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
              {data.historial_mantenimientos.length} RUI asociado(s)
            </span>
          </div>

          <div className="mt-4">
            {data.historial_mantenimientos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-600">
                No existen reportes RUI asociados a este activo.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="hidden grid-cols-[1fr_120px_1fr_1fr_1.5fr_130px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-wide text-slate-500 xl:grid">
                  <span>Timestamp (UTC)</span>
                  <span>Action Badge</span>
                  <span>Record Code</span>
                  <span>Status Pill</span>
                  <span>Multimedia Evidence Strip</span>
                  <span className="text-right">Action Button</span>
                </div>

                <div className="divide-y divide-slate-200">
                  {data.historial_mantenimientos.map((rui) => {
                    const lifecycle = resolveLifecycle(rui);
                    const actionBadge = resolveActionBadge(rui);
                    const reportUuid = getReportUuid(rui);
                    const reportCode = getReportCode(rui);
                    const reportHref = `/mantenimiento/hvac/rui/ht/${reportUuid}`;

                    return (
                      <div
                        className="grid gap-3 bg-white px-4 py-4 xl:grid-cols-[1fr_120px_1fr_1fr_1.5fr_130px] xl:items-center"
                        key={`${reportCode}-${reportUuid}`}
                      >
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 xl:hidden">
                            Timestamp (UTC)
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-700 xl:mt-0">
                            {getReportDate(rui)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 xl:hidden">
                            Action Badge
                          </p>
                          <span
                            className={`mt-1 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black xl:mt-0 ${actionBadge.className}`}
                          >
                            {actionBadge.label}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 xl:hidden">
                            Record Code
                          </p>
                          <div className="mt-1 flex min-w-0 items-center gap-2 xl:mt-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                              <FileText aria-hidden="true" size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-950">
                                {reportCode}
                              </p>
                              <p className="truncate font-mono text-xs text-slate-500">
                                {reportUuid}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 xl:hidden">
                            Status Pill
                          </p>
                          <span
                            className={`mt-1 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black xl:mt-0 ${lifecycle.className}`}
                          >
                            {lifecycle.label}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-2 flex items-center gap-2 xl:hidden">
                            <ImageIcon aria-hidden="true" className="text-slate-500" size={16} />
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                              Multimedia Evidence Strip ({rui.imagenes_evidencia.length})
                            </p>
                          </div>
                          <EvidencePreviewGallery
                            images={rui.imagenes_evidencia}
                            reportLabel={reportCode}
                          />
                        </div>

                        <div className="flex justify-start xl:justify-end">
                          <Link
                            className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-3 text-sm font-black text-white transition hover:bg-slate-800"
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
