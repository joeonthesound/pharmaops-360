'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

export type AssetManagementAction = 'create' | 'edit' | 'delete';

export type AssetManagementAssetInput = {
  uuid?: string | null;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  site: string | null;
  area: string;
  location_detail: string | null;
  brand: string;
  model: string;
  serial_number: string;
  capacity: string;
  capacity_unit: string;
  installation_date: string | null;
  status: string;
  maintenance_frequency: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  internal_responsible: string | null;
  technical_provider: string | null;
  qr_possible: boolean;
  notes: string;
};

export type AssetManagementPayload = {
  action: AssetManagementAction;
  targetUuid?: string | null;
  justification: string;
  asset: AssetManagementAssetInput;
};

export type AssetManagementResult = {
  ok: boolean;
  message: string;
  debug?: unknown;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').normalize('NFC').trim();
}

function emptyToNull(value: string | null | undefined) {
  const normalizedValue = normalizeText(value);

  return normalizedValue ? normalizedValue : null;
}

function sanitizeSupabaseError(
  error:
    | {
        code?: string;
        message?: string;
        details?: string;
        hint?: string;
      }
    | null,
) {
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

function buildAssetRow(asset: AssetManagementAssetInput) {
  return {
    uuid: normalizeText(asset.uuid) || crypto.randomUUID(),
    asset_code: normalizeText(asset.asset_code).toUpperCase(),
    asset_name: normalizeText(asset.asset_name),
    asset_type: normalizeText(asset.asset_type) || 'Sistemas HVAC',
    site: emptyToNull(asset.site),
    area: normalizeText(asset.area),
    location_detail: emptyToNull(asset.location_detail),
    brand: normalizeText(asset.brand),
    model: normalizeText(asset.model),
    serial_number: normalizeText(asset.serial_number),
    capacity: normalizeText(asset.capacity),
    capacity_unit: normalizeText(asset.capacity_unit),
    installation_date: emptyToNull(asset.installation_date),
    status: normalizeText(asset.status) || 'Operativo',
    maintenance_frequency: normalizeText(asset.maintenance_frequency) || 'Mensual',
    last_maintenance_date: emptyToNull(asset.last_maintenance_date),
    next_maintenance_date: emptyToNull(asset.next_maintenance_date),
    internal_responsible: emptyToNull(asset.internal_responsible),
    technical_provider: emptyToNull(asset.technical_provider),
    qr_possible: Boolean(asset.qr_possible),
    notes: normalizeText(asset.notes),
  };
}

async function insertAuditLog({
  action,
  justification,
  payloadSnapshot,
  userEmail,
  userId,
  targetUuid,
}: {
  action: AssetManagementAction;
  justification: string;
  payloadSnapshot: Record<string, unknown>;
  userEmail: string | null;
  userId: string | null;
  targetUuid: string;
}) {
  const supabase = await createSupabaseServerClient();
  const timestamp = new Date().toISOString();
  const { error } = await supabase.from('auditoria_log_cambios').insert({
    usuario_email: userEmail,
    usuario_id: userId,
    timestamp,
    accion: action,
    justificacion: justification,
    payload_snapshot: payloadSnapshot,
    entidad: 'activos',
    entidad_uuid: targetUuid,
  });

  return error;
}

export async function saveAssetManagementForm(
  payload: AssetManagementPayload,
): Promise<AssetManagementResult> {
  const justification = normalizeText(payload.justification);

  if (justification.length < 15) {
    return {
      ok: false,
      message: 'La justificación GxP debe contener al menos 15 caracteres.',
      debug: {
        stage: 'server_justification_validation',
        receivedLength: justification.length,
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: 'No fue posible identificar al usuario autenticado para auditoría Part 11.',
      debug: {
        stage: 'auth_user_lookup',
        supabase_error: sanitizeSupabaseError(userError),
      },
    };
  }

  const assetRow = buildAssetRow(payload.asset);
  const targetUuid = normalizeText(payload.targetUuid) || assetRow.uuid;
  let mutationError:
    | {
        code?: string;
        message?: string;
        details?: string;
        hint?: string;
      }
    | null = null;

  if (payload.action === 'create') {
    const { error } = await supabase.from('activos').insert(assetRow);
    mutationError = error;
  }

  if (payload.action === 'edit') {
    if (!targetUuid) {
      return {
        ok: false,
        message: 'Debe especificar el UUID del activo a modificar.',
        debug: { stage: 'edit_target_uuid_validation' },
      };
    }

    const { uuid: _uuid, ...updateRow } = assetRow;
    const { error } = await supabase.from('activos').update(updateRow).eq('uuid', targetUuid);
    mutationError = error;
  }

  if (payload.action === 'delete') {
    if (!targetUuid) {
      return {
        ok: false,
        message: 'Debe especificar el UUID del activo a dar de baja.',
        debug: { stage: 'delete_target_uuid_validation' },
      };
    }

    const { error } = await supabase
      .from('activos')
      .update({
        status: 'Inactivo',
        notes: assetRow.notes || `Baja lógica registrada: ${justification}`,
      })
      .eq('uuid', targetUuid);
    mutationError = error;
  }

  if (mutationError) {
    return {
      ok: false,
      message: 'No fue posible guardar la mutación del activo.',
      debug: {
        stage: `${payload.action}_asset_mutation`,
        supabase_error: sanitizeSupabaseError(mutationError),
      },
    };
  }

  const auditError = await insertAuditLog({
    action: payload.action,
    justification,
    payloadSnapshot: {
      action: payload.action,
      targetUuid,
      changes: payload.action === 'delete' ? { status: 'Inactivo' } : assetRow,
    },
    userEmail: user.email ?? null,
    userId: user.id,
    targetUuid,
  });

  if (auditError) {
    return {
      ok: false,
      message:
        'La mutación fue ejecutada, pero falló la inserción de auditoría 21 CFR Part 11.',
      debug: {
        stage: 'auditoria_log_cambios_insert',
        targetUuid,
        supabase_error: sanitizeSupabaseError(auditError),
      },
    };
  }

  revalidatePath('/activos');
  revalidatePath('/activos/hvac');

  return {
    ok: true,
    message: 'Activo guardado con huella de auditoría GxP.',
  };
}
