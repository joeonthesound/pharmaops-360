'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, ClipboardList, Search } from 'lucide-react';
import {
  generateMaintenanceOrder,
  getTemplateFieldsForAssetType,
  type MaintenanceTemplateField,
} from './actions';

export type AssetOption = {
  uuid: string;
  asset_code: string;
  asset_name: string;
  asset_type: string;
};

type OrderCreationFormProps = {
  assets: AssetOption[];
};

function groupFieldsBySection(fields: MaintenanceTemplateField[]) {
  return fields.reduce<Record<string, MaintenanceTemplateField[]>>((acc, field) => {
    const sectionName = field.section_name || 'Parametros de mantenimiento';
    acc[sectionName] = [...(acc[sectionName] ?? []), field];
    return acc;
  }, {});
}

export function OrderCreationForm({ assets }: OrderCreationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetUuid, setSelectedAssetUuid] = useState('');
  const [templateFields, setTemplateFields] = useState<MaintenanceTemplateField[]>([]);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [createdRecordUuid, setCreatedRecordUuid] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const templateSaved = searchParams.get('template_saved') === '1';

  const selectedAsset = assets.find((asset) => asset.uuid === selectedAssetUuid) ?? null;
  const filteredAssets = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return assets;
    }

    return assets.filter((asset) => {
      const searchable = `${asset.asset_code} ${asset.asset_name} ${asset.asset_type}`.toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [assets, searchTerm]);
  const fieldsBySection = useMemo(() => groupFieldsBySection(templateFields), [templateFields]);

  async function handleAssetChange(assetUuid: string) {
    setSelectedAssetUuid(assetUuid);
    setTemplateFields([]);
    setCreatedRecordUuid(null);
    setMessage(null);

    const asset = assets.find((item) => item.uuid === assetUuid);

    if (!asset) {
      return;
    }

    setIsLoadingTemplate(true);
    const fields = await getTemplateFieldsForAssetType(asset.asset_type);
    setTemplateFields(fields);
    setIsLoadingTemplate(false);
  }

  function handleSubmit() {
    if (!selectedAsset) {
      setMessage('Debe seleccionar un activo antes de generar la orden.');
      return;
    }

    if (templateFields.length === 0) {
      setMessage('No se puede generar una orden sin plantilla registrada.');
      return;
    }

    setMessage(null);
    setCreatedRecordUuid(null);

    startTransition(async () => {
      const result = await generateMaintenanceOrder({
        assetUuid: selectedAsset.uuid,
        assetType: selectedAsset.asset_type,
      });

      setMessage(result.message);
      setCreatedRecordUuid(result.recordUuid ?? null);

      if (result.ok) {
        router.push(
          `/dashboard?view=pending&order_created=1${
            result.recordUuid ? `&record=${encodeURIComponent(result.recordUuid)}` : ''
          }`,
        );
      }
    });
  }

  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Search aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Seleccionar activo</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Busque por codigo, nombre o tipo de activo para cargar su plantilla dinamica.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="asset-search">
            Buscar activo
          </label>
          <input
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            id="asset-search"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="HVAC-04, Bascula, Filtro..."
            value={searchTerm}
          />

          <label className="text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="asset-select">
            Activo disponible
          </label>
          <select
            className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            id="asset-select"
            onChange={(event) => void handleAssetChange(event.target.value)}
            value={selectedAssetUuid}
          >
            <option value="">Seleccione un activo</option>
            {filteredAssets.map((asset) => (
              <option key={asset.uuid} value={asset.uuid}>
                {asset.asset_code} - {asset.asset_name}
              </option>
            ))}
          </select>
        </div>

        {selectedAsset ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-black text-slate-950">{selectedAsset.asset_code}</p>
            <p className="mt-1 font-semibold text-slate-700">{selectedAsset.asset_name}</p>
            <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">
              Tipo de activo
            </p>
            <p className="mt-1 font-bold text-slate-900">{selectedAsset.asset_type}</p>
          </div>
        ) : null}
      </div>

      <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <ClipboardList aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Preview de plantilla</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Campos que se inyectaran como estructura inicial vacia.
            </p>
          </div>
        </div>

        {isLoadingTemplate ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
            Cargando plantilla...
          </div>
        ) : null}

        {selectedAsset && !isLoadingTemplate && templateFields.length === 0 ? (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="flex gap-3">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">
                  Este Tipo de Activo no posee una plantilla de calificación registrada.
                </p>
                <Link
                  className="mt-3 inline-flex h-10 items-center rounded-md bg-amber-900 px-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-amber-800"
                  href={`/mantenimiento/plantillas?asset_type=${encodeURIComponent(
                    selectedAsset.asset_type,
                  )}`}
                >
                  Agregar parametros para este tipo
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {templateSaved ? (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-black text-emerald-800">
            Plantilla guardada correctamente. Seleccione el activo nuevamente para refrescar el
            preview.
          </div>
        ) : null}

        {!isLoadingTemplate && templateFields.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {Object.entries(fieldsBySection).map(([sectionName, fields]) => (
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" key={sectionName}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="px-3 py-2 text-sm font-black text-slate-950">{sectionName}</h3>
                  <span className="mr-3 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-500">
                    {fields.length} campo(s)
                  </span>
                </div>
                <table className="w-full border-t border-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Parametro</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Unidad</th>
                      <th className="px-3 py-2">Requerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field) => (
                      <tr className="border-t border-slate-100 odd:bg-white even:bg-slate-50/80" key={field.id}>
                        <td className="px-3 py-2 font-black text-slate-900">{field.field_label}</td>
                        <td className="px-3 py-2 font-semibold text-slate-600">{field.field_type}</td>
                        <td className="px-3 py-2 font-semibold text-slate-600">{field.unit ?? 'N/A'}</td>
                        <td className="px-3 py-2 font-semibold text-slate-600">
                          {field.required ? 'Si' : 'No'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        ) : null}

        <button
          className="mt-5 h-11 w-full rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-300"
          disabled={!selectedAsset || templateFields.length === 0 || isPending || isLoadingTemplate}
          onClick={handleSubmit}
          type="button"
        >
          {isPending ? 'Generando...' : 'Generar Orden de Mantenimiento'}
        </button>

        {message ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
            {message}
            {createdRecordUuid ? (
              <p className="mt-1 break-all text-xs text-slate-500">RUI: {createdRecordUuid}</p>
            ) : null}
          </div>
        ) : null}
      </aside>
    </section>
  );
}
