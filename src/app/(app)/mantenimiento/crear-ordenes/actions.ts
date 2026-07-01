'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

export type MaintenanceTemplateField = {
  id: number;
  asset_type: string;
  section_name: string;
  field_key: string;
  field_label: string;
  field_type: string;
  required: boolean;
  unit: string | null;
  options: unknown;
  section_order: number;
  field_order: number;
};

export type GenerateMaintenanceOrderInput = {
  assetUuid: string;
  assetType: string;
};

export type GenerateMaintenanceOrderResult = {
  ok: boolean;
  message: string;
  recordUuid?: string;
  debug?: unknown;
};

const HVAC_BASELINE_TEMPLATE_FIELDS: MaintenanceTemplateField[] = [
  {
    id: -101,
    asset_type: 'Sistemas HVAC',
    section_name: 'Verificacion Inicial',
    field_key: 'estado_general_equipo',
    field_label: 'Estado general del equipo',
    field_type: 'OK_NOK',
    required: true,
    unit: 'N/A',
    options: null,
    section_order: 1,
    field_order: 1,
  },
  {
    id: -102,
    asset_type: 'Sistemas HVAC',
    section_name: 'Verificacion Inicial',
    field_key: 'limpieza_area_trabajo',
    field_label: 'Limpieza del area de trabajo',
    field_type: 'OK_NOK',
    required: true,
    unit: 'N/A',
    options: null,
    section_order: 1,
    field_order: 2,
  },
  {
    id: -201,
    asset_type: 'Sistemas HVAC',
    section_name: 'Parametros Electricos',
    field_key: 'voltaje_operacion',
    field_label: 'Voltaje de operacion',
    field_type: 'NUMERIC',
    required: true,
    unit: 'V',
    options: null,
    section_order: 2,
    field_order: 1,
  },
  {
    id: -202,
    asset_type: 'Sistemas HVAC',
    section_name: 'Parametros Electricos',
    field_key: 'corriente_motor',
    field_label: 'Corriente del motor',
    field_type: 'NUMERIC',
    required: true,
    unit: 'A',
    options: null,
    section_order: 2,
    field_order: 2,
  },
  {
    id: -301,
    asset_type: 'Sistemas HVAC',
    section_name: 'Ciclo de Refrigeracion',
    field_key: 'presion_succion',
    field_label: 'Presion de succion',
    field_type: 'NUMERIC',
    required: true,
    unit: 'PSI',
    options: null,
    section_order: 3,
    field_order: 1,
  },
  {
    id: -302,
    asset_type: 'Sistemas HVAC',
    section_name: 'Ciclo de Refrigeracion',
    field_key: 'temperatura_descarga',
    field_label: 'Temperatura de descarga',
    field_type: 'NUMERIC',
    required: true,
    unit: 'C',
    options: null,
    section_order: 3,
    field_order: 2,
  },
  {
    id: -401,
    asset_type: 'Sistemas HVAC',
    section_name: 'Componentes Especiales',
    field_key: 'estado_filtros_hepa',
    field_label: 'Estado de filtros HEPA',
    field_type: 'OK_NOK',
    required: true,
    unit: 'N/A',
    options: null,
    section_order: 4,
    field_order: 1,
  },
  {
    id: -402,
    asset_type: 'Sistemas HVAC',
    section_name: 'Componentes Especiales',
    field_key: 'observaciones_tecnicas',
    field_label: 'Observaciones tecnicas',
    field_type: 'TEXT',
    required: false,
    unit: 'N/A',
    options: null,
    section_order: 4,
    field_order: 2,
  },
];

type AssetForOrder = {
  uuid: string;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
};

type UsuarioRolRow = {
  can_approve: boolean | null;
  can_create_assets: boolean | null;
};

type SupabaseMutationError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

const HVAC_TEMPLATE_CODE = 'TMP-HVAC-PM';

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').normalize('NFC').trim();
}

function isHvacAssetType(assetType: string) {
  return normalizeText(assetType).toLowerCase() === 'sistemas hvac';
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

function buildRecordCode(assetCode: string) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);

  return `WO-${assetCode}-${timestamp}`;
}

function buildTemplateCode(assetType: string) {
  if (isHvacAssetType(assetType)) {
    return HVAC_TEMPLATE_CODE;
  }

  return `TPL-${assetType.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`;
}

