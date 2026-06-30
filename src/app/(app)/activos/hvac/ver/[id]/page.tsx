import { getActivoDetalle } from '@/modules/activos/actions/get-activo-detalle';

type ActivoHvacDetallePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ActivoHvacDetallePage({
  params,
}: ActivoHvacDetallePageProps) {
  const resolvedParams = await params;
  const data = await getActivoDetalle(resolvedParams.id);

  console.log('[DATA INTEGRITY CHECK]:', data);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <section className="mx-auto grid w-full max-w-5xl gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Perfil individual de activo HVAC
        </p>
        <h1 className="text-2xl font-semibold tracking-normal">
          {data.activo?.asset_code ?? 'Activo no encontrado'}
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Payload de integridad generado en consola del servidor para validacion previa de UI.
        </p>
      </section>
    </main>
  );
}
