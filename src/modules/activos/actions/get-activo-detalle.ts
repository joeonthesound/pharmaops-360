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
  valor_seleccion: string | null;
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

type AuditTrailEntityRow = {
  entity_uuid: string | null;
};

type UsuarioPerfilRow = {
  user_email: string | null;
  role: string | null;
  can_manage_users: boolean | null;
};

export type ActivoReporteDetalle = MantenimientoRegistroRow & {
  audit_trail_event_count: number;
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
    usuarioRole: string | null;
  };
  debug: {
    activoId: string;
    usuarioEmail: string | null;
    assetCode: string | null;
    auditTrailEventos: number;
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
const EVIDENCE_BUCKET = 'evidencias-mantenimiento';
const VIRTUAL_EVIDENCE_FIELD_KEY = 'evidencias_hvac';

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

function isNonApplicableEvidenceValue(value: string | null | undefined) {
  const normalizedValue = String(value ?? '').trim().toLowerCase();

  return ['n/a', 'na', 'no aplica', 'sin evidencia', 'sin evidencias'].includes(normalizedValue);
}

function collectEvidenceValues(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue || isNonApplicableEvidenceValue(trimmedValue)) {
      return [];
    }

    return [trimmedValue];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectEvidenceValues(item));
  }

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    const directValue =
      candidate.publicUrl ??
      candidate.public_url ??
      candidate.url ??
      candidate.path ??
      candidate.storagePath ??
      candidate.storage_path;

    return [
      ...collectEvidenceValues(directValue),
      ...collectEvidenceValues(candidate.images),
      ...collectEvidenceValues(candidate.imagenes),
      ...collectEvidenceValues(candidate.photos),
      ...collectEvidenceValues(candidate.evidence),
      ...collectEvidenceValues(candidate.evidencias),
      ...collectEvidenceValues(candidate.attachments),
      ...collectEvidenceValues(candidate.adjuntos),
      ...collectEvidenceValues(candidate.files),
    ];
  }

  return [];
}

function parseEvidenceString(value: string | null) {
  if (!value || isNonApplicableEvidenceValue(value)) {
    return [];
  }

  const trimmedValue = value.trim();

  try {
    const parsedValue = JSON.parse(trimmedValue) as unknown;
    return collectEvidenceValues(parsedValue);
  } catch {
    // valor_texto puede almacenar una ruta plana cuando solo existe una evidencia.
  }

  return collectEvidenceValues(trimmedValue);
}

function normalizeEvidenceUrl(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || isNonApplicableEvidenceValue(trimmedValue)) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  const publicStorageMarker = `/storage/v1/object/public/${EVIDENCE_BUCKET}/`;
  const markerIndex = trimmedValue.indexOf(publicStorageMarker);
  const path =
    markerIndex >= 0
      ? trimmedValue.slice(markerIndex + publicStorageMarker.length)
      : trimmedValue.replace(new RegExp(`^${EVIDENCE_BUCKET}/`), '');

  return publicSupabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(path).data.publicUrl;
}

function isEvidenceField(row: FormularioRespuestaEvidenciaRow) {
  const fieldMeta = Array.isArray(row.formularios_campos)
    ? row.formularios_campos[0]
    : row.formularios_campos;
  const fieldType = String(fieldMeta?.field_type ?? '').trim().toLowerCase();
  const fieldKey = String(fieldMeta?.field_key ?? '').trim().toLowerCase();
  const serializedValue = `${row.valor_texto ?? ''} ${row.valor_seleccion ?? ''}`;

  return (
    fieldMeta?.evidence_required === true ||
    fieldKey === VIRTUAL_EVIDENCE_FIELD_KEY ||
    fieldKey.includes('evidencia') ||
    ['evidence', 'file', 'image', 'photo', 'attachment'].includes(fieldType) ||
    serializedValue.includes('"publicUrl"') ||
    serializedValue.includes('"public_url"') ||
    serializedValue.includes('"images"') ||
    serializedValue.includes('"attachments"') ||
    serializedValue.includes('"path"') ||
    serializedValue.includes('/storage/v1/object/') ||
    serializedValue.includes(EVIDENCE_BUCKET) ||
    serializedValue.includes('evidencias/') ||
    /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(serializedValue)
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
      'mantenimiento_id, campo_id, valor_texto, valor_seleccion, formularios_campos!formularios_respuestas_campo_id_fkey(field_key, field_label, field_type, evidence_required)',
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
      const evidenceUrls = [
        ...parseEvidenceString(respuesta.valor_texto),
        ...parseEvidenceString(respuesta.valor_seleccion),
      ]
        .map((value) => normalizeEvidenceUrl(value))
        .filter((value): value is string => Boolean(value));

      respuestasPorMantenimiento.set(respuesta.mantenimiento_id, [
        ...new Set([...currentImages, ...evidenceUrls]),
      ]);
    });

  return respuestasPorMantenimiento;
}

async function fetchAuditTrailCountsByEntityUuids(
  supabase: SupabaseServerClient,
  entityUuids: string[],
) {
  const countsByUuid = new Map<string, number>();

  if (entityUuids.length === 0) {
    return countsByUuid;
  }

  const { data, error } = await supabase
    .from('audit_trail')
    .select('entity_uuid')
    .eq('entity', 'mantenimientos_registros')
    .in('entity_uuid', entityUuids);

  if (error) {
    console.error('[DATA INTEGRITY CHECK] Error consultando audit_trail por entity_uuid', {
      entityUuids,
      code: error.code,
      message: error.message,
      hint: error.hint,
    });

    return countsByUuid;
  }

  ((data ?? []) as AuditTrailEntityRow[]).forEach((row) => {
    if (!row.entity_uuid) {
      return;
    }

    countsByUuid.set(row.entity_uuid, (countsByUuid.get(row.entity_uuid) ?? 0) + 1);
  });

  return countsByUuid;
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
  const usuarioRole =
    usuarioPerfil?.role ??
    (ROOT_SUPERUSER_EMAILS.includes(usuarioEmail) ? 'Superadmin' : null);

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
        usuarioRole,
      },
      debug: {
        activoId,
        usuarioEmail: usuarioEmail || null,
        assetCode: null,
        auditTrailEventos: 0,
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
  const auditTrailCountsByUuid = await fetchAuditTrailCountsByEntityUuids(
    supabase,
    mantenimientos.map((mantenimiento) => mantenimiento.uuid),
  );
  const historialMantenimientos = mantenimientos.map((mantenimiento) => ({
    ...mantenimiento,
    audit_trail_event_count: auditTrailCountsByUuid.get(mantenimiento.uuid) ?? 0,
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
      usuarioRole,
    },
    debug: {
      activoId,
      usuarioEmail: usuarioEmail || null,
      assetCode: activo.asset_code,
      auditTrailEventos: historialMantenimientos.reduce(
        (total, reporte) => total + reporte.audit_trail_event_count,
        0,
      ),
      reportesEncontrados: historialMantenimientos.length,
      evidenciasEncontradas: historialMantenimientos.reduce(
        (total, reporte) => total + reporte.imagenes_evidencia.length,
        0,
      ),
    },
  };
}
