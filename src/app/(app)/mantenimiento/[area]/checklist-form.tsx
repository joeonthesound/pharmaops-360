'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '@/shared/lib/supabase';

export interface FieldResponse {
  field_id: number;
  field_key: string;
  value_text: string | null;
  value_numeric: number | null;
  is_out_of_range: boolean;
}

type PayloadFilaDB = {
  mantenimiento_id: number;
  campo_id: number;
  field_key?: string | null;
  valor_numerico: number | null;
  valor_seleccion: string | null;
  valor_texto: string | null;
  valor_booleano: boolean | null;
};

type FormularioCampo = {
  id: number;
  template_code: string;
  field_key: string | null;
  section_name: string;
  field_label: string;
  field_type: string;
  options: string[] | string | null;
  minimum_value: number | null;
  maximum_value: number | null;
  help_text: string | null;
  evidence_required: boolean;
  required: boolean | null;
  unit: string | null;
  section_order: number | null;
  field_order: number | null;
};

type ChecklistFormProps = {
  action: (formData: FormData) => Promise<ChecklistSubmitResult>;
  activoId: number;
  assetUuid: string;
  maintenanceRecordId?: number | null;
  maintenanceRecordUuid?: string | null;
  maintenanceStatus:
    | 'draft'
    | 'pending_technician'
    | 'pending_supervisor'
    | 'pending_quality'
    | 'approved'
    | 'rejected'
    | null
    | undefined;
  rejectionComments: string | null;
  initialResponses?: FieldResponse[];
  camposPorSeccion: Record<string, FormularioCampo[] | undefined> | null | undefined;
};

type ChecklistSubmitResult = {
  ok: boolean;
  message: string;
  redirectTo?: string;
  debug?: unknown;
};

type ModalState = {
  status: 'success' | 'error';
  message: string;
  redirectTo?: string;
  debug?: unknown;
};

type PreviewFile = {
  file: File;
  url: string;
};

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVIDENCE_BUCKET = 'evidencias-mantenimiento';
const VIRTUAL_EVIDENCE_FIELD_ID = -1;
const VIRTUAL_EVIDENCE_FIELD_KEY = 'evidencias_hvac';

function normalizeFieldType(fieldType: string) {
  return fieldType.trim().toLowerCase();
}

function isChecklistField(fieldType: string) {
  const normalizedFieldType = normalizeFieldType(fieldType);

  return (
    normalizedFieldType === 'checklist' ||
    normalizedFieldType === 'check' ||
    normalizedFieldType === 'checkbox'
  );
}

function isNumericField(fieldType: string) {
  const normalizedFieldType = normalizeFieldType(fieldType);

  return (
    normalizedFieldType === 'numeric' ||
    normalizedFieldType === 'number' ||
    normalizedFieldType === 'numero' ||
    normalizedFieldType === 'decimal'
  );
}

function getFieldKey(campo: FormularioCampo) {
  return campo.field_key || `field_${campo.id}`;
}

function upsertFieldResponse(
  currentResponses: FieldResponse[],
  nextResponse: FieldResponse,
) {
  return currentResponses.some((response) => response.field_key === nextResponse.field_key)
    ? currentResponses.map((response) =>
        response.field_key === nextResponse.field_key ? nextResponse : response,
      )
    : [...currentResponses, nextResponse];
}

function isNumericOutOfRange(
  value: number | null,
  minimumValue: number | null,
  maximumValue: number | null,
) {
  if (value === null || !Number.isFinite(value)) {
    return false;
  }

  return (
    (minimumValue !== null && value < minimumValue) ||
    (maximumValue !== null && value > maximumValue)
  );
}

function buildInitialResponses(
  campos: FormularioCampo[],
  initialResponses: FieldResponse[] = [],
): FieldResponse[] {
  return campos.map((campo) => {
    const fieldKey = getFieldKey(campo);
    const existingResponse = initialResponses.find(
      (response) => response.field_id === campo.id || response.field_key === fieldKey,
    );

    return (
      existingResponse ?? {
        field_id: campo.id,
        field_key: fieldKey,
        value_text: null,
        value_numeric: null,
        is_out_of_range: false,
      }
    );
  });
}

