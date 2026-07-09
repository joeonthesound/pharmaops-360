import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import {
  getActivoDetalle,
  getAssetIdByTag,
} from '@/modules/activos/actions/get-activo-detalle';
import { ChangeControlForm } from './change-control-form';

type AssetChangeControlPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function isHumanAssetTag(value: string) {
  return /[a-z]/i.test(value);
}

async function resolveCanonicalAssetLookupKey(routeId: string) {
  const normalizedRouteId = routeId.trim();

  if (isHumanAssetTag(normalizedRouteId)) {
    const assetId = await getAssetIdByTag(normalizedRouteId);

    return typeof assetId === 'number' ? String(assetId) : normalizedRouteId;
  }

  return normalizedRouteId;
}

export default async function AssetChangeControlPage({
  params,
}: AssetChangeControlPageProps) {
  const resolvedParams = await params;
  const canonicalLookupKey = await resolveCanonicalAssetLookupKey(resolvedParams.id);
  const data = await getActivoDetalle(canonicalLookupKey);

  if (!data.activo) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-950">
        <div className="w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6">
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h1 className="mt-3 text-2xl font-black text-slate-950">Activo no localizado</h1>
            <p className="mt-2 text-sm font-semibold text-amber-950">
              No se encontro un activo canonico para iniciar control de cambios.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const activo = data.activo;
  const datosAnteriores = {
    id: activo.id,
    uuid: activo.uuid,
    asset_code: activo.asset_code,
    asset_name: activo.asset_name,
    asset_type: activo.asset_type,
    location_detail: activo.location_detail,
    area: activo.area,
    site: activo.site,
    brand: activo.brand,
    model: activo.model,
    serial_number: activo.serial_number,
    capacity: activo.capacity,
    capacity_unit: activo.capacity_unit,
    status: activo.status,
    maintenance_frequency: activo.maintenance_frequency,
    last_maintenance_date: activo.last_maintenance_date,
    next_maintenance_date: activo.next_maintenance_date,
    version: activo.version,
    status_gxp: activo.status_gxp,
    image_url: activo.image_url,
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6">
        <header className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              className="mr-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
              href={`/activos/hvac/ver/${encodeURIComponent(resolvedParams.id)}`}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
              Volver a PDAC
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-indigo-700" />
                Control de Cambios de Activo PDAC
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-normal text-slate-950 md:text-5xl">
                {activo.asset_code} / {activo.asset_name}
              </h1>
            </div>
            <div className="grid gap-2 text-left lg:text-right">
              <p className="font-mono text-xs font-black uppercase tracking-wide text-slate-500">
                asset_id numeric: {activo.id}
              </p>
              <p className="font-mono text-xs font-black uppercase tracking-wide text-indigo-700">
                VERSION:{activo.version} | STATUS_GXP:{activo.status_gxp}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-5">
          <ChangeControlForm
            assetCode={activo.asset_code}
            assetId={activo.id}
            datosAnteriores={datosAnteriores}
          />
        </div>
      </div>
    </main>
  );
}
