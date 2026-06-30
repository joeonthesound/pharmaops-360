import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { supabase as publicSupabase } from '@/shared/lib/supabase';

type ActivoDetalleRow = {
  id: number;
  uuid: string;
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
  imagen_url?: string | null;
};

type FormularioReporteRow = {
  id: number;
  uuid?: string | null;
  activo_id?: string | null;
  mantenimiento_id?: number | null;
  mantenimiento_uuid?: string | null;
  record_code?: string | null;
  status?: string | null;
  created_at?: string | null;
  ejecutado_at?: string | null;
  [key: string]: unknown;
};

type FormularioRespuestaEvidenciaRow = {
  mantenimiento_id: number | null;
  campo_id: number | null;
  valor_texto: string | null;
  formularios_campos:
    | {
        field_key: string | null;
        field_label: string | null;
        field_type: string | null;
        evidence_required: boolean | null;
      }
    | Array<{
        field_key: string | null;
        field_label: string | null;
        field_type: string | null;
        evidence_required: boolean | null;
      }>
    | null;
};

type UsuarioPerfilRow = {
  user_email: string | null;
  role: string | null;
  can_manage_users: boolean | null;
};

export type ActivoReporteDetalle = FormularioReporteRow & {
  imagenes_evidencia: string[];
};

export type ActivoDetallePayload = {
  activo: ActivoDetalleRow | null;
  reportes: ActivoReporteDetalle[];
  seguridad: {
    puedeEditar: boolean;
    puedeDarDeBaja: boolean;
  };
  debug: {
    activoId: string;
    usuarioEmail: string | null;
    reportesEncontrados: number;
    evidenciasEncontradas: number;
  };
};

const ROOT_SUPERUSER_EMAILS = ['josueth.acevedo@gmail.com'];
const FUNCTIONAL_ADMIN_EMAILS = ['albis@labymed.com'];

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

function isPrivilegedAssetProfileOperator(profile: UsuarioPerfilRow | null) {
  const email = normalizeEmail(profile?.user_email);
  const role = String(profile?.role ?? '').trim().toLowerCase();

  return (
    ROOT_SUPERUSER_EMAILS.includes(email) ||
    FUNCTIONAL_ADMIN_EMAILS.includes(email) ||
    role.includes('superadmin') ||
    role.includes('superusuario') ||
    role.includes('albis') ||
    role.includes('administracion funcional') && profile?.can_manage_users === true
  );
}

function parseEvidenceString(value: string | null) {
  if (!value) {
    return [];
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(trimmedValue) as unknown;

    if (Array.isArray(parsedValue)) {
      return parsedValue
        .flatMap((item) => {
          if (typeof item === 'string') {
            return [item];
          }

          if (item && typeof item === 'object') {
            const candidate = item as Record<string, unknown>;
            const path =
              candidate.publicUrl ??
              candidate.path ??
              candidate.storagePath ??
              candidate.storage_path ??
              candidate.url;

            return typeof path === 'string' ? [path] : [];
          }

          return [];
        })
        .filter(Boolean);
    }

    if (parsedValue && typeof parsedValue === 'object') {
      const candidate = parsedValue as Record<string, unknown>;
      const path =
        candidate.publicUrl ??
        candidate.path ??
        candidate.storagePath ??
        candidate.storage_path ??
        candidate.url;

      return typeof path === 'string' ? [path] : [];
    }
  } catch {
    // valor_texto puede almacenar una ruta plana cuando solo existe una evidencia.
  }

  return [trimmedValue];
}

function isEvidenceField(row: FormularioRespuestaEvidenciaRow) {
  const fieldMeta = Array.isArray(row.formularios_campos)
    ? row.formularios_campos[0]
    : row.formularios_campos;
  const fieldType = String(fieldMeta?.field_type ?? '').trim().toLowerCase();

  return (
    fieldMeta?.evidence_required === true ||
    ['evidence', 'file', 'image', 'attachment'].includes(fieldType)
  );
}

