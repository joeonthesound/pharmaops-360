'use client';

import { useState } from 'react';
import { ImageIcon, X } from 'lucide-react';

export type EvidencePhoto = {
  fieldLabel: string;
  publicUrl: string;
};

type EvidencePhotoGalleryProps = {
  images: EvidencePhoto[];
};

export function EvidencePhotoGallery({ images }: EvidencePhotoGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<EvidencePhoto | null>(null);

  if (images.length === 0) {
    return (
      <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400 print:grid print:grid-cols-2 print:text-black">
        <ImageIcon aria-hidden="true" className="mx-auto h-6 w-6" />
        <p className="mt-2 font-semibold">
          Sin evidencias fotograficas adjuntas en este registro de inspeccion.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 print:grid-cols-3">
        {images.map((image, index) => (
          <button
            aria-label={`Vista previa de ${image.fieldLabel}`}
            className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted shadow-sm hover:opacity-90 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300 print:shadow-none"
            key={`${image.publicUrl}-${index}`}
            onClick={() => setSelectedImage(image)}
            type="button"
          >
            <img
              alt={image.fieldLabel}
              className="h-full w-full object-cover"
              src={image.publicUrl}
            />
            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1.5 text-[10px] text-white truncate text-center font-medium">
              {image.fieldLabel}
            </div>
          </button>
        ))}
      </div>

      {selectedImage ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm print:hidden"
          onClick={() => setSelectedImage(null)}
          role="dialog"
        >
          <div
            className="relative max-h-[92vh] w-full max-w-6xl rounded-xl bg-white/95 p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Cerrar vista previa"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-slate-100"
              onClick={() => setSelectedImage(null)}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
            <img
              alt={selectedImage.fieldLabel}
              className="max-h-[84vh] w-full rounded-lg object-contain"
              src={selectedImage.publicUrl}
            />
            <p className="mt-2 truncate px-1 text-center text-sm font-semibold text-slate-700">
              {selectedImage.fieldLabel}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
