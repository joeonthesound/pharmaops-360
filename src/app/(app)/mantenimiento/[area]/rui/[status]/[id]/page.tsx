import ChecklistInspeccionPage from '../../../page';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

type RuiLifecycleRouteProps = {
  params: Promise<{
    area: string;
    status: string;
    id: string;
  }>;
};

type MaintenanceRecordImageDebug = {
  id: number;
  uuid: string;
  record_code: string | null;
  asset_code: string | null;
  notes: string | null;
};

type FormResponseImageDebug = {
  campo_id: number | null;
  valor_texto: string | null;
};

type FormFieldImageDebug = {
  id: number;
  field_key: string | null;
  field_label: string | null;
  field_type: string | null;
  evidence_required: boolean | null;
};

type NormalizedImagePayload = {
  bucket: string;
  path: string;
  publicUrl: string | null;
  fileSize: string | null;
  uploadTimestamp: string | null;
  metadata: Record<string, unknown>;
};

const EVIDENCE_BUCKET = 'evidencias-mantenimiento';

function parseJsonSafely(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function normalizeStoragePath(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    try {
      const url = new URL(trimmedValue);
      const decodedPath = decodeURIComponent(url.pathname);
      const marker = `/storage/v1/object/public/${EVIDENCE_BUCKET}/`;
      const markerIndex = decodedPath.indexOf(marker);

      if (markerIndex >= 0) {
        return decodedPath.slice(markerIndex + marker.length);
      }

      return trimmedValue;
    } catch {
      return trimmedValue;
    }
  }

  return trimmedValue.replace(new RegExp(`^${EVIDENCE_BUCKET}/`), '');
}

function extractImageValues(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  const trimmedValue = rawValue.trim();
  const parsedValue = parseJsonSafely(trimmedValue);

  if (Array.isArray(parsedValue)) {
    return parsedValue
      .flatMap((item) => {
        if (typeof item === 'string') {
          return [item];
        }

        if (item && typeof item === 'object') {
          const candidate = item as Record<string, unknown>;
          const path =
            candidate.path ??
            candidate.storagePath ??
            candidate.storage_path ??
            candidate.url ??
            candidate.publicUrl;

          return typeof path === 'string' ? [path] : [];
        }

        return [];
      })
      .filter(Boolean);
  }

  if (parsedValue && typeof parsedValue === 'object') {
    const candidate = parsedValue as Record<string, unknown>;
    const path =
      candidate.path ??
      candidate.storagePath ??
      candidate.storage_path ??
      candidate.url ??
      candidate.publicUrl;

    return typeof path === 'string' ? [path] : [];
  }

  return [trimmedValue];
}

