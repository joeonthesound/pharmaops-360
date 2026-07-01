import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TemplateFieldsForm } from './template-fields-form';

type PlantillasPageProps = {
  searchParams: Promise<{
    asset_type?: string;
  }>;
};

export default async function PlantillasPage({ searchParams }: PlantillasPageProps) {
  const resolvedSearchParams = await searchParams;
  const assetType = decodeURIComponent(String(resolvedSearchParams.asset_type ?? '')).trim();

  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-6xl">
        <Link
          className="mb-4 inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          href="/mantenimiento/crear-ordenes"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Volver a Crear Ordenes
        </Link>

        <TemplateFieldsForm assetType={assetType} />
      </section>
    </main>
  );
}