async function fetchActivoByIdentifier(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  activoId: string,
) {
  const selectClause =
    'id, uuid, asset_code, asset_name, asset_type, site, area, location_detail, brand, model, serial_number, capacity, capacity_unit, installation_date, status, maintenance_frequency, last_maintenance_date, next_maintenance_date, internal_responsible, technical_provider';
  const normalizedActivoId = activoId.trim();

  async function queryActivosBy(
    client: typeof publicSupabase | Awaited<ReturnType<typeof createSupabaseServerClient>>,
    column: 'uuid' | 'asset_code',
    value: string,
  ) {
    const result = await client
      .from('activos')
      .select(selectClause)
      .eq(column, value)
      .maybeSingle();

    return {
      data: result.data
        ? {
            ...result.data,
            imagen_url: null,
          }
        : null,
      error: result.error,
    };
  }

  const { data: activoByUuid, error: uuidError } = await queryActivosBy(
    supabase,
    'uuid',
    normalizedActivoId,
  );

  console.log('[DATA INTEGRITY CHECK] Activo lookup por UUID', {
    activoId: normalizedActivoId,
    found: Boolean(activoByUuid),
    error: uuidError
      ? {
          code: uuidError.code,
          message: uuidError.message,
          hint: uuidError.hint,
        }
      : null,
  });

  if (activoByUuid || uuidError) {
    return {
      data: activoByUuid,
      error: uuidError,
    };
  }

  const { data: activoByCode, error: assetCodeError } = await queryActivosBy(
    supabase,
    'asset_code',
    normalizedActivoId.toUpperCase(),
  );

  console.log('[DATA INTEGRITY CHECK] Activo lookup por asset_code', {
    activoId: normalizedActivoId,
    assetCode: normalizedActivoId.toUpperCase(),
    found: Boolean(activoByCode),
    error: assetCodeError
      ? {
          code: assetCodeError.code,
          message: assetCodeError.message,
          hint: assetCodeError.hint,
        }
      : null,
  });

  if (activoByCode || assetCodeError) {
    return {
      data: activoByCode,
      error: assetCodeError,
    };
  }

  console.warn(
    '[DATA INTEGRITY CHECK] SSR autenticado no devolvio activo; intentando fallback anon de solo lectura',
    {
      activoId: normalizedActivoId,
      probableCause: 'RLS para rol authenticated sin politica SELECT sobre public.activos',
    },
  );

  const { data: publicActivoByUuid, error: publicUuidError } = await queryActivosBy(
    publicSupabase,
    'uuid',
    normalizedActivoId,
  );

  console.log('[DATA INTEGRITY CHECK] Fallback anon lookup por UUID', {
    activoId: normalizedActivoId,
    found: Boolean(publicActivoByUuid),
    error: publicUuidError
      ? {
          code: publicUuidError.code,
          message: publicUuidError.message,
          hint: publicUuidError.hint,
        }
      : null,
  });

  if (publicActivoByUuid || publicUuidError) {
    return {
      data: publicActivoByUuid,
      error: publicUuidError,
    };
  }

  const { data: publicActivoByCode, error: publicAssetCodeError } = await queryActivosBy(
    publicSupabase,
    'asset_code',
    normalizedActivoId.toUpperCase(),
  );

  console.log('[DATA INTEGRITY CHECK] Fallback anon lookup por asset_code', {
    activoId: normalizedActivoId,
    assetCode: normalizedActivoId.toUpperCase(),
    found: Boolean(publicActivoByCode),
    error: publicAssetCodeError
      ? {
          code: publicAssetCodeError.code,
          message: publicAssetCodeError.message,
          hint: publicAssetCodeError.hint,
        }
      : null,
  });

  return {
    data: publicActivoByCode,
    error: publicAssetCodeError,
  };
}