async function debugReportImages(reportUuid: string) {
  const supabase = await createSupabaseServerClient();

  console.group('[DIAGNOSTICO RUI IMAGENES P360]');
  console.log('RUI UUID solicitado:', reportUuid);

  const { data: recordData, error: recordError } = await supabase
    .from('mantenimientos_registros')
    .select('id, uuid, record_code, asset_code, notes')
    .eq('uuid', reportUuid)
    .maybeSingle();

  if (recordError || !recordData) {
    console.log('Resultado cabecera RUI:', {
      found: Boolean(recordData),
      error: recordError
        ? {
            code: recordError.code,
            message: recordError.message,
            details: recordError.details,
            hint: recordError.hint,
          }
        : null,
    });
    console.groupEnd();
    return;
  }

  const record = recordData as MaintenanceRecordImageDebug;

  const [
    { data: responsesData, error: responsesError },
    { data: fieldsData, error: fieldsError },
  ] = await Promise.all([
    supabase
      .from('formularios_respuestas')
      .select('campo_id, valor_texto')
      .eq('mantenimiento_id', record.id),
    supabase
      .from('formularios_campos')
      .select('id, field_key, field_label, field_type, evidence_required'),
  ]);

  if (responsesError || fieldsError) {
    console.log('Resultado consulta adjuntos:', {
      responsesError: responsesError
        ? {
            code: responsesError.code,
            message: responsesError.message,
            details: responsesError.details,
            hint: responsesError.hint,
          }
        : null,
      fieldsError: fieldsError
        ? {
            code: fieldsError.code,
            message: fieldsError.message,
            details: fieldsError.details,
            hint: fieldsError.hint,
          }
        : null,
    });
    console.groupEnd();
    return;
  }

  const responses = (responsesData ?? []) as FormResponseImageDebug[];
  const fields = (fieldsData ?? []) as FormFieldImageDebug[];
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const normalizedImages: NormalizedImagePayload[] = responses.flatMap((response) => {
    const field = response.campo_id ? fieldsById.get(response.campo_id) : undefined;
    const fieldType = String(field?.field_type ?? '').toLowerCase();
    const isEvidenceField =
      Boolean(field?.evidence_required) ||
      ['evidence', 'file', 'image', 'attachment'].includes(fieldType);
    const imageValues = extractImageValues(response.valor_texto);

    if (!isEvidenceField && imageValues.length === 0) {
      return [];
    }

    return imageValues
      .map((imageValue) => normalizeStoragePath(imageValue))
      .filter((path): path is string => Boolean(path))
      .map((path) => {
        const isExternalUrl = /^https?:\/\//i.test(path);
        const publicUrl = isExternalUrl
          ? path
          : supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(path).data.publicUrl;

        return {
          bucket: EVIDENCE_BUCKET,
          path,
          publicUrl,
          fileSize: null,
          uploadTimestamp: null,
          metadata: {
            record,
            campo_id: response.campo_id,
            field_key: field?.field_key ?? null,
            field_label: field?.field_label ?? null,
            field_type: field?.field_type ?? null,
            evidence_required: field?.evidence_required ?? null,
            raw_value: response.valor_texto,
          },
        };
      });
  });

  console.log('Total imagenes encontradas para este UUID:', {
    total: normalizedImages.length,
    expectedRange: '5-12',
    withinExpectedRange: normalizedImages.length >= 5 && normalizedImages.length <= 12,
  });
  console.log('Raw JSON payload de imagenes:', normalizedImages);

  normalizedImages.forEach((image, index) => {
    console.group(`[DIAGNOSTICO RUI IMAGEN ${index + 1}]`);
    console.log('Storage Bucket Path:', `${image.bucket}/${image.path}`);
    console.log('Public URL generada:', image.publicUrl);
    console.log('File Size:', image.fileSize);
    console.log('Upload Timestamp:', image.uploadTimestamp);
    console.log('Associated Metadata:', image.metadata);
    console.groupEnd();
  });

  const firstImageUrl = normalizedImages[0]?.publicUrl;

  if (firstImageUrl) {
    try {
      const imageAccessResponse = await fetch(firstImageUrl, {
        method: 'HEAD',
        cache: 'no-store',
      });

      console.log('Fetch check primera imagen:', {
        url: firstImageUrl,
        status: imageAccessResponse.status,
        ok: imageAccessResponse.ok,
      });
    } catch (error) {
      console.log('Fetch check primera imagen fallo:', {
        url: firstImageUrl,
        error,
      });
    }
  } else {
    console.log('Fetch check primera imagen:', 'Sin URL disponible para validar politicas Storage.');
  }

  console.groupEnd();
}

export default async function RuiLifecycleRoute({ params }: RuiLifecycleRouteProps) {
  const resolvedParams = await params;
  await debugReportImages(resolvedParams.id);

  return (
    <>
      <div className="print:hidden px-4 pb-2">
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          {'\u2699\uFE0F Ejecutando Diagnostico de Imagenes en Consola...'}
        </span>
      </div>
      {ChecklistInspeccionPage({
        params: Promise.resolve({
          area: resolvedParams.id,
        }),
      })}
    </>
  );
}