async function canCreateOrders() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email?.trim().toLowerCase() ?? '';

  if (!userEmail) {
    return {
      allowed: false,
      userEmail: null,
    };
  }

  const { data } = await supabase
    .from('usuarios_roles')
    .select('can_approve, can_create_assets')
    .eq('user_email', userEmail)
    .eq('active', true);

  const profiles = (data ?? []) as UsuarioRolRow[];

  return {
    allowed: profiles.some(
      (profile) => profile.can_approve === true || profile.can_create_assets === true,
    ),
    userEmail,
  };
}

function normalizeTemplateField(row: Record<string, unknown>): MaintenanceTemplateField {
  const id = typeof row.id === 'number' ? row.id : Number(row.id ?? 0);

  return {
    id,
    asset_type: normalizeText(row.asset_type as string | null | undefined),
    section_name: normalizeText(
      (row.section_name ??
        row.seccion_nombre ??
        row.section ??
        'Parametros de mantenimiento') as string,
    ),
    field_key: normalizeText(
      (row.field_key ?? row.campo_key ?? row.campo_nombre ?? `campo_${id}`) as string,
    )
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, ''),
    field_label: normalizeText((row.field_label ?? row.campo_nombre ?? row.label ?? `Campo ${id}`) as string),
    field_type: normalizeText((row.field_type ?? row.tipo_dato ?? 'TEXT') as string),
    required: Boolean(row.required),
    unit:
      row.unit === null && row.unidad_medida === null
        ? null
        : normalizeText((row.unit ?? row.unidad_medida ?? 'N/A') as string),
    options: row.options ?? null,
    section_order:
      typeof row.section_order === 'number' ? row.section_order : Number(row.section_order ?? 999),
    field_order:
      typeof row.field_order === 'number' ? row.field_order : Number(row.field_order ?? 999),
  };
}

async function getHistoricalHvacTemplateFields() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('formularios_campos')
    .select('*')
    .eq('template_code', HVAC_TEMPLATE_CODE)
    .order('section_order', { ascending: true })
    .order('field_order', { ascending: true });

  if (error) {
    console.error('[CREAR ORDENES] Error cargando plantilla historica HVAC', {
      templateCode: HVAC_TEMPLATE_CODE,
      code: error.code,
      message: error.message,
    });

    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) =>
      normalizeTemplateField({
        ...row,
        asset_type: 'Sistemas HVAC',
      }),
    )
    .sort((left, right) => {
      if (left.section_order !== right.section_order) {
        return left.section_order - right.section_order;
      }

      return left.field_order - right.field_order;
    });
}

export async function getTemplateFieldsForAssetType(assetType: string) {
  const normalizedAssetType = normalizeText(assetType);

  if (!normalizedAssetType) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('mantenimiento_plantillas_campos')
    .select('*')
    .eq('asset_type', normalizedAssetType);

  if (error) {
    console.error('[CREAR ORDENES] Error cargando plantilla dinamica', {
      assetType: normalizedAssetType,
      code: error.code,
      message: error.message,
    });

    return [];
  }

  const fields = ((data ?? []) as Array<Record<string, unknown>>)
    .map(normalizeTemplateField)
    .sort((left, right) => {
      if (left.section_order !== right.section_order) {
        return left.section_order - right.section_order;
      }

      return left.field_order - right.field_order;
    });

  if (fields.length > 0) {
    return fields;
  }

  if (isHvacAssetType(normalizedAssetType)) {
    const historicalFields = await getHistoricalHvacTemplateFields();

    if (historicalFields.length > 0) {
      return historicalFields;
    }

    return HVAC_BASELINE_TEMPLATE_FIELDS;
  }

  return fields;
}

function buildInitialLayout(templateFields: MaintenanceTemplateField[]) {
  return templateFields.map((field) => ({
    field_id: field.id > 0 ? field.id : null,
    field_key: field.field_key,
    field_label: field.field_label,
    field_type: field.field_type,
    section_name: field.section_name,
    required: field.required,
    unit: field.unit,
    value: null,
    value_text: null,
    value_numeric: null,
    is_out_of_range: false,
  }));
}

