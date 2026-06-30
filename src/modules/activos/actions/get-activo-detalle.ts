import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { supabase as publicSupabase } from '@/shared/lib/supabase';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type SupabaseReadableClient = typeof publicSupabase | SupabaseServerClient;

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

type MantenimientoRegistroRow = {
  id: number;
  uuid: string;
  record_code: string | null;
  asset_code: string | null;
  template_code: string | null;
  assigned_technician: string | null;
  scheduled_date: string | null;
  executed_at: string | null;
  status: string | null;
  notes: string | null;
  supervisor_signed_by: string | null;
  supervisor_signed_at: string | null;
  quality_signed_by: string | null;
  quality_signed_at: string | null;
  rejection_comments: string | null;
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

export type ActivoReporteDetalle = MantenimientoRegistroRow & {
  reporte_id: string;
  imagenes_evidencia: string[];
};

export type ActivoDetallePayload = {
  activo: ActivoDetalleRow | null;
  reportes: ActivoReporteDetalle[];
  historial_mantenimientos: ActivoReporteDetalle[];
  seguridad: {
    puedeEditar: boolean;
    puedeDarDeBaja: boolean;
  };
  debug: {
    activoId: string;
    usuarioEmail: string | null;
    assetCode: string | null;
    reportesEncontrados: number;
    evidenciasEncontradas: number;
  };
};

const ROOT_SUPERUSER_EMAILS = ['josueth.acevedo@gmail.com'];
const FUNCTIONAL_ADMIN_EMAILS = ['albis@labymed.com'];
const ACTIVO_SELECT =
  'id, uuid, asset_code, asset_name, asset_type, site, area, location_detail, brand, model, serial_number, capacity, capacity_unit, installation_date, status, maintenance_frequency, last_maintenance_date, next_maintenance_date, internal_responsible, technical_provider';
const MANTENIMIENTO_SELECT =
  'id, uuid, record_code, asset_code, template_code, assigned_technician, scheduled_date, executed_at, status, notes, supervisor_signed_by, supervisor_signed_at, quality_signed_by, quality_signed_at, rejection_comments';

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
    (role.includes('administracion funcional') && profile?.can_manage_users === true)
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
  const textValue = String(row.valor_texto ?? '').trim();

  return (
    fieldMeta?.evidence_required === true ||
    ['evidence', 'file', 'image', 'attachment'].includes(fieldType) ||
    textValue.includes('"publicUrl"') ||
    textValue.includes('"path"') ||
    textValue.includes('/storage/v1/object/') ||
    textValue.includes('evidencias/')
  );
}

async function queryActivoBy(
  client: SupabaseReadableClient,
  column: 'uuid' | 'asset_code',
  value: string,
) {
  const result = await client
    .from('activos')
    .select(ACTIVO_SELECT)
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

async function fetchActivoByIdentifier(
  supabase: SupabaseServerClient,
  activoId: string,
) {
  const normalizedActivoId = activoId.trim();

  const { data: activoByUuid, error: uuidError } = await queryActivoBy(
    supabase,
    'uuid',
    normalizedActivoId,
  );

  if (activoByUuid || uuidError) {
    return {
      data: activoByUuid,
      error: uuidError,
    };
  }

  const { data: activoByCode, error: assetCodeError } = await queryActivoBy(
    supabase,
    'asset_code',
    normalizedActivoId.toUpperCase(),
  );

  if (activoByCode || assetCodeError) {
    return {
      data: activoByCode,
      error: assetCodeError,
    };
  }

  const { data: publicActivoByUuid, error: publicUuidError } = await queryActivoBy(
    publicSupabase,
    'uuid',
    normalizedActivoId,
  );

  if (publicActivoByUuid || publicUuidError) {
    return {
      data: publicActivoByUuid,
      error: publicUuidError,
    };
  }

  return queryActivoBy(publicSupabase, 'asset_code', normalizedActivoId.toUpperCase());
}

async function fetchMantenimientosByAssetCode(
  supabase: SupabaseServerClient,
  assetCode: string,
) {
  const { data, error } = await supabase
    .from('mantenimientos_registros')
    .select(MANTENIMIENTO_SELECT)
    .eq('asset_code', assetCode)
    .order('executed_at', { ascending: false });

  if (error) {
    console.error('[DATA INTEGRITY CHECK] Error consultando mantenimientos por asset_code', {
      assetCode,
      code: error.code,
      message: error.message,
      hint: error.hint,
    });

    return [];
  }

  return (data ?? []) as MantenimientoRegistroRow[];
}

async function fetchEvidenceByMaintenanceIds(
  supabase: SupabaseServerClient,
  mantenimientoIds: number[],
) {
  const respuestasPorMantenimiento = new Map<number, string[]>();

  if (mantenimientoIds.length === 0) {
    return respuestasPorMantenimiento;
  }

  const { data, error } = await supabase
    .from('formularios_respuestas')
    .select(
      'mantenimiento_id, campo_id, valor_texto, formularios_campos!formularios_respuestas_campo_id_fkey(field_key, field_label, field_type, evidence_required)',
    )
    .in('mantenimiento_id', mantenimientoIds);

  if (error) {
    console.error('[DATA INTEGRITY CHECK] Error consultando evidencias por mantenimiento_id', {
      mantenimientoIds,
      code: error.code,
      message: error.message,
      hint: error.hint,
    });

    return respuestasPorMantenimiento;
  }

  ((data ?? []) as FormularioRespuestaEvidenciaRow[])
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

  return respuestasPorMantenimiento;
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
      hint: activoError.hint,
    });
  }

  const activo = (activoData ?? null) as ActivoDetalleRow | null;

  if (!activo) {
    return {
      activo: null,
      reportes: [],
      historial_mantenimientos: [],
      seguridad: {
        puedeEditar: puedeAdministrarActivo,
        puedeDarDeBaja: puedeAdministrarActivo,
      },
      debug: {
        activoId,
        usuarioEmail: usuarioEmail || null,
        assetCode: null,
        reportesEncontrados: 0,
        evidenciasEncontradas: 0,
      },
    };
  }

  const mantenimientos = await fetchMantenimientosByAssetCode(supabase, activo.asset_code);
  const mantenimientoIds = mantenimientos.map((mantenimiento) => mantenimiento.id);
  const respuestasPorMantenimiento = await fetchEvidenceByMaintenanceIds(
    supabase,
    mantenimientoIds,
  );
  const historialMantenimientos = mantenimientos.map((mantenimiento) => ({
    ...mantenimiento,
    reporte_id: mantenimiento.uuid,
    imagenes_evidencia: respuestasPorMantenimiento.get(mantenimiento.id) ?? [],
  }));

  return {
    activo,
    reportes: historialMantenimientos,
    historial_mantenimientos: historialMantenimientos,
    seguridad: {
      puedeEditar: puedeAdministrarActivo,
      puedeDarDeBaja: puedeAdministrarActivo,
    },
    debug: {
      activoId,
      usuarioEmail: usuarioEmail || null,
      assetCode: activo.asset_code,
      reportesEncontrados: historialMantenimientos.length,
      evidenciasEncontradas: historialMantenimientos.reduce(
        (total, reporte) => total + reporte.imagenes_evidencia.length,
        0,
      ),
    },
  };
}
