'use client';

import { useState } from 'react';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { Camera, Maximize2, X } from 'lucide-react';

type AssetImageDialogProps = {
  assetCode: string;
  imageUrl?: string | null;
  version?: number | null;
};

function isRenderableImageUrl(value: string | null | undefined) {
  const normalizedValue = String(value ?? '').trim();

  return (
    /^https?:\/\/\S+/i.test(normalizedValue) ||
    normalizedValue.startsWith('/') ||
    /^data:image\//i.test(normalizedValue)
  );
}

function MasterImagePlaceholder() {
  return (
    <div className="mt-4 flex aspect-[4/3] max-h-[260px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm">
        <Camera aria-hidden="true" className="h-8 w-8 shrink-0" />
      </div>
      <p className="max-w-[260px] font-mono text-xs font-black uppercase tracking-wide text-slate-500">
        FOTOGRAFÍA MAESTRA NO ASIGNADA | Control de Cambios Requerido
      </p>
    </div>
  );
}

export function AssetImageDialog({ assetCode, imageUrl, version }: AssetImageDialogProps) {
  const [hasImageFailed, setHasImageFailed] = useState(false);
  const normalizedImageUrl = String(imageUrl ?? '').trim();
  const canRenderImage = isRenderableImageUrl(normalizedImageUrl) && !hasImageFailed;

  if (!canRenderImage) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 border-t-4 border-t-slate-400 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-black text-slate-950">Imagen del Activo</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
            Maestro
          </span>
        </div>
        <MasterImagePlaceholder />
      </section>
    );
  }

  return (
    <Dialog.Root>
      <section className="rounded-lg border border-slate-200 border-t-4 border-t-slate-400 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-black text-slate-950">Imagen del Activo</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
            Maestro
          </span>
        </div>

        <Dialog.Trigger asChild>
          <button
            aria-label={`Abrir imagen maestra del activo ${assetCode}`}
            className="group relative mt-4 block aspect-[4/3] max-h-[260px] w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-100 text-left shadow-sm"
            type="button"
          >
            <Image
              alt={`Imagen del activo ${assetCode}`}
              className="object-cover transition duration-300 group-hover:scale-105"
              fill
              sizes="(min-width: 1280px) 420px, 90vw"
              onError={() => setHasImageFailed(true)}
              src={normalizedImageUrl}
              unoptimized
            />
            <span className="absolute inset-0 flex items-end justify-end bg-slate-950/0 p-3 transition group-hover:bg-slate-950/25">
              <span className="inline-flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-900 shadow">
                <Maximize2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                Ampliar
              </span>
            </span>
          </button>
        </Dialog.Trigger>
      </section>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur-md" />
        <Dialog.Content className="fixed inset-0 z-[90] flex min-w-0 items-center justify-center overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <div className="relative grid max-h-[calc(100vh-2rem)] w-full max-w-7xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-2xl transition-all duration-300 ease-in-out">
            <div className="grid gap-3 border-b border-slate-800 pb-3 pr-12 md:grid-cols-[1fr_auto] md:items-start">
              <Dialog.Title className="font-mono text-xs font-black uppercase tracking-wide text-slate-100 md:text-sm">
                [EVIDENCIA CRÍTICA DE PLANTA]
                <span className="mt-1 block text-[11px] text-slate-400">
                  ASSET_TAG: {assetCode} | VERSION: Rev. {version ?? 'N/D'}
                </span>
              </Dialog.Title>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <span className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-wide text-slate-200">
                  FORM_ID: FOR-PDAC-REV
                </span>
                <span className="rounded border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-wide text-slate-200">
                  SCREEN_ID: SCREEN-ACT-REV-01
                </span>
              </div>
            </div>

            <Dialog.Close
              aria-label="Cerrar imagen ampliada"
              className="absolute right-4 top-4 inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5 shrink-0" />
            </Dialog.Close>

            <div className="relative my-4 min-h-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
              <div className="relative h-[min(72vh,760px)] w-full">
                <Image
                  alt={`Imagen ampliada del activo ${assetCode}`}
                  className="object-contain"
                  fill
                  sizes="96vw"
                  onError={() => setHasImageFailed(true)}
                  src={normalizedImageUrl}
                  unoptimized
                />
              </div>
            </div>

            <div className="mx-auto mt-1 max-w-2xl rounded-r-lg border-l-4 border-amber-500 bg-amber-500/10 p-3 font-sans text-xs font-semibold leading-5 text-amber-200">
              PRECAUCIÓN DE AUDITORÍA: Esta imagen constituye una evidencia inmutable registrada bajo control GxP. Cualquier alteración, manipulación o duplicidad no autorizada de este archivo binario será registrada en el Audit Trail automatizado del sistema bajo sanción de desproteger la trazabilidad (ALCOA+).
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
