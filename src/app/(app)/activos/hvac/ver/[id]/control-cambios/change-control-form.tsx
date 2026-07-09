'use client';

import { useMemo, useState, useTransition } from 'react';
import { Camera, FileImage, LockKeyhole, SendHorizontal } from 'lucide-react';
import {
  submitChangeControlAction,
  type ChangeControlActionResult,
  type ChangeControlJson,
} from '@/modules/activos/actions/change-control.actions';
import { supabase } from '@/shared/lib/supabase';

type ChangeControlFormProps = {
  assetId: number;
  assetCode: string;
  datosAnteriores: ChangeControlJson;
};

type ProposedValues = {
  asset_name: string;
  location_detail: string;
  maintenance_frequency: string;
  image_url: string;
};

const EVIDENCE_BUCKET = 'evidencias-mantenimiento';
const ASSET_EVIDENCE_PREFIX = 'activos';

function buildImmutableImagePath(assetCode: string) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').replace('T', '_').slice(0, 18);
  return `${assetCode}_${timestamp}.png`;
}

function getInitialValue(source: ChangeControlJson, key: keyof ProposedValues) {
  const value = source[key];

  return typeof value === 'string' ? value : '';
}

export function ChangeControlForm({
  assetId,
  assetCode,
  datosAnteriores,
}: ChangeControlFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ChangeControlActionResult | null>(null);
  const [justification, setJustification] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [proposedValues, setProposedValues] = useState<ProposedValues>({
    asset_name: getInitialValue(datosAnteriores, 'asset_name'),
    location_detail: getInitialValue(datosAnteriores, 'location_detail'),
    maintenance_frequency: getInitialValue(datosAnteriores, 'maintenance_frequency'),
    image_url: getInitialValue(datosAnteriores, 'image_url'),
  });
  const [selectedFileName, setSelectedFileName] = useState('');

  const bucketPath = proposedValues.image_url
    ? `${EVIDENCE_BUCKET}/${ASSET_EVIDENCE_PREFIX}/${proposedValues.image_url}`
    : 'Sin fotografia propuesta';
  const canSubmit =
    justification.trim().length >= 15 &&
    assetId > 0 &&
    !isPending &&
    !isUploadingImage &&
    !uploadErrorMessage;

  const datosNuevos = useMemo<ChangeControlJson>(
    () => ({
      ...datosAnteriores,
      asset_name: proposedValues.asset_name,
      location_detail: proposedValues.location_detail,
      maintenance_frequency: proposedValues.maintenance_frequency,
      image_url: proposedValues.image_url || null,
      image_bucket: proposedValues.image_url ? EVIDENCE_BUCKET : null,
      image_storage_path: proposedValues.image_url
        ? `${ASSET_EVIDENCE_PREFIX}/${proposedValues.image_url}`
        : null,
      image_original_filename: selectedFileName || null,
    }),
    [datosAnteriores, proposedValues, selectedFileName],
  );

  function updateProposedValue(key: keyof ProposedValues, value: string) {
    setProposedValues((currentValue) => ({
      ...currentValue,
      [key]: value,
    }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const actionResult = await submitChangeControlAction(
        assetId,
        datosAnteriores,
        datosNuevos,
        justification,
      );

      setResult(actionResult);
    });
  }

  async function handleImageSelection(file: File) {
    const generatedFileName = buildImmutableImagePath(assetCode);
    const storagePath = `${ASSET_EVIDENCE_PREFIX}/${generatedFileName}`;

    setIsUploadingImage(true);
    setUploadErrorMessage(null);
    setSelectedFileName(file.name);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '31536000',
        contentType: file.type || 'image/png',
        upsert: false,
      });

    console.log('[GxP CLIENT STORAGE ADUANA]', uploadData, uploadError);

    setIsUploadingImage(false);

    if (uploadError) {
      setUploadErrorMessage(uploadError.message);
      updateProposedValue('image_url', '');
      return;
    }

    updateProposedValue('image_url', generatedFileName);
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-300 border-t-4 border-t-slate-700 bg-white p-5 shadow-sm">
          <h2 className="font-mono text-sm font-black uppercase tracking-wide text-slate-800">
            Valores Actuales
          </h2>
          <div className="mt-4 grid gap-3">
            {[
              ['asset_name', 'Nombre del activo'],
              ['location_detail', 'Ubicacion tecnica'],
              ['maintenance_frequency', 'Frecuencia'],
              ['version', 'Version vigente'],
              ['status_gxp', 'Estado GxP'],
              ['image_url', 'Fotografia maestra'],
            ].map(([key, label]) => (
              <label className="grid gap-1" key={key}>
                <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                  {label}
                </span>
                <input
                  className="h-11 rounded-md border border-slate-200 bg-slate-100 px-3 font-mono text-sm font-bold text-slate-600"
                  readOnly
                  value={String(datosAnteriores[key] ?? 'No registrado')}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-indigo-300 border-t-4 border-t-indigo-700 bg-white p-5 shadow-sm">
          <h2 className="font-mono text-sm font-black uppercase tracking-wide text-indigo-900">
            Valores Propuestos / Nueva Fotografia
          </h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                Nombre del activo
              </span>
              <input
                className="h-11 rounded-md border border-indigo-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                onChange={(event) => updateProposedValue('asset_name', event.target.value)}
                value={proposedValues.asset_name}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                Ubicacion tecnica
              </span>
              <input
                className="h-11 rounded-md border border-indigo-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                onChange={(event) =>
                  updateProposedValue('location_detail', event.target.value)
                }
                value={proposedValues.location_detail}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                Frecuencia
              </span>
              <input
                className="h-11 rounded-md border border-indigo-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                onChange={(event) =>
                  updateProposedValue('maintenance_frequency', event.target.value)
                }
                value={proposedValues.maintenance_frequency}
              />
            </label>

            <label className="group grid cursor-pointer gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/70 p-4 transition hover:border-indigo-500">
              <span className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-wide text-indigo-900">
                <FileImage aria-hidden="true" className="h-4 w-4 shrink-0" />
                Dropzone evidencias-mantenimiento/activos
              </span>
              <span className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-indigo-100 bg-white px-3 text-center">
                <Camera aria-hidden="true" className="h-8 w-8 text-indigo-700" />
                <span className="text-sm font-black text-slate-800">
                  {isUploadingImage
                    ? 'Subiendo fotografia al storage...'
                    : selectedFileName || 'Seleccione nueva fotografia del activo'}
                </span>
                <span className="font-mono text-xs font-bold text-slate-500">{bucketPath}</span>
                {uploadErrorMessage ? (
                  <span className="text-xs font-black text-red-700">{uploadErrorMessage}</span>
                ) : null}
              </span>
              <input
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  void handleImageSelection(file);
                }}
                type="file"
              />
            </label>

            <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-600">
              <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
              <p>
                La ruta propuesta queda bloqueada como referencia inmutable. No se ofrece accion de
                eliminacion desde esta pantalla.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm">
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-950">
            Justificacion Tecnica de la Modificacion (Minimo 15 caracteres)
          </span>
          <textarea
            className="min-h-32 rounded-md border border-slate-300 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
            onChange={(event) => setJustification(event.target.value)}
            value={justification}
          />
        </label>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="font-mono text-xs font-bold uppercase tracking-wide text-slate-500">
            asset_id numeric: {assetId} | status inicial: PENDIENTE
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-indigo-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!canSubmit}
            onClick={handleSubmit}
            type="button"
          >
            <SendHorizontal aria-hidden="true" className="h-4 w-4 shrink-0" />
            {isPending ? 'Registrando solicitud...' : 'Solicitar Validacion GxP'}
          </button>
        </div>

        {result ? (
          <div
            className={`mt-4 rounded-md border p-4 text-sm font-bold ${
              result.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <p>{result.message}</p>
            <p className="mt-1 font-mono text-xs">
              STAGE: {result.diagnostic.stage}
              {result.changeControlId ? ` | CC_ID: ${result.changeControlId}` : ''}
            </p>
          </div>
        ) : null}
      </section>
    </section>
  );
}
