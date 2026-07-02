'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon, X } from 'lucide-react';

export type EvidenceLightboxImage = {
  alt: string;
  label?: string;
  src: string;
};

type EvidenceLightboxGalleryProps = {
  emptyMessage?: string;
  gridClassName?: string;
  imageClassName?: string;
  images: EvidenceLightboxImage[];
  renderCaptionOverlay?: boolean;
  thumbnailClassName?: string;
};

export function EvidenceLightboxGallery({
  emptyMessage = 'Sin evidencias fotograficas adjuntas.',
  gridClassName = 'mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-3',
  imageClassName = 'h-full w-full object-cover transition-all group-hover:scale-105',
  images,
  renderCaptionOverlay = true,
  thumbnailClassName = 'relative aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition-all hover:ring-2 hover:ring-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 print:shadow-none',
}: EvidenceLightboxGalleryProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const activeImage = activeIdx === null ? null : images[activeIdx] ?? null;
  const hasMultipleImages = images.length > 1;

  const closeLightbox = useCallback(() => {
    setActiveIdx(null);
  }, []);

  const goPrevious = useCallback(() => {
    setActiveIdx((currentIdx) => {
      if (currentIdx === null || images.length === 0) {
        return currentIdx;
      }

      return currentIdx === 0 ? images.length - 1 : currentIdx - 1;
    });
  }, [images.length]);

  const goNext = useCallback(() => {
    setActiveIdx((currentIdx) => {
      if (currentIdx === null || images.length === 0) {
        return currentIdx;
      }

      return currentIdx === images.length - 1 ? 0 : currentIdx + 1;
    });
  }, [images.length]);

  useEffect(() => {
    if (activeIdx === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeLightbox();
      }

      if (event.key === 'ArrowLeft') {
        goPrevious();
      }

      if (event.key === 'ArrowRight') {
        goNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIdx, closeLightbox, goNext, goPrevious]);

  useEffect(() => {
    if (activeIdx !== null && activeIdx >= images.length) {
      setActiveIdx(images.length > 0 ? images.length - 1 : null);
    }
  }, [activeIdx, images.length]);

  const counterLabel = useMemo(() => {
    if (activeIdx === null || images.length === 0) {
      return null;
    }

    return `${activeIdx + 1} / ${images.length}`;
  }, [activeIdx, images.length]);

  if (images.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400 print:grid print:grid-cols-2 print:text-black">
        <ImageIcon aria-hidden="true" className="mx-auto h-6 w-6" />
        <p className="mt-2 font-semibold">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className={gridClassName}>
        {images.map((image, index) => (
          <button
            aria-label={`Abrir evidencia ${index + 1}: ${image.label ?? image.alt}`}
            className={`group cursor-pointer ${thumbnailClassName}`}
            key={`${image.src}-${index}`}
            onClick={() => setActiveIdx(index)}
            type="button"
          >
            <img
              alt={image.alt}
              className={imageClassName}
              loading="lazy"
              src={image.src}
            />
            {renderCaptionOverlay ? (
              <div className="absolute inset-x-0 bottom-0 truncate bg-black/60 p-1.5 text-center text-[10px] font-medium text-white">
                {image.label ?? image.alt}
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {activeImage ? (
        <div
          aria-label="Galeria ampliada de evidencias fotograficas"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm print:hidden"
          onClick={closeLightbox}
          role="dialog"
        >
          <div
            className="relative grid max-h-[94vh] w-full max-w-6xl gap-3 rounded-xl bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Evidencia fotografica de inspeccion
                </p>
                <p className="truncate text-sm font-semibold text-slate-950">
                  {activeImage.label ?? activeImage.alt}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {counterLabel ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {counterLabel}
                  </span>
                ) : null}
                <button
                  aria-label="Cerrar galeria de evidencias"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  onClick={closeLightbox}
                  type="button"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative flex min-h-[52vh] items-center justify-center overflow-hidden rounded-lg bg-slate-950">
              <img
                alt={activeImage.alt}
                className="max-h-[76vh] w-full object-contain"
                src={activeImage.src}
              />

              {hasMultipleImages ? (
                <>
                  <button
                    aria-label="Ver evidencia anterior"
                    className="absolute left-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-lg transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    onClick={goPrevious}
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" className="h-7 w-7" />
                  </button>
                  <button
                    aria-label="Ver evidencia siguiente"
                    className="absolute right-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-950 shadow-lg transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                    onClick={goNext}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" className="h-7 w-7" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
