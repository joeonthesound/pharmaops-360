'use client';

import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { Camera, Maximize2, X } from 'lucide-react';

type AssetImageDialogProps = {
  assetCode: string;
  imageUrl?: string | null;
};

export function AssetImageDialog({ assetCode, imageUrl }: AssetImageDialogProps) {
  if (!imageUrl) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 border-t-4 border-t-slate-400 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-black text-slate-950">Imagen del Activo</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
            Maestro
          </span>
        </div>
        <div className="mt-4 flex aspect-[4/3] max-h-[260px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500">
            <Camera aria-hidden="true" className="h-7 w-7 shrink-0" />
          </div>
          <p className="text-sm font-black text-slate-700">Imagen maestra no registrada</p>
        </div>
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
              src={imageUrl}
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
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/75 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-3 z-[90] grid gap-3 rounded-lg border border-white/20 bg-slate-950 p-4 shadow-2xl md:inset-6">
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="font-mono text-sm font-black uppercase tracking-wide text-white">
              IMAGEN_MAESTRA: {assetCode}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar imagen ampliada"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              type="button"
            >
              <X aria-hidden="true" className="h-5 w-5 shrink-0" />
            </Dialog.Close>
          </div>
          <div className="relative min-h-0 overflow-hidden rounded-md border border-white/10 bg-slate-900">
            <Image
              alt={`Imagen ampliada del activo ${assetCode}`}
              className="object-contain"
              fill
              sizes="94vw"
              src={imageUrl}
              unoptimized
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
