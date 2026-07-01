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

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').normalize('NFC').trim();
}

function buildRecordCode(assetCode: string) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);

  return `WO-${assetCode}-${timestamp}`;
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
      (row.section_name ?? row.section ?? 'Parametros de mantenimiento') as string,
    ),
    field_key: normalizeText((row.field_key ?? `campo_${id}`) as string),
    field_label: normalizeText((row.field_label ?? row.label ?? `Campo ${id}`) as string),
    field_type: normalizeText((row.field_type ?? 'text') as string),
    required: Boolean(row.required),
    unit: row.unit === null || row.unit === undefined ? null : normalizeText(row.unit as string),
    options: row.options ?? null,
    section_order:
      typeof row.section_order === 'number' ? row.section_order : Number(row.section_order ?? 999),
    field_order:
      typeof row.field_order === 'number' ? row.field_order : Number(row.field_order ?? 999),
  };
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
    .eq('asset_type', normalizedAssetType)
    .order('section_order', { ascending: true })
    .order('field_order', { ascending: true });

  if (error) {
    console.error('[CREAR ORDENES] Error cargando plantilla dinamica', {
      assetType: normalizedAssetType,
      code: error.code,
      message: error.message,
    });

    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map(normalizeTemplateField);
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
  const initialLayout = templateFields.map((field) => ({
    field_id: field.id,
    field_key: field.field_key,
    field_label: field.field_label,
    field_type: field.field_type,
    section_name: field.section_name,
    required: field.required,
    unit: field.unit,
    value: null,
  }));
  const now = new Date().toISOString();

  const { data: recordData, error: recordError } = await supabase
    .from('mantenimientos_registros')
    .insert({
      record_code: buildRecordCode(assetCode),
      asset_code: assetCode,
      template_code: `TPL-${assetType.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
      assigned_technician: null,
      status: 'PENDING_TECHNICIAN',
      executed_at: now,
      notes: JSON.stringify({
        asset_uuid_origen: assetUuid,
        asset_type: assetType,
        captured_at: now,
        progress_step: 1,
        initial_layout: initialLayout,
        generated_by: access.userEmail,
      }),
    })
    .select('uuid')
    .single();

  if (recordError || !recordData) {
    return {
      ok: false,
      message: 'No fue posible generar la orden de mantenimiento.',
      debug: recordError,
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
