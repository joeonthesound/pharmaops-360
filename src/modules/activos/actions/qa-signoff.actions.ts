'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { supabase as publicSupabase } from '@/shared/lib/supabase';

export type JsonObject = Record<string, unknown>;

export type ChangeControlReviewRow = {
  id: string;
  asset_id: number;
  creado_por: string;
  creado_at: string | null;
  datos_anteriores: JsonObject;
  datos_nuevos: JsonObject;
  justificacion_tecnica: string;
  status_control: string;
  metadata_seguridad: JsonObject;
};

type SupabaseDiagnosticError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

const CHANGE_CONTROL_SELECT =
  'id, asset_id, creado_por, creado_at, datos_anteriores, datos_nuevos, justificacion_tecnica, status_control, metadata_seguridad';
const PENDING_STATUS = 'PENDIENTE';
const REJECTED_STATUS = 'RECHAZADO - DESVIACIÓN';
const HUB_PATH = '/admin/hub-firmas';
const ASSET_EVIDENCE_BUCKET = 'evidencias-mantenimiento';
const ASSET_EVIDENCE_PREFIX = 'activos';

function normalizeText(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? '').normalize('NFC').trim();
}

function sanitizeSupabaseError(error: SupabaseDiagnosticError) {
  if (!error) {
    return null;
  }

  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function normalizeJsonObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function cleanAssetStoragePath(value: string | null | undefined) {
  const trimmedValue = String(value ?? '').trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    try {
      const url = new URL(trimmedValue);
      const publicStorageMarker = `/storage/v1/object/public/${ASSET_EVIDENCE_BUCKET}/`;
      const markerIndex = url.pathname.indexOf(publicStorageMarker);

      if (markerIndex >= 0) {
        return url.pathname.slice(markerIndex + publicStorageMarker.length);
      }
    } catch {
      return trimmedValue;
    }

    return trimmedValue;
  }

  const publicStorageMarker = `/storage/v1/object/public/${ASSET_EVIDENCE_BUCKET}/`;
  const markerIndex = trimmedValue.indexOf(publicStorageMarker);
  const rawPath =
    markerIndex >= 0
      ? trimmedValue.slice(markerIndex + publicStorageMarker.length)
      : trimmedValue;

  return rawPath
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== ASSET_EVIDENCE_BUCKET)
    .join('/');
}

function resolveAssetStoragePath(value: string | null | undefined) {
  const cleanPath = cleanAssetStoragePath(value);

  if (!cleanPath) {
    return null;
  }

  if (cleanPath === ASSET_EVIDENCE_PREFIX || cleanPath.startsWith(`${ASSET_EVIDENCE_PREFIX}/`)) {
    return cleanPath;
  }

  return `${ASSET_EVIDENCE_PREFIX}/${cleanPath}`;
}

function resolveAssetImagePublicUrl(value: string | null | undefined) {
  const trimmedValue = String(value ?? '').trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue) && !trimmedValue.includes('/storage/v1/object/')) {
    return trimmedValue;
  }

  const cleanPath = cleanAssetStoragePath(trimmedValue);
  const storagePath = resolveAssetStoragePath(trimmedValue);

  if (!cleanPath || !storagePath) {
    return null;
  }

  if (process.env.ENABLE_SUPERADMIN_DEBUG_LOGS === 'true') {
    console.log('[QA REVIEW IMAGE URL RESOLUTION]', {
      bucket: ASSET_EVIDENCE_BUCKET,
      raw: trimmedValue,
      cleanPath,
      storagePath,
    });
  }

  return publicSupabase.storage.from(ASSET_EVIDENCE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

function resolveStoragePathsInJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => resolveStoragePathsInJson(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as JsonObject).map(([key, item]) => {
      const normalizedKey = key.trim().toLowerCase();

      if (
        typeof item === 'string' &&
        ['image_url', 'imagen_url', 'asset_reference_image_url'].includes(normalizedKey)
      ) {
        return [key, resolveAssetImagePublicUrl(item)];
      }

      return [key, resolveStoragePathsInJson(item)];
    }),
  );
}

