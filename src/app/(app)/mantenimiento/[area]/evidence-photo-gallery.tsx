'use client';

import { useState } from 'react';
import { ImageIcon, X } from 'lucide-react';

type EvidencePhotoGalleryProps = {
  imageUrls: string[];
};

export function EvidencePhotoGallery({ imageUrls }: EvidencePhotoGalleryProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  if (imageUrls.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-400 print:grid print:grid-cols-2 print:text-black">
        <ImageIcon aria-hidden="true" className="mx-auto h-6 w-6" />
        <p className="mt-2 font-semibold">
          Sin evidencias fotográficas adjuntas en este registro de inspección.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 print:grid print:grid-cols-2">
        {imageUrls.map((imageUrl, index) => (
          <button
            aria-label={`Vista previa de evidencia fotografica ${index + 1}`}
            className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300 print:h-auto print:w-full print:shadow-none"
            key={`${imageUrl}-${index}`}
            onClick={() => setSelectedImageUrl(imageUrl)}
            type="button"
          >
            <img
              alt={`Evidencia fotografica ${index + 1}`}
              className="h-full w-full object-cover print:aspect-square"
              src={imageUrl}
            />
          </button>
        ))}
      </div>

      {selectedImageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl rounded-xl bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Cerrar vista previa"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-slate-100"
              onClick={() => setSelectedImageUrl(null)}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
            <img
              alt="Vista previa de evidencia fotografica"
              className="max-h-[84vh] w-full rounded-lg object-contain"
              src={selectedImageUrl}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
