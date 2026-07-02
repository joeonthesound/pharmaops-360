'use client';

import { EvidenceLightboxGallery } from '@/modules/mantenimiento/components/evidence-lightbox-gallery';

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
  return (
    <EvidenceLightboxGallery
      emptyMessage="Sin evidencias fotograficas asociadas."
      gridClassName="flex max-w-full gap-2 overflow-x-auto pb-1"
      imageClassName="h-full w-full object-cover transition-all group-hover:scale-105"
      images={images.map((imageSrc, index) => ({
        alt: `Evidencia ${index + 1} de ${reportLabel}`,
        label: getImageLabel(imageSrc),
        src: imageSrc,
      }))}
      renderCaptionOverlay={false}
      thumbnailClassName="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-sm transition-all hover:ring-2 hover:ring-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
    />
  );
}
