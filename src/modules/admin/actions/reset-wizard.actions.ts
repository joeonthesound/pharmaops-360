'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

export type ResetWizardActionResult = {
  ok: boolean;
  message: string;
  debug?: unknown;
};

export type SeedRoleInput = {
  technicianEmail: string;
  technicianPin: string;
  supervisorEmail: string;
  supervisorPin: string;
  qaEmail: string;
  qaPin: string;
};

const RESET_TARGET_TABLES = [
  'valores_caracteristicas',
  'caracteristicas_maestras',
  'firmas_ordenes',
  'ordenes_mantenimiento',
  'activos',
] as const;

const HVAC_TEMPLATE_FIELDS = [
  {
    field_key: 'temperatura_descarga',
    field_label: 'Temperatura de descarga',
    field_type: 'NUMERIC',
    required: true,
    unit: 'C',
    section_name: 'Parametros Instrumentales',
    section_order: 1,
    field_order: 1,
  },
  {
    field_key: 'presion_succion',
    field_label: 'Presion de succion',
    field_type: 'NUMERIC',
    required: true,
    unit: 'Pa',
    section_name: 'Parametros Instrumentales',
    section_order: 1,
    field_order: 2,
  },
  {
    field_key: 'humedad_relativa',
    field_label: 'Humedad relativa',
    field_type: 'NUMERIC',
    required: true,
    unit: '% RH',
    section_name: 'Parametros Instrumentales',
    section_order: 1,
    field_order: 3,
  },
];

const HVAC_MASTER_FEATURES = [
  {
    nombre_parametro: 'Presion_Diferencial',
    text_label_frontend: 'Presión Diferencial',
    unidad_medida: 'Pa',
    tipo_dato: 'NUMERIC' as const,
  },
  {
    nombre_parametro: 'Temperatura_Ambiente',
    text_label_frontend: 'Temperatura Ambiente',
    unidad_medida: '°C',
    tipo_dato: 'NUMERIC' as const,
  },
  {
    nombre_parametro: 'Humedad_Relativa',
    text_label_frontend: 'Humedad Relativa',
    unidad_medida: '% RH',
    tipo_dato: 'NUMERIC' as const,
  },
];

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').normalize('NFC').trim();
}

function normalizeEmail(value: string | null | undefined) {
  return normalizeText(value).toLowerCase();
}

function sanitizeError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return error instanceof Error ? { message: error.message } : error;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  return {
    code: candidate.code ?? null,
    message: candidate.message ?? null,
    details: candidate.details ?? null,
    hint: candidate.hint ?? null,
  };
}

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY no esta configurado para el reset wizard de desarrollo.',
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function assertDevelopmentUtilityAccess() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Reset Wizard bloqueado fuera de NODE_ENV=development.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    throw new Error('Sesion administrativa requerida para ejecutar el Reset Wizard.');
  }

  return {
    actorEmail: normalizeEmail(user.email),
    actorId: user.id,
  };
}

async function purgeTableIfExists(tableName: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from(tableName).delete().neq('id', -1);

  if (error?.code === '42P01') {
    return {
      tableName,
      ok: true,
      skipped: true,
      reason: 'table_not_found',
    };
  }

  if (error) {
    return {
      tableName,
      ok: false,
      error: sanitizeError(error),
    };
  }

  return {
    tableName,
    ok: true,
  };
}

export async function purgeDevelopmentDataAction(): Promise<ResetWizardActionResult> {
  try {
    const actor = await assertDevelopmentUtilityAccess();
    const supabase = createSupabaseServiceClient();

    const { error: rpcError } = await supabase.rpc('dev_truncate_pharmaops_reset_wizard', {
      p_tables: RESET_TARGET_TABLES,
    });

    if (!rpcError) {
      revalidatePath('/activos/hvac');
      revalidatePath('/admin/mantenimiento/reset');

      return {
        ok: true,
        message: 'TRUNCATE CASCADE ejecutado por RPC de desarrollo.',
        debug: {
          actor,
          stage: 'dev_truncate_pharmaops_reset_wizard_rpc',
          tables: RESET_TARGET_TABLES,
        },
      };
    }

    console.warn('[RESET WIZARD] RPC de truncado no disponible, ejecutando purga ordenada.', {
      rpcError: sanitizeError(rpcError),
    });

    const deletionResults = [];

    for (const tableName of RESET_TARGET_TABLES) {
      deletionResults.push(await purgeTableIfExists(tableName));
    }

    const failedDeletion = deletionResults.find((result) => !result.ok);

    if (failedDeletion) {
      return {
        ok: false,
        message: 'La purga ordenada se detuvo por error en una tabla objetivo.',
        debug: {
          actor,
          rpcError: sanitizeError(rpcError),
          deletionResults,
        },
      };
    }

    revalidatePath('/activos/hvac');
    revalidatePath('/admin/mantenimiento/reset');

    return {
      ok: true,
      message:
        'Purga de desarrollo completada. Si requiere RESTART IDENTITY estricto, instale el RPC dev_truncate_pharmaops_reset_wizard en Supabase.',
      debug: {
        actor,
        rpcError: sanitizeError(rpcError),
        deletionResults,
      },
    };
  } catch (error) {
    console.error('[RESET WIZARD] Fallo en purga de desarrollo', error);

    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Fallo desconocido en purga.',
      debug: sanitizeError(error),
    };
  }
}