export async function generateMaintenanceOrder(
  input: GenerateMaintenanceOrderInput,
): Promise<GenerateMaintenanceOrderResult> {
  const assetUuid = normalizeText(input.assetUuid);
  const requestedAssetType = normalizeText(input.assetType);
  const access = await canCreateOrders();

  if (!access.allowed) {
    return {
      ok: false,
      message: 'Perfil sin capacidades autorizadas para generar ordenes.',
    };
  }

  if (!assetUuid || !requestedAssetType) {
    return {
      ok: false,
      message: 'Debe seleccionar un activo valido.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: assetData, error: assetError } = await supabase
    .from('activos')
    .select('uuid, asset_code, asset_name, asset_type')
    .eq('uuid', assetUuid)
    .maybeSingle();

  if (assetError || !assetData) {
    return {
      ok: false,
      message: 'No fue posible validar el activo seleccionado.',
      debug: assetError,
    };
  }

  const asset = assetData as AssetForOrder;
  const assetType = normalizeText(asset.asset_type);

  if (assetType !== requestedAssetType) {
    return {
      ok: false,
      message: 'El tipo de activo seleccionado no coincide con la base de datos.',
    };
  }

  const templateFields = await getTemplateFieldsForAssetType(assetType);

  if (templateFields.length === 0) {
    return {
      ok: false,
      message: 'Este Tipo de Activo no posee una plantilla de calificacion registrada.',
    };
  }

  const assetCode = normalizeText(asset.asset_code);
  const templateCode = buildTemplateCode(assetType);
  const initialLayout = buildInitialLayout(templateFields);
  const fieldResponsesPayload = initialLayout.map((field) => ({
    field_id: field.field_id,
    field_key: field.field_key,
    value_text: null,
    value_numeric: null,
    is_out_of_range: false,
  }));
  const now = new Date().toISOString();

  if (!assetCode) {
    return {
      ok: false,
      message: 'El activo seleccionado no tiene codigo operativo valido.',
      debug: {
        stage: 'asset_code_validation',
        assetUuid,
      },
    };
  }

  console.log('[CREAR ORDENES] Inicializando orden regulada', {
    assetUuid,
    assetCode,
    assetType,
    templateCode,
    fields: templateFields.length,
    status: 'PENDING_TECHNICIAN',
  });

  const recordPayload = {
    record_code: buildRecordCode(assetCode),
    asset_code: assetCode,
    template_code: templateCode,
    assigned_technician: access.userEmail,
    status: 'PENDING_TECHNICIAN',
    executed_at: now,
    notes: JSON.stringify({
      asset_uuid_origen: assetUuid,
      asset_type: assetType,
      template_code: templateCode,
      captured_at: now,
      progress_step: 1,
      initial_layout: initialLayout,
      field_responses_payload: fieldResponsesPayload,
      generated_by: access.userEmail,
      gxp_initialization: {
        phase: 'Tecnico - Confeccion',
        status: 'PENDING_TECHNICIAN',
        source:
          templateFields.some((field) => field.id < 0)
            ? 'hvac_static_baseline_fallback'
            : 'database_template',
      },
    }),
  };

  let recordData: { uuid: string } | null = null;
  let recordError: SupabaseMutationError = null;

  try {
    const { data, error } = await supabase
      .from('mantenimientos_registros')
      .insert(recordPayload)
      .select('uuid')
      .single();

    recordData = data as { uuid: string } | null;
    recordError = error;
  } catch (error) {
    recordError =
      error && typeof error === 'object'
        ? (error as Exclude<SupabaseMutationError, null>)
        : {
            message: error instanceof Error ? error.message : 'Unexpected insert exception',
          };
  }

  if (recordError || !recordData) {
    console.error('[CREAR ORDENES] Error insertando orden de mantenimiento', {
      assetUuid,
      assetCode,
      assetType,
      templateCode,
      fields: templateFields.length,
      error: sanitizeSupabaseError(recordError),
      attemptedPayload: {
        asset_code: recordPayload.asset_code,
        template_code: recordPayload.template_code,
        assigned_technician: recordPayload.assigned_technician,
        status: recordPayload.status,
        executed_at: recordPayload.executed_at,
        initial_layout_count: initialLayout.length,
      },
    });

    return {
      ok: false,
      message: 'No fue posible generar la orden de mantenimiento.',
      debug: {
        stage: 'mantenimientos_registros_insert',
        supabase_error: sanitizeSupabaseError(recordError),
        attemptedPayload: {
          asset_code: recordPayload.asset_code,
          template_code: recordPayload.template_code,
          assigned_technician: recordPayload.assigned_technician,
          status: recordPayload.status,
          executed_at: recordPayload.executed_at,
          initial_layout_count: initialLayout.length,
        },
      },
    };
  }

  revalidatePath('/dashboard');
  revalidatePath('/mantenimiento/crear-ordenes');

  return {
    ok: true,
    message: 'Orden de mantenimiento generada correctamente.',
    recordUuid: (recordData as { uuid: string }).uuid,
  };
}
