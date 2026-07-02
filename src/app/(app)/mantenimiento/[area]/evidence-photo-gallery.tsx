'use client';

import { EvidenceLightboxGallery } from '@/modules/mantenimiento/components/evidence-lightbox-gallery';

export type EvidencePhoto = {
  fieldLabel: string;
  publicUrl: string;
};

type EvidencePhotoGalleryProps = {
  images: EvidencePhoto[];
};

export function EvidencePhotoGallery({ images }: EvidencePhotoGalleryProps) {
  return (
    <EvidenceLightboxGallery
      emptyMessage="Sin evidencias fotograficas adjuntas en este registro de inspeccion."
      images={images.map((image) => ({
        alt: image.fieldLabel,
        label: image.fieldLabel,
        src: image.publicUrl,
      }))}
    />
  );
}