export async function seedRolesAction(input: SeedRoleInput): Promise<ResetWizardActionResult> {
  try {
    const actor = await assertDevelopmentUtilityAccess();
    const supabase = createSupabaseServiceClient();
    const now = new Date().toISOString();
    const roles = [
      {
        user_email: normalizeEmail(input.technicianEmail),
        full_name: 'Tecnico HVAC Inicial',
        job_title: 'Tecnico de Campo HVAC',
        role: 'Tecnico',
        user_type: 'Tecnico',
        can_execute_maintenance: true,
        can_review: false,
        can_approve: false,
        can_view_audit: false,
        can_manage_users: false,
        notes: JSON.stringify({
          seeded_by: actor.actorEmail,
          seeded_at: now,
          dev_signature_pin: normalizeText(input.technicianPin),
        }),
      },
      {
        user_email: normalizeEmail(input.supervisorEmail),
        full_name: 'Supervisor HVAC Inicial',
        job_title: 'Supervisor de Produccion',
        role: 'Supervisor',
        user_type: 'Supervisor',
        can_execute_maintenance: false,
        can_review: true,
        can_approve: false,
        can_view_audit: true,
        can_manage_users: false,
        notes: JSON.stringify({
          seeded_by: actor.actorEmail,
          seeded_at: now,
          dev_signature_pin: normalizeText(input.supervisorPin),
        }),
      },
      {
        user_email: normalizeEmail(input.qaEmail),
        full_name: 'QA Inicial',
        job_title: 'Quality Assurance',
        role: 'Quality Assurance',
        user_type: 'Quality',
        can_execute_maintenance: false,
        can_review: true,
        can_approve: true,
        can_view_audit: true,
        can_manage_users: false,
        notes: JSON.stringify({
          seeded_by: actor.actorEmail,
          seeded_at: now,
          dev_signature_pin: normalizeText(input.qaPin),
        }),
      },
    ].map((role) => ({
      ...role,
      site: 'Planta Central',
      area: 'HVAC',
      active: true,
      can_create_assets: role.role !== 'Tecnico',
      can_access_forensic_sheet: true,
      can_export_controlled_copies: role.role !== 'Tecnico',
      requires_2fa: false,
    }));

    if (roles.some((role) => !role.user_email)) {
      return {
        ok: false,
        message: 'Todos los correos son obligatorios para poblar roles.',
      };
    }

    const { error } = await supabase.from('usuarios_roles').upsert(roles, {
      onConflict: 'user_email',
    });

    if (error) {
      return {
        ok: false,
        message: 'No fue posible poblar usuarios_roles.',
        debug: sanitizeError(error),
      };
    }

    return {
      ok: true,
      message: 'Roles base de desarrollo poblados correctamente.',
      debug: { actor, rows: roles.length },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Fallo desconocido poblando roles.',
      debug: sanitizeError(error),
    };
  }
}

export async function seedAssetsAction(): Promise<ResetWizardActionResult> {
  try {
    const actor = await assertDevelopmentUtilityAccess();
    const supabase = createSupabaseServiceClient();
    const rows = ['HVAC-01', 'HVAC-02', 'HVAC-03'].map((assetCode) => ({
      asset_code: assetCode,
      asset_name: `Unidad HVAC Baseline ${assetCode}`,
      area: 'HVAC',
      version: 1,
      status: 'Operativo',
      status_gxp: 'APROBADO',
    }));

    const { error } = await supabase.from('activos').upsert(rows, {
      onConflict: 'asset_code',
    });

    if (error) {
      return {
        ok: false,
        message: 'No fue posible poblar activos HVAC base.',
        debug: sanitizeError(error),
      };
    }

    revalidatePath('/activos/hvac');

    return {
      ok: true,
      message: 'Activos HVAC-01, HVAC-02 y HVAC-03 poblados en estado APROBADO.',
      debug: { actor, rows: rows.length },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Fallo desconocido poblando activos.',
      debug: sanitizeError(error),
    };
  }
}

async function ensureHvacTemplateFields() {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('formularios_campos')
    .select('id, field_key')
    .eq('template_code', 'TMP-HVAC-PM');
  const existingRows = (data ?? []) as Array<{ id: number; field_key: string | null }>;
  const existingKeys = new Set(existingRows.map((row) => row.field_key));
  const missingRows = HVAC_TEMPLATE_FIELDS.filter((field) => !existingKeys.has(field.field_key)).map(
    (field) => ({
      ...field,
      template_code: 'TMP-HVAC-PM',
      asset_type: 'Sistemas HVAC',
      help_text: 'Campo baseline generado por Reset Wizard GxP.',
      options: null,
    }),
  );

  if (missingRows.length > 0) {
    await supabase.from('formularios_campos').insert(missingRows);
  }

  const { data: refreshedData, error } = await supabase
    .from('formularios_campos')
    .select('id, field_key')
    .eq('template_code', 'TMP-HVAC-PM');

  if (error) {
    throw new Error(`No fue posible resolver formularios_campos: ${error.message}`);
  }

  return (refreshedData ?? []) as Array<{ id: number; field_key: string | null }>;
}

