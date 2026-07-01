'use server';

import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

export type TemplateDataType = 'OK_NOK' | 'NUMERIC' | 'TEXT';

export type TemplateFieldDraft = {
  id: string;
  seccion_nombre: string;
  campo_nombre: string;
  tipo_dato: TemplateDataType;
  unidad_medida: string;
};

export type SaveTemplateFieldsInput = {
  assetType: string;
  fields: TemplateFieldDraft[];
};

export type SaveTemplateFieldsResult = {
  ok: boolean;
  message: string;
  insertedCount?: number;
  debug?: unknown;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').normalize('NFC').trim();
}

function isTemplateDataType(value: string): value is TemplateDataType {
  return value === 'OK_NOK' || value === 'NUMERIC' || value === 'TEXT';
}

export async function saveTemplateFields(
  input: SaveTemplateFieldsInput,
): Promise<SaveTemplateFieldsResult> {
  const assetType = normalizeText(input.assetType);

  if (!assetType) {
    return {
      ok: false,
      message: 'El tipo de activo es obligatorio.',
    };
  }

  const rows = input.fields
    .map((field) => ({
      asset_type: assetType,
      seccion_nombre: normalizeText(field.seccion_nombre),
      campo_nombre: normalizeText(field.campo_nombre),
      tipo_dato: normalizeText(field.tipo_dato),
      unidad_medida: normalizeText(field.unidad_medida) || 'N/A',
    }))
    .filter((field) => field.seccion_nombre && field.campo_nombre && isTemplateDataType(field.tipo_dato));

  if (rows.length === 0) {
    return {
      ok: false,
      message: 'Debe agregar al menos un campo valido antes de guardar.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('mantenimiento_plantillas_campos').insert(rows);

  if (error) {
    console.error('[PLANTILLAS MANTENIMIENTO] Error insertando campos dinamicos', {
      code: error.code,
      message: error.message,
      assetType,
    });

    return {
      ok: false,
      message: 'No fue posible guardar la plantilla dinamica.',
      debug: error,
    };
  }

  return {
    ok: true,
    message: 'Plantilla de calificacion guardada correctamente.',
    insertedCount: rows.length,
  };
}