function normalizeChangeControlRow(value: unknown): ChangeControlReviewRow {
  const row = value as Partial<ChangeControlReviewRow>;

  return {
    id: String(row.id ?? ''),
    asset_id: Number(row.asset_id ?? 0),
    creado_por: String(row.creado_por ?? ''),
    creado_at: typeof row.creado_at === 'string' ? row.creado_at : null,
    datos_anteriores: normalizeJsonObject(resolveStoragePathsInJson(row.datos_anteriores)),
    datos_nuevos: normalizeJsonObject(resolveStoragePathsInJson(row.datos_nuevos)),
    justificacion_tecnica: String(row.justificacion_tecnica ?? ''),
    status_control: String(row.status_control ?? ''),
    metadata_seguridad: normalizeJsonObject(row.metadata_seguridad),
  };
}

export async function fetchPendingChangeControls(): Promise<{
  rows: ChangeControlReviewRow[];
  error: ReturnType<typeof sanitizeSupabaseError>;
}> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('control_cambios_activos')
    .select(CHANGE_CONTROL_SELECT)
    .eq('status_control', PENDING_STATUS)
    .order('creado_at', { ascending: false });

  if (error) {
    return {
      rows: [],
      error: sanitizeSupabaseError(error),
    };
  }

  return {
    rows: (data ?? []).map((row) => normalizeChangeControlRow(row)),
    error: null,
  };
}

export async function fetchChangeControlReview(
  changeControlId: string,
): Promise<{
  row: ChangeControlReviewRow | null;
  error: ReturnType<typeof sanitizeSupabaseError>;
}> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('control_cambios_activos')
    .select(CHANGE_CONTROL_SELECT)
    .eq('id', changeControlId)
    .maybeSingle();

  if (error) {
    return {
      row: null,
      error: sanitizeSupabaseError(error),
    };
  }

  return {
    row: data ? normalizeChangeControlRow(data) : null,
    error: null,
  };
}

async function getQaUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    throw new Error('No fue posible identificar el usuario QA para la firma electronica.');
  }

  return {
    supabase,
    userId: user.id,
  };
}

export async function approveChangeControlAction(formData: FormData) {
  const changeControlId = normalizeText(formData.get('change_control_id'));

  if (!changeControlId) {
    throw new Error('Identificador de control de cambios requerido.');
  }

  const { supabase, userId } = await getQaUserId();
  const { error } = await supabase.rpc('aprobar_control_cambios', {
    p_change_id: changeControlId,
    p_qa_user: userId,
  });

  if (error) {
    console.error('[QA SIGNOFF] Error ejecutando aprobar_control_cambios', {
      changeControlId,
      qaUser: userId,
      supabase_error: sanitizeSupabaseError(error),
    });
    throw new Error(error.message);
  }

  revalidatePath(HUB_PATH);
  revalidatePath(`${HUB_PATH}/${changeControlId}`);
  redirect(HUB_PATH);
}

export async function rejectChangeControlAction(formData: FormData) {
  const changeControlId = normalizeText(formData.get('change_control_id'));
  const rejectionComment = normalizeText(formData.get('rejection_comment'));

  if (!changeControlId) {
    throw new Error('Identificador de control de cambios requerido.');
  }

  if (rejectionComment.length < 15) {
    throw new Error('El comentario de rechazo debe contener al menos 15 caracteres.');
  }

  const { supabase, userId } = await getQaUserId();
  const { row, error: lookupError } = await fetchChangeControlReview(changeControlId);

  if (lookupError || !row) {
    throw new Error(
      lookupError?.message ?? 'No fue posible localizar el control de cambios para rechazo.',
    );
  }

  const metadataSeguridad = {
    ...row.metadata_seguridad,
    qa_rejection: {
      rejected_by: userId,
      rejected_at: new Date().toISOString(),
      comment: rejectionComment,
    },
  };

  const { error } = await supabase
    .from('control_cambios_activos')
    .update({
      status_control: REJECTED_STATUS,
      metadata_seguridad: metadataSeguridad,
    })
    .eq('id', changeControlId);

  if (error) {
    console.error('[QA SIGNOFF] Error rechazando control de cambios', {
      changeControlId,
      qaUser: userId,
      supabase_error: sanitizeSupabaseError(error),
    });
    throw new Error(error.message);
  }

  revalidatePath(HUB_PATH);
  revalidatePath(`${HUB_PATH}/${changeControlId}`);
  redirect(HUB_PATH);
}