function isUuidV4(value: string) {
  return UUID_V4_PATTERN.test(value.trim());
}

function extractUuidFromApprovalPath(path: string | undefined) {
  if (!path) {
    return null;
  }

  const match = path.match(/^\/mantenimiento\/([^/]+)\/aprobar$/);
  const uuid = match?.[1] ?? '';

  return isUuidV4(uuid) ? uuid : null;
}

function resolveIsReadOnly(status: string | null | undefined) {
  return !!(
    status &&
    ['pending_supervisor', 'pending_quality', 'approved'].includes(status)
  );
}

function resolveFieldTypeForStorage(fieldType: string) {
  const normalizedFieldType = normalizeFieldType(fieldType);

  if (
    normalizedFieldType === 'checklist' ||
    normalizedFieldType === 'check' ||
    normalizedFieldType === 'checkbox' ||
    normalizedFieldType === 'select'
  ) {
    return 'select' as const;
  }

  if (
    normalizedFieldType === 'numeric' ||
    normalizedFieldType === 'number' ||
    normalizedFieldType === 'numero' ||
    normalizedFieldType === 'decimal'
  ) {
    return 'numeric' as const;
  }

  if (normalizedFieldType === 'boolean') {
    return 'boolean' as const;
  }

  if (normalizedFieldType === 'evidence') {
    return 'evidence' as const;
  }

  return 'text' as const;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function isEvidenceFile(value: FormDataEntryValue): value is File {
  return value instanceof File && value.size > 0;
}

export function ChecklistForm({
  action,
  activoId,
  assetUuid,
  maintenanceRecordId,
  maintenanceRecordUuid,
  maintenanceStatus,
  rejectionComments,
  initialResponses = [],
  camposPorSeccion,
}: ChecklistFormProps) {
  const router = useRouter();
  const safeCamposPorSeccion = camposPorSeccion ?? {};
  const campos = useMemo(() => {
    return Object.values(safeCamposPorSeccion).flatMap((sectionCampos) =>
      Array.isArray(sectionCampos) ? sectionCampos : [],
    );
  }, [safeCamposPorSeccion]);
  const [responses, setResponses] = useState<FieldResponse[]>(
    buildInitialResponses(campos, initialResponses),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const isReadOnly = resolveIsReadOnly(maintenanceStatus);
  const isRejected = maintenanceStatus === 'rejected';

  useEffect(() => {
    setResponses((currentResponses) => {
      const nextResponses = campos.map((campo) => {
        const fieldKey = getFieldKey(campo);
        const initialResponse = initialResponses.find(
          (response) => response.field_id === campo.id || response.field_key === fieldKey,
        );
        const existingResponse = currentResponses.find(
          (response) => response.field_key === fieldKey,
        );

        return (
          existingResponse ?? {
            ...(initialResponse ?? {
              field_id: campo.id,
              field_key: fieldKey,
              value_text: null,
              value_numeric: null,
              is_out_of_range: false,
            }),
          }
        );
      });

      return nextResponses;
    });
  }, [campos, initialResponses]);

  const hasOutOfRange = responses.some((response) => response.is_out_of_range);

  useEffect(() => {
    return () => {
      previewFiles.forEach((previewFile) => URL.revokeObjectURL(previewFile.url));
    };
  }, [previewFiles]);

  function updateResponse(fieldKey: string, patch: Partial<FieldResponse>) {
    setResponses((currentResponses) =>
      currentResponses.some((response) => response.field_key === fieldKey)
        ? currentResponses.map((response) =>
            response.field_key === fieldKey ? { ...response, ...patch } : response,
          )
        : [
            ...currentResponses,
            {
              field_id: patch.field_id ?? 0,
              field_key: fieldKey,
              value_text: patch.value_text ?? null,
              value_numeric: patch.value_numeric ?? null,
              is_out_of_range: patch.is_out_of_range ?? false,
            },
          ],
    );
  }

  function handleChecklistChange(campo: FormularioCampo, value: string) {
    updateResponse(getFieldKey(campo), {
      field_id: campo.id,
      value_text: value,
      value_numeric: null,
      is_out_of_range: false,
    });
  }

  function handleNumericChange(campo: FormularioCampo, value: string) {
    const trimmedValue = value.trim();
    const parsedValue = trimmedValue === '' ? null : Number(trimmedValue);
    const numericValue =
      parsedValue !== null && Number.isFinite(parsedValue) ? parsedValue : null;

    updateResponse(getFieldKey(campo), {
      field_id: campo.id,
      value_text: null,
      value_numeric: numericValue,
      is_out_of_range: isNumericOutOfRange(
        numericValue,
        campo.minimum_value,
        campo.maximum_value,
      ),
    });
  }

  function handleTextChange(campo: FormularioCampo, value: string) {
    updateResponse(getFieldKey(campo), {
      field_id: campo.id,
      value_text: value || null,
      value_numeric: null,
      is_out_of_range: false,
    });
  }

  function syncEvidenceInputFiles(files: File[]) {
    if (!evidenceInputRef.current) {
      return;
    }

    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    evidenceInputRef.current.files = dataTransfer.files;
  }

  function handleEvidenceFileChange(files: FileList | null) {
    setPreviewFiles((currentPreviewFiles) => {
      currentPreviewFiles.forEach((previewFile) => URL.revokeObjectURL(previewFile.url));

      const nextPreviewFiles = Array.from(files ?? [])
        .filter((file) => file.size > 0)
        .map((file) => ({
          file,
          url: URL.createObjectURL(file),
        }));

      syncEvidenceInputFiles(nextPreviewFiles.map((previewFile) => previewFile.file));

      return nextPreviewFiles;
    });
  }

  function handleRemoveEvidenceFile(indexToRemove: number) {
    setPreviewFiles((currentPreviewFiles) => {
      const removedPreviewFile = currentPreviewFiles[indexToRemove];
      const nextPreviewFiles = currentPreviewFiles.filter(
        (_, index) => index !== indexToRemove,
      );

      if (removedPreviewFile) {
        URL.revokeObjectURL(removedPreviewFile.url);
      }

      syncEvidenceInputFiles(nextPreviewFiles.map((previewFile) => previewFile.file));

      return nextPreviewFiles;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isReadOnly) {
      return;
    }

    setIsSubmitting(true);
    setModal(null);

    if (!isUuidV4(assetUuid)) {
      setModal({
        status: 'error',
        message:
          'Identificador UUID del activo invalido. Regrese al Dashboard e inicie nuevamente la inspeccion.',
        debug: {
          stage: 'client_asset_uuid_validation',
          asset_uuid: assetUuid,
          field_responses_payload: responses,
        },
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData(event.currentTarget);
      const currentMantenimientoId = Number(maintenanceRecordId ?? activoId);
      const camposById = new Map(campos.map((campo) => [campo.id, campo]));
      const evidenceFiles = formData.getAll('evidencias').filter(isEvidenceFile);
      const evidenceFields = campos.filter(
        (campo) =>
          resolveFieldTypeForStorage(campo.field_type) === 'evidence' ||
          campo.evidence_required === true,
      );
      const evidenceField = evidenceFields[0] ?? null;
      const formValues = responses.reduce<Record<string, string | number | boolean | null>>(
        (acc, response) => {
          acc[String(response.field_id)] =
            response.value_numeric !== null ? response.value_numeric : response.value_text;
          return acc;
        },
        {},
      );
      let uploadedImageUrls: string[] = [];

      if (evidenceFiles.length > 0) {
        const evidenceOwnerId = (maintenanceRecordUuid || assetUuid).trim();
        const uploadedImages: Array<{
          fieldKey: string;
          bucket: string;
          path: string;
          publicUrl: string;
          fileName: string;
          fileSize: number;
          contentType: string | null;
          uploadedAt: string;
        }> = [];

        for (const [index, file] of evidenceFiles.entries()) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const safeFileName = sanitizeFileName(file.name || `evidencia-${index + 1}.jpg`);
          const storagePath = `evidencias/${evidenceOwnerId}/${timestamp}-${index + 1}-${safeFileName}`;
          const { error: uploadError } = await supabase.storage
            .from(EVIDENCE_BUCKET)
            .upload(storagePath, file, {
              cacheControl: '3600',
              contentType: file.type || 'application/octet-stream',
              upsert: false,
            });

          if (uploadError) {
            setModal({
              status: 'error',
              message: 'No fue posible cargar una evidencia al Storage de Supabase.',
              debug: {
                stage: 'client_storage_upload_error',
                bucket: EVIDENCE_BUCKET,
                storagePath,
                file: {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                },
                supabase_error: {
                  message: uploadError.message,
                  name: uploadError.name,
                },
              },
            });
            setIsSubmitting(false);
            return;
          }

          const publicUrl = supabase.storage
            .from(EVIDENCE_BUCKET)
            .getPublicUrl(storagePath).data.publicUrl;

          uploadedImages.push({
            fieldKey: evidenceField?.field_key ?? VIRTUAL_EVIDENCE_FIELD_KEY,
            bucket: EVIDENCE_BUCKET,
            path: storagePath,
            publicUrl,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type || null,
            uploadedAt: new Date().toISOString(),
          });
        }

        uploadedImageUrls = uploadedImages.map((image) => image.publicUrl);
        formValues[String(evidenceField?.id ?? VIRTUAL_EVIDENCE_FIELD_ID)] =
          JSON.stringify(uploadedImageUrls);
      }

      const evidencePayloadText =
        uploadedImageUrls.length > 0 ? JSON.stringify(uploadedImageUrls) : null;
      const evidenceFieldResponse: FieldResponse | null = evidencePayloadText
        ? {
            field_id: evidenceField?.id ?? VIRTUAL_EVIDENCE_FIELD_ID,
            field_key: evidenceField?.field_key ?? VIRTUAL_EVIDENCE_FIELD_KEY,
            value_text: evidencePayloadText,
            value_numeric: null,
            is_out_of_range: false,
          }
        : null;
      const syncedResponses = evidenceFieldResponse
        ? upsertFieldResponse(responses, evidenceFieldResponse)
        : responses;

      const payloadParaDB: PayloadFilaDB[] = Object.entries(formValues).map(([campoId, valor]) => {
        const campoIdAsNumber = Number.parseInt(campoId, 10);
        const campo = camposById.get(campoIdAsNumber);
        const isVirtualEvidenceField = campoIdAsNumber === VIRTUAL_EVIDENCE_FIELD_ID;
        const fieldType = isVirtualEvidenceField
          ? 'evidence'
          : resolveFieldTypeForStorage(campo?.field_type ?? 'text');

        return {
          mantenimiento_id: currentMantenimientoId,
          campo_id: campoIdAsNumber,
          field_key:
            campo?.field_key ??
            (isVirtualEvidenceField ? VIRTUAL_EVIDENCE_FIELD_KEY : null),
          valor_numerico:
            fieldType === 'numeric' && typeof valor === 'number' ? Number(valor) : null,
          valor_seleccion:
            fieldType === 'select' && valor !== null ? String(valor) : null,
          valor_texto:
            (fieldType === 'text' || fieldType === 'evidence') && valor !== null
              ? String(valor)
              : null,
          valor_booleano: fieldType === 'boolean' ? Boolean(valor) : null,
        };
      });

      formData.set('asset_uuid', assetUuid.trim());
      if (maintenanceRecordUuid) {
        formData.set('maintenance_record_uuid', maintenanceRecordUuid.trim());
      }
      formData.delete('evidencias');
      formData.set('payload_para_db', JSON.stringify(payloadParaDB));
      formData.set('field_responses_payload', JSON.stringify(syncedResponses));
      const result = await action(formData);
      const attemptedPayload = {
        asset_uuid: assetUuid.trim(),
        activo_id: activoId,
        payload_para_db: payloadParaDB,
        field_responses_payload: syncedResponses,
        uploaded_image_urls: uploadedImageUrls,
      };

      if (result.ok) {
        const redirectUuid = extractUuidFromApprovalPath(result.redirectTo);

        if (!redirectUuid || !result.redirectTo) {
          setModal({
            status: 'error',
            message:
              'La inspeccion fue recibida, pero la ruta de aprobacion no contiene un UUID valido.',
            debug: {
              stage: 'client_redirect_uuid_validation',
              redirectTo: result.redirectTo,
              server_debug: result.debug ?? null,
              attemptedPayload,
            },
          });
          setIsSubmitting(false);
          return;
        }

        setModal({
          status: 'success',
          message: result.message || 'Registro enviado exitosamente',
          redirectTo: result.redirectTo,
        });

        return;
      }

      setModal({
        status: 'error',
        message: result.message || 'Error al enviar el registro',
        debug: {
          server_debug: result.debug ?? null,
          attemptedPayload,
        },
      });
      setIsSubmitting(false);
    } catch (error) {
      setModal({
        status: 'error',
        message: 'Error al enviar el registro. Verifique conectividad y datos capturados.',
        debug: {
          stage: 'client_exception',
          error: error instanceof Error ? error.message : 'unknown_error',
          field_responses_payload: responses,
        },
      });
      setIsSubmitting(false);
    }
  }

  function handleModalAccept() {
    if (modal?.status === 'success' && modal.redirectTo) {
      router.push(modal.redirectTo);
      return;
    }

    setModal(null);
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {isRejected ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          <p className="font-semibold">Registro rechazado con observaciones de auditoria.</p>
          <p className="mt-2 leading-6">
            {rejectionComments ?? 'El registro fue devuelto sin comentarios adicionales.'}
          </p>
        </div>
      ) : null}

      {modal ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
        >
          <div className="w-11/12 max-w-md rounded-lg bg-white p-6 text-center shadow-2xl">
            {modal.status === 'success' ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-4xl font-bold text-emerald-700">
                  ✓
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">
                  Inspeccion Guardada
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {modal.message}
                </p>
                <button
                  className="mt-5 h-12 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 active:bg-emerald-900"
                  onClick={handleModalAccept}
                  type="button"
                >
                  Aceptar
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-4xl font-bold text-red-700">
                  !
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">
                  Fallo en la Transaccion (GxP)
                </h2>
                <pre className="mt-4 whitespace-pre-wrap rounded-md bg-red-50 p-3 text-left text-xs font-semibold text-red-700">
                  {modal.message}
                </pre>
                <details className="mt-2 text-left">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                    Consola de Depuracion de Emergencia
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-x-auto rounded-md border border-slate-700 bg-slate-900 p-3 font-mono text-[10px] text-green-400">
                    {JSON.stringify(modal.debug ?? {}, null, 2)}
                  </pre>
                </details>
                <button
                  className="mt-5 h-12 w-full rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 active:bg-red-900"
                  onClick={handleModalAccept}
                  type="button"
                >
                  Aceptar y Revisar Datos
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      <input name="asset_uuid" type="hidden" value={assetUuid.trim()} />
      <input name="activo_id" type="hidden" value={activoId} />
      <input name="maintenance_record_uuid" type="hidden" value={maintenanceRecordUuid ?? ''} />
      <input
        name="field_responses_payload"
        type="hidden"
        value={JSON.stringify(responses)}
      />

      {Object.entries(safeCamposPorSeccion).map(([sectionName, sectionCampos]) => (
        <section
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          key={sectionName}
        >
          <h2 className="text-base font-semibold tracking-normal text-slate-950">
            {sectionName}
          </h2>

          <div className="mt-4 grid gap-4">
            {(Array.isArray(sectionCampos) ? sectionCampos : []).map((campo) => {
              const fieldKey = getFieldKey(campo);
              const response = responses.find((item) => item.field_key === fieldKey);
              const isChecklist = isChecklistField(campo.field_type);
              const isNumeric = isNumericField(campo.field_type);
              const isText = !isChecklist && !isNumeric;

              return (
                <fieldset
                  className={`rounded-md border p-3 ${
                    response?.is_out_of_range
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-slate-200 bg-white'
                  }`}
                  key={campo.id}
                >
                  <legend className="px-1 text-sm font-semibold text-slate-800">
                    {campo.field_label}
                    {campo.required ? <span className="ml-1 text-red-700">*</span> : null}
                  </legend>

                  {isChecklist ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                      {['OK', 'N/A', 'NOK'].map((option) => (
                        <label
                          className={`flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 has-[:checked]:border-sky-700 has-[:checked]:bg-sky-50 has-[:checked]:text-sky-800 ${
                            isReadOnly ? 'cursor-not-allowed opacity-60' : ''
                          }`}
                          key={option}
                        >
                          <input
                            className="sr-only"
                            checked={(response?.value_text ?? '') === option}
                            name={`campo-${fieldKey}`}
                            onChange={() => handleChecklistChange(campo, option)}
                            disabled={!!isReadOnly}
                            required={Boolean(campo.required)}
                            type="radio"
                            value={option}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {isNumeric ? (
                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center gap-2">
                        <input
                          className="h-12 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                          inputMode="decimal"
                          name={`campo-${fieldKey}`}
                          onChange={(event) => handleNumericChange(campo, event.target.value)}
                          disabled={!!isReadOnly}
                          required={Boolean(campo.required)}
                          type="number"
                          value={response?.value_numeric ?? ''}
                        />
                        {campo.unit ? (
                          <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                            {campo.unit}
                          </span>
                        ) : null}
                      </div>

                      {campo.minimum_value !== null || campo.maximum_value !== null ? (
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          Recomendado: {campo.minimum_value ?? '-'} -{' '}
                          {campo.maximum_value ?? '-'} {campo.unit ?? ''}
                        </p>
                      ) : null}

                      {response?.is_out_of_range ? (
                        <p className="mt-2 rounded-md border border-amber-200 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
                          Parametro fuera de rango. Requiere justificacion tecnica en observaciones finales.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {isText ? (
                    <input
                      className="mt-3 h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      name={`campo-${fieldKey}`}
                      onChange={(event) => handleTextChange(campo, event.target.value)}
                      disabled={!!isReadOnly}
                      required={Boolean(campo.required)}
                      type="text"
                      value={response?.value_text ?? ''}
                    />
                  ) : null}

                  {campo.help_text ? (
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      {campo.help_text}
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold tracking-normal text-slate-950">
          Adjuntos y observaciones
        </h2>

        <label className="mt-4 flex min-h-12 w-full items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
          Adjuntar evidencias multiples
          <input
            accept="image/*"
            capture="environment"
            className="sr-only"
            multiple
            name="evidencias"
            onChange={(event) => handleEvidenceFileChange(event.target.files)}
            ref={evidenceInputRef}
            disabled={!!isReadOnly}
            type="file"
          />
        </label>
        {previewFiles.length > 0 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto rounded-md border border-slate-100 bg-white p-2">
            {previewFiles.map((previewFile, index) => (
              <div
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm"
                key={`${previewFile.url}-${index}`}
              >
                <img
                  alt={`Evidencia seleccionada ${index + 1}`}
                  className="h-full w-full object-cover"
                  src={previewFile.url}
                />
                <button
                  aria-label={`Quitar evidencia ${index + 1}`}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/70 bg-slate-950/80 text-[11px] font-black leading-none text-white shadow-sm transition hover:bg-red-700"
                  onClick={() => handleRemoveEvidenceFile(index)}
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-xs leading-5 text-slate-600">
          Ruta preparada: evidencias-mantenimiento/{assetUuid}/
        </p>

        <textarea
          className={`mt-4 min-h-28 w-full rounded-md border bg-white p-3 text-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100 ${
            hasOutOfRange ? 'border-amber-300 bg-amber-50' : 'border-slate-300'
          } disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}
          name="technical_observations"
          placeholder="Observaciones finales o justificacion tecnica"
          readOnly={!!isReadOnly}
          disabled={!!isReadOnly}
          required={hasOutOfRange}
        />
      </section>

      {!isReadOnly ? (
        <button
          className="h-12 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200 active:bg-sky-900 disabled:bg-slate-400"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Enviando registro...' : 'Guardar inspeccion'}
        </button>
      ) : null}
    </form>
  );
}
