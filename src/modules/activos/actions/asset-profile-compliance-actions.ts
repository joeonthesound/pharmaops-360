'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

export type ComplianceActionResult = {
  ok: boolean;
  message: string;
  debug?: unknown;
};

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

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').normalize('NFC').trim();
}

async function getAuthenticatedOperator() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    error,
  };
}

export async function registrarCambioParametroCalificacion({
  activoUuid,
  nuevoSetpoint,
  razon,
}: {
  activoUuid: string;
  nuevoSetpoint: string;
  razon: string;
}): Promise<ComplianceActionResult> {
  const normalizedReason = normalizeText(razon);
  const normalizedSetpoint = normalizeText(nuevoSetpoint);

  if (normalizedReason.length < 15) {
    return {
      ok: false,
      message: 'Debe documentar una razón GxP de al menos 15 caracteres.',
      debug: {
        stage: 'admin_reason_validation',
      },
    };
  }

  if (!normalizedSetpoint) {
    return {
      ok: false,
      message: 'Debe indicar el nuevo setpoint autorizado.',
      debug: {
        stage: 'admin_setpoint_validation',
      },
    };
  }

  const { supabase, user, error: userError } = await getAuthenticatedOperator();

  if (userError || !user) {
    return {
      ok: false,
      message: 'No fue posible identificar al usuario para registrar Audit Trail.',
      debug: {
        stage: 'operator_lookup',
        supabase_error: sanitizeSupabaseError(userError),
      },
    };
  }

  const { error } = await supabase.from('audit_trail').insert({
    entity: 'activos',
    entity_uuid: activoUuid,
    accion: 'QUALIFICATION_PARAMETER_CHANGE',
    usuario: user.email ?? user.id,
    timestamp: new Date().toISOString(),
    comentarios: JSON.stringify({
      reason: normalizedReason,
      new_setpoint: normalizedSetpoint,
      source: 'Perfil Admin',
    }),
  });

  if (error) {
    return {
      ok: false,
      message: 'No fue posible registrar el cambio en Audit Trail.',
      debug: {
        stage: 'audit_trail_insert',
        supabase_error: sanitizeSupabaseError(error),
      },
    };
  }

  revalidatePath(`/activos/hvac/ver/${activoUuid}`);

  return {
    ok: true,
    message: 'Parámetro registrado con huella de auditoría.',
  };
}

export async function descalificarActivoRegulado(
  uuid: string,
  razon = 'Descalificación regulatoria solicitada desde Perfil SuperAdmin.',
): Promise<ComplianceActionResult> {
  const activoUuid = normalizeText(uuid);
  const normalizedReason = normalizeText(razon);

  if (!activoUuid) {
    return {
      ok: false,
      message: 'UUID de activo requerido para descalificación regulada.',
      debug: {
        stage: 'uuid_validation',
      },
    };
  }

  if (normalizedReason.length < 15) {
    return {
      ok: false,
      message: 'Debe documentar una razón GxP de al menos 15 caracteres.',
      debug: {
        stage: 'superadmin_reason_validation',
      },
    };
  }

  const { supabase, user, error: userError } = await getAuthenticatedOperator();

  if (userError || !user) {
    return {
      ok: false,
      message: 'No fue posible identificar al usuario para la descalificación.',
      debug: {
        stage: 'operator_lookup',
        supabase_error: sanitizeSupabaseError(userError),
      },
    };
  }

  const { data: previousAsset, error: previousAssetError } = await supabase
    .from('activos')
    .select('*')
    .eq('uuid', activoUuid)
    .maybeSingle();

  if (previousAssetError || !previousAsset) {
    return {
      ok: false,
      message: 'No fue posible localizar el activo regulado.',
      debug: {
        stage: 'asset_lookup',
        supabase_error: sanitizeSupabaseError(previousAssetError),
      },
    };
  }

  const disabledAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('activos')
    .update({
      status: 'Descalificado',
      disabled_at: disabledAt,
    })
    .eq('uuid', activoUuid);

  if (updateError) {
    return {
      ok: false,
      message: 'No fue posible descalificar lógicamente el activo.',
      debug: {
        stage: 'asset_soft_delete_update',
        supabase_error: sanitizeSupabaseError(updateError),
      },
    };
  }

  const { error: historyError } = await supabase.from('activos_historial_cambios').insert({
    activo_id: activoUuid,
    usuario_id: user.id,
    accion: 'inactivate',
    valores_anteriores: previousAsset,
    valores_nuevos: {
      ...(previousAsset as Record<string, unknown>),
      status: 'Descalificado',
      disabled_at: disabledAt,
    },
    justificacion_gxp: normalizedReason,
  });

  if (historyError) {
    return {
      ok: false,
      message:
        'El activo fue descalificado, pero falló la escritura del historial inmutable.',
      debug: {
        stage: 'activos_historial_cambios_insert',
        supabase_error: sanitizeSupabaseError(historyError),
      },
    };
  }

  revalidatePath('/activos/hvac');
  revalidatePath(`/activos/hvac/ver/${activoUuid}`);

  return {
    ok: true,
    message: 'Activo descalificado lógicamente con historial ALCOA+.',
  };
}
