'use client';

import Image from 'next/image';
import { useState } from 'react';

type EvidencePreviewGalleryProps = {
  images: string[];
  reportLabel: string;
};

function getImageLabel(src: string) {
  const cleanPath = src.split('?')[0] ?? src;
  const parts = cleanPath.split('/').filter(Boolean);

  return parts.at(-1) ?? 'evidencia-rui';
}

export function EvidencePreviewGallery({
  images,
  reportLabel,
}: EvidencePreviewGalleryProps) {
  const [focusedImage, setFocusedImage] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-xs font-semibold text-slate-500">
        Sin evidencias fotograficas asociadas.
      </div>
    );
  }

  return (
    <>
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {images.map((imageSrc, index) => (
          <button
            aria-label={`Abrir evidencia ${index + 1} de ${reportLabel}`}
            className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm transition hover:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            key={`${imageSrc}-${index}`}
            onClick={() => setFocusedImage(imageSrc)}
            type="button"
          >
            <Image
              alt={`Evidencia ${index + 1} de ${reportLabel}`}
              className="object-cover transition group-hover:scale-105"
              fill
              sizes="64px"
              src={imageSrc}
              unoptimized
            />
          </button>
        ))}
      </div>

      {focusedImage ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
        >
          <div className="grid w-full max-w-5xl gap-3 rounded-lg bg-white p-3 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Inspeccion de evidencia RUI
                </p>
                <p className="truncate text-sm font-semibold text-slate-950">
                  {getImageLabel(focusedImage)}
                </p>
              </div>
              <button
                className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={() => setFocusedImage(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>
            <div className="relative h-[70vh] overflow-hidden rounded-md bg-slate-100">
              <Image
                alt={`Vista ampliada de ${reportLabel}`}
                className="object-contain"
                fill
                sizes="90vw"
                src={focusedImage}
                unoptimized
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
