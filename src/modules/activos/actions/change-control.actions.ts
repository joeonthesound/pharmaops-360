'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

export type ChangeControlJson = Record<string, unknown>;

export type ChangeControlActionResult = {
  ok: boolean;
  message: string;
  changeControlId?: string;
  diagnostic: {
    formId: 'FOR-PDAC-CC';
    screenId: 'SCREEN-ACT-CC-01';
    stage: string;
    assetId?: number;
    timestampUtc?: string;
    supabaseError?: {
      code: string | null;
      message: string | null;
      details: string | null;
      hint: string | null;
    } | null;
  };
};

type SupabaseMutationError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

type ChangeControlInsertException = Error & {
  stage?: string;
  supabaseError?: Exclude<SupabaseMutationError, null>;
  timestampUtc?: string;
};

const FORM_ID = 'FOR-PDAC-CC';
const SCREEN_ID = 'SCREEN-ACT-CC-01';
const PENDING_STATUS = 'PENDIENTE';

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').normalize('NFC').trim();
}

function sanitizeSupabaseError(error: SupabaseMutationError) {
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

function buildFailureResult(
  message: string,
  diagnostic: ChangeControlActionResult['diagnostic'],
): ChangeControlActionResult {
  return {
    ok: false,
    message,
    diagnostic,
  };
}

function sanitizeJsonbValue(value: unknown): unknown {
  if (typeof value === 'undefined') {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonbValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeJsonbValue(item),
      ]),
    );
  }

  return value;
}

function sanitizeJsonbObject(value: ChangeControlJson): ChangeControlJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return sanitizeJsonbValue(value) as ChangeControlJson;
}

function getSuperadminDebugFlag() {
  const globalDebug = (
    globalThis as typeof globalThis & {
      ENABLE_SUPERADMIN_DEBUG_LOGS?: boolean;
    }
  ).ENABLE_SUPERADMIN_DEBUG_LOGS;

  return process.env.ENABLE_SUPERADMIN_DEBUG_LOGS === 'true' || globalDebug === true;
}

export async function submitChangeControlAction(
  assetId: number,
  datosAnteriores: ChangeControlJson,
  datosNuevos: ChangeControlJson,
  justificacionTecnica: string,
): Promise<ChangeControlActionResult> {
  const normalizedJustification = normalizeText(justificacionTecnica);

  if (!Number.isFinite(assetId) || assetId <= 0) {
    return buildFailureResult('asset_id debe ser numerico y corresponder a public.activos.id.', {
      formId: FORM_ID,
      screenId: SCREEN_ID,
      stage: 'asset_id_validation',
    });
  }

  if (normalizedJustification.length < 15) {
    return buildFailureResult(
      'La justificacion tecnica debe contener al menos 15 caracteres.',
      {
        formId: FORM_ID,
        screenId: SCREEN_ID,
        stage: 'technical_justification_validation',
        assetId,
      },
    );
  }

  try {
    const timestampUtc = new Date().toISOString();
    const requestHeaders = await headers();
    const clientIp =
      requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      requestHeaders.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent =
      requestHeaders.get('user-agent') || 'Industrial Terminal/Unknown';
    const metadata_seguridad = {
      ip: clientIp || '127.0.0.1',
      userAgent: userAgent || 'Industrial Terminal/Unknown',
      timestamp: new Date().toISOString(),
    };
    const cleanDatosAnteriores = sanitizeJsonbObject(datosAnteriores);
    const cleanDatosNuevos = sanitizeJsonbObject(datosNuevos);
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return buildFailureResult('No fue posible leer la sesion del operador GxP.', {
        formId: FORM_ID,
        screenId: SCREEN_ID,
        stage: 'operator_session_lookup',
        assetId,
        timestampUtc,
        supabaseError: sanitizeSupabaseError(userError),
      });
    }

    if (!user?.id) {
      return buildFailureResult('No fue posible identificar el UUID del operador GxP.', {
        formId: FORM_ID,
        screenId: SCREEN_ID,
        stage: 'operator_uuid_validation',
        assetId,
        timestampUtc,
      });
    }

    const insertPayload = {
      asset_id: assetId,
      datos_anteriores: cleanDatosAnteriores,
      datos_nuevos: cleanDatosNuevos,
      justificacion_tecnica: normalizedJustification,
      status_control: PENDING_STATUS,
      creado_por: user.id,
      metadata_seguridad,
    };

    const userId = user.id;
    const enableDebug = getSuperadminDebugFlag();

    if (enableDebug) {
      const debugPayload = {
        ...insertPayload,
        creado_por: userId,
      };

      console.log(
        '[GxP FORENSIC AUDIT TRAIL LOG] Payload ready for public.control_cambios_activos:',
        JSON.stringify(debugPayload, null, 2),
      );
    }

    let data: { id?: string | number | null } | null = null;

    try {
      const insertResult = await supabase
        .from('control_cambios_activos')
        .insert([
          {
            ...insertPayload,
            creado_por: userId,
          },
        ])
        .select('id')
        .single();

      if (insertResult.error) {
        console.error(
          '[GxP CONTROL CAMBIOS INSERT RAW ERROR]',
          insertResult.error.message,
          {
            code: insertResult.error.code,
            details: insertResult.error.details,
            hint: insertResult.error.hint,
          },
        );

        const insertException = new Error(
          insertResult.error.message,
        ) as ChangeControlInsertException;
        insertException.stage = 'control_cambios_activos_insert';
        insertException.supabaseError = insertResult.error;
        insertException.timestampUtc = timestampUtc;
        throw insertException;
      }

      data = insertResult.data;
    } catch (error) {
      console.error(
        '[GxP CONTROL CAMBIOS INSERT EXCEPTION]',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }

    revalidatePath('/activos/hvac');

    return {
      ok: true,
      message: 'Solicitud de control de cambios registrada como PENDIENTE.',
      changeControlId:
        typeof data?.id === 'string' ? data.id : data?.id ? String(data.id) : undefined,
      diagnostic: {
        formId: FORM_ID,
        screenId: SCREEN_ID,
        stage: 'control_cambios_activos_inserted',
        assetId,
        timestampUtc,
      },
    };
  } catch (error) {
    const insertException = error as ChangeControlInsertException;

    if (insertException.stage === 'control_cambios_activos_insert') {
      return buildFailureResult('No fue posible registrar el control de cambios del activo.', {
        formId: FORM_ID,
        screenId: SCREEN_ID,
        stage: 'control_cambios_activos_insert',
        assetId,
        timestampUtc: insertException.timestampUtc,
        supabaseError: sanitizeSupabaseError(insertException.supabaseError ?? null),
      });
    }

    return buildFailureResult('Fallo inesperado al registrar el control de cambios.', {
      formId: FORM_ID,
      screenId: SCREEN_ID,
      stage: 'unexpected_exception',
      assetId,
      supabaseError: {
        code: 'unexpected_exception',
        message: error instanceof Error ? error.message : 'Unknown server action error',
        details: null,
        hint: null,
      },
    });
  }
}