async function seedMasterFeaturesDictionary() {
  const supabase = createSupabaseServiceClient();
  const { data: existingData, error: existingError } = await supabase
    .from('caracteristicas_maestras')
    .select('id, nombre_parametro')
    .in(
      'nombre_parametro',
      HVAC_MASTER_FEATURES.map((feature) => feature.nombre_parametro),
    );

  if (existingError?.code === '42P01') {
    return {
      ok: true,
      skipped: true,
      reason: 'caracteristicas_maestras_not_found',
      rows: 0,
    };
  }

  if (existingError) {
    return {
      ok: false,
      error: sanitizeError(existingError),
      rows: 0,
    };
  }

  const existingNames = new Set(
    ((existingData ?? []) as Array<{ nombre_parametro: string | null }>).map((row) =>
      normalizeText(row.nombre_parametro),
    ),
  );
  const missingRows = HVAC_MASTER_FEATURES.filter(
    (feature) => !existingNames.has(feature.nombre_parametro),
  );

  if (missingRows.length === 0) {
    return {
      ok: true,
      rows: 0,
    };
  }

  const { error } = await supabase.from('caracteristicas_maestras').insert(missingRows);

  if (error) {
    return {
      ok: false,
      error: sanitizeError(error),
      rows: 0,
    };
  }

  return {
    ok: true,
    rows: missingRows.length,
  };
}

export async function seedInitialWorkOrderAction(
  technicianEmail: string,
): Promise<ResetWizardActionResult> {
  try {
    const actor = await assertDevelopmentUtilityAccess();
    const supabase = createSupabaseServiceClient();
    const normalizedTechnicianEmail = normalizeEmail(technicianEmail);
    const masterFeaturesResult = await seedMasterFeaturesDictionary();

    if (!masterFeaturesResult.ok) {
      return {
        ok: false,
        message: 'No fue posible poblar caracteristicas_maestras.',
        debug: masterFeaturesResult,
      };
    }

    const { data: assetData, error: assetError } = await supabase
      .from('activos')
      .select('asset_code')
      .eq('asset_code', 'HVAC-03')
      .maybeSingle();

    if (assetError || !assetData) {
      return {
        ok: false,
        message: 'HVAC-03 no existe. Ejecute primero el paso de activos.',
        debug: sanitizeError(assetError),
      };
    }

    const ruiUuid = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const recordCode = `WO-HVAC-03-${timestamp.replace(/\D/g, '').slice(0, 14)}`;
    const { error: recordError } = await supabase
      .from('ordenes_mantenimiento')
      .insert({
        id: ruiUuid,
        order_code: recordCode,
        asset_code: 'HVAC-03',
        assigned_technician: normalizedTechnicianEmail,
        created_at: timestamp,
        status: 'PENDING_TECHNICIAN',
      });

    if (recordError) {
      return {
        ok: false,
        message: 'No fue posible crear la orden inicial HVAC-03.',
        debug: sanitizeError(recordError),
      };
    }

    const { data: featureData, error: featureError } = await supabase
      .from('caracteristicas_maestras')
      .select('id, nombre_parametro')
      .in(
        'nombre_parametro',
        HVAC_MASTER_FEATURES.map((feature) => feature.nombre_parametro),
      );

    if (featureError) {
      return {
        ok: false,
        message: 'La orden fue creada, pero no fue posible resolver caracteristicas_maestras.',
        debug: sanitizeError(featureError),
      };
    }

    const nullFeatureValues = ((featureData ?? []) as Array<{ id: number }>).map((feature) => ({
      order_id: ruiUuid,
      caracteristica_id: feature.id,
      valor_registrado: null,
    }));

    if (nullFeatureValues.length > 0) {
      const { error: responseError } = await supabase
        .from('valores_caracteristicas')
        .insert(nullFeatureValues);

      if (responseError) {
        return {
          ok: false,
          message: 'La orden fue creada, pero falló la inserción de valores_caracteristicas NULL.',
          debug: sanitizeError(responseError),
        };
      }
    }

    revalidatePath('/activos/hvac');
    revalidatePath(`/mantenimiento/hvac/rui/ht/${ruiUuid}`);

    return {
      ok: true,
      message: `Orden inicial vacÃ­a generada para HVAC-03: ${recordCode}`,
      debug: {
        actor,
        recordCode,
        ruiUuid,
        nullParameterRows: nullFeatureValues.length,
        masterFeaturesResult,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Fallo desconocido creando orden inicial.',
      debug: sanitizeError(error),
    };
  }
}