export async function getActivoDetalle(activoId: string): Promise<ActivoDetallePayload> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const usuarioEmail = normalizeEmail(user?.email);

  const { data: usuarioPerfilData } = usuarioEmail
    ? await supabase
        .from('usuarios_roles')
        .select('user_email, role, can_manage_users')
        .eq('user_email', usuarioEmail)
        .eq('active', true)
        .maybeSingle()
    : { data: null };
  const usuarioPerfil = (usuarioPerfilData ?? null) as UsuarioPerfilRow | null;
  const puedeAdministrarActivo = isPrivilegedAssetProfileOperator(usuarioPerfil);

  const { data: activoData, error: activoError } = await fetchActivoByIdentifier(
    supabase,
    activoId,
  );

  if (activoError) {
    console.error('[DATA INTEGRITY CHECK] Error consultando activo HVAC', {
      activoId,
      code: activoError.code,
      message: activoError.message,
    });
  }

  const activo = (activoData ?? null) as ActivoDetalleRow | null;

  if (!activo) {
    return {
      activo: null,
      reportes: [],
      seguridad: {
        puedeEditar: puedeAdministrarActivo,
        puedeDarDeBaja: puedeAdministrarActivo,
      },
      debug: {
        activoId,
        usuarioEmail: usuarioEmail || null,
        reportesEncontrados: 0,
        evidenciasEncontradas: 0,
      },
    };
  }

  const { data: reportesData, error: reportesError } = await supabase
    .from('formularios_reportes')
    .select('*')
    .eq('activo_id', activo.uuid)
    .order('created_at', { ascending: false });

  if (reportesError) {
    console.error('[DATA INTEGRITY CHECK] Error consultando formularios_reportes', {
      activoUuid: activo.uuid,
      code: reportesError.code,
      message: reportesError.message,
      hint: reportesError.hint,
    });
  }

  const reportes = (reportesData ?? []) as FormularioReporteRow[];
  const mantenimientoIds = reportes
    .map((reporte) => reporte.mantenimiento_id)
    .filter((id): id is number => typeof id === 'number');

  const respuestasPorMantenimiento = new Map<number, string[]>();

  if (mantenimientoIds.length > 0) {
    const { data: respuestasData, error: respuestasError } = await supabase
      .from('formularios_respuestas')
      .select(
        'mantenimiento_id, campo_id, valor_texto, formularios_campos!formularios_respuestas_campo_id_fkey(field_key, field_label, field_type, evidence_required)',
      )
      .in('mantenimiento_id', mantenimientoIds);

    if (respuestasError) {
      console.error('[DATA INTEGRITY CHECK] Error consultando evidencias del activo', {
        activoUuid: activo.uuid,
        code: respuestasError.code,
        message: respuestasError.message,
      });
    }

    ((respuestasData ?? []) as FormularioRespuestaEvidenciaRow[])
      .filter((respuesta) => isEvidenceField(respuesta))
      .forEach((respuesta) => {
        if (typeof respuesta.mantenimiento_id !== 'number') {
          return;
        }

        const currentImages = respuestasPorMantenimiento.get(respuesta.mantenimiento_id) ?? [];
        respuestasPorMantenimiento.set(respuesta.mantenimiento_id, [
          ...currentImages,
          ...parseEvidenceString(respuesta.valor_texto),
        ]);
      });
  }

  const reportesConEvidencias = reportes.map((reporte) => ({
    ...reporte,
    imagenes_evidencia:
      typeof reporte.mantenimiento_id === 'number'
        ? respuestasPorMantenimiento.get(reporte.mantenimiento_id) ?? []
        : [],
  }));

  return {
    activo,
    reportes: reportesConEvidencias,
    seguridad: {
      puedeEditar: puedeAdministrarActivo,
      puedeDarDeBaja: puedeAdministrarActivo,
    },
    debug: {
      activoId,
      usuarioEmail: usuarioEmail || null,
      reportesEncontrados: reportesConEvidencias.length,
      evidenciasEncontradas: reportesConEvidencias.reduce(
        (total, reporte) => total + reporte.imagenes_evidencia.length,
        0,
      ),
    },
  };
}
