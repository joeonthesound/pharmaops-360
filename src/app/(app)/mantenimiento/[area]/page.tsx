import Link from 'next/link';
import { QrCode } from 'lucide-react';
import type { Activo } from '@/modules/activos/activos.interface';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { ChecklistForm } from './checklist-form';
import { CopyRuiButton } from './copy-rui-button';
import { EvidencePhotoGallery } from './evidence-photo-gallery';
import { PrintReportButton } from './print-report-button';
import { SignatureReviewCard } from './signature-review-card';

type ActivoConUuid = Activo & {
  uuid: string;
};

type ChecklistPageProps = {
  params: Promise<{
    area: string;
  }>;
};

type FormularioCampo = {
  id: number;
  template_code: string;
  field_key: string | null;
  section_name: string;
  field_label: string;
  field_type: string;
  options: string[] | string | null;
  minimum_value: number | null;
  maximum_value: number | null;
  help_text: string | null;
  evidence_required: boolean;
  required: boolean | null;
  unit: string | null;
  section_order: number | null;
  field_order: number | null;
};

type FieldResponse = {
  field_id: number;
  field_key: string;
  value_text: string | null;
  value_numeric: number | null;
  is_out_of_range: boolean;
};

type MantenimientoCabecera = {
  id: number;
  uuid: string;
  status?: string | null;
  asset_code?: string | null;
};

type PayloadFilaDB = {
  mantenimiento_id: number;
  campo_id: number;
  field_key?: string | null;
  valor_numerico: number | null;
  valor_seleccion: string | null;
  valor_texto: string | null;
  valor_booleano: boolean | null;
};

type MaintenanceStatus =
  | 'draft'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'pending_management'
  | 'approved'
  | 'rejected';

type MantenimientoRegistroResumen = {
  id: number;
  uuid: string;
  record_code: string | null;
  status: MaintenanceStatus | string | null;
  rejection_comments: string | null;
  assigned_technician: string | null;
  executed_at: string | null;
  notes: string | null;
  supervisor_signed_by: string | null;
  supervisor_signed_at: string | null;
  quality_signed_by: string | null;
  quality_signed_at: string | null;
};

type ChecklistSubmitResult = {
  ok: boolean;
  message: string;
  redirectTo?: string;
  debug?: unknown;
};

type UsuarioPermisos = {
  user_email: string;
  role: string | null;
  can_review: boolean | null;
  can_approve: boolean | null;
};

type FormularioRespuestaLectura = {
  mantenimiento_id: number | null;
  campo_id: number | null;
  valor_texto: string | null;
  valor_seleccion: string | null;
  valor_numerico: number | null;
  valor_booleano: boolean | null;
};

type RespuestaAuditada = FormularioRespuestaLectura & {
  field_key: string;
  field_label: string;
  field_type: string | null;
  section_name: string;
  unit: string | null;
  section_order: number;
  field_order: number;
};

type RecordNotes = {
  asset_uuid_origen?: string;
  template_code?: string;
  captured_at?: string;
  technical_observations?: string | null;
};

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVIDENCE_BUCKET = 'evidencias-mantenimiento';
const VIRTUAL_EVIDENCE_FIELD_KEY = 'evidencias_hvac';

function groupBySection(campos: FormularioCampo[]) {
  return campos.reduce<Record<string, FormularioCampo[]>>((acc, campo) => {
    const sectionName = campo.section_name || 'Inspeccion tecnica';
    acc[sectionName] = [...(acc[sectionName] ?? []), campo];
    return acc;
  }, {});
}

function groupAuditResponsesBySection(respuestas: RespuestaAuditada[]) {
  return respuestas.reduce<Record<string, RespuestaAuditada[]>>((acc, respuesta) => {
    const sectionName = respuesta.section_name || 'Inspeccion tecnica';
    acc[sectionName] = [...(acc[sectionName] ?? []), respuesta];
    return acc;
  }, {});
}

function isFieldResponse(value: unknown): value is FieldResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<FieldResponse>;

  return (
    typeof candidate.field_id === 'number' &&
    typeof candidate.field_key === 'string' &&
    (candidate.value_text === null || typeof candidate.value_text === 'string') &&
    (candidate.value_numeric === null || typeof candidate.value_numeric === 'number') &&
    typeof candidate.is_out_of_range === 'boolean'
  );
}

function isPayloadFilaDB(value: unknown): value is PayloadFilaDB {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PayloadFilaDB>;

  return (
    typeof candidate.mantenimiento_id === 'number' &&
    typeof candidate.campo_id === 'number' &&
    (candidate.field_key === undefined ||
      candidate.field_key === null ||
      typeof candidate.field_key === 'string') &&
    (candidate.valor_numerico === null || typeof candidate.valor_numerico === 'number') &&
    (candidate.valor_seleccion === null || typeof candidate.valor_seleccion === 'string') &&
    (candidate.valor_texto === null || typeof candidate.valor_texto === 'string') &&
    (candidate.valor_booleano === null || typeof candidate.valor_booleano === 'boolean')
  );
}

function isUuidV4(value: string) {
  return UUID_V4_PATTERN.test(value.trim());
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

function normalizeUtf8String(value: string | null | undefined) {
  return String(value ?? '').normalize('NFC').trim();
}

function buildRecordCode(assetCode: string) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);

  return normalizeUtf8String(`PM-${assetCode}-${timestamp}`);
}

function formatLocation(activo: Activo) {
  return [activo.location_detail, activo.area].filter(Boolean).join(' / ');
}

function isMaintenanceStatus(status: string | null | undefined): status is MaintenanceStatus {
  return normalizeMaintenanceStatus(status) !== null;
}

function normalizeMaintenanceStatus(status: string | null | undefined): MaintenanceStatus | null {
  const normalizedStatus = String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  if (
    normalizedStatus === 'draft' ||
    normalizedStatus === 'borrador' ||
    normalizedStatus === 'pending_supervisor' ||
    normalizedStatus === 'pendiente_supervisor' ||
    normalizedStatus === 'pending_quality' ||
    normalizedStatus === 'pendiente_calidad' ||
    normalizedStatus === 'pending_management' ||
    normalizedStatus === 'pendiente_gerencia' ||
    normalizedStatus === 'approved' ||
    normalizedStatus === 'aprobado' ||
    normalizedStatus === 'rejected' ||
    normalizedStatus === 'rechazado' ||
    normalizedStatus === 'rechazado_tecnico'
  ) {
    if (normalizedStatus === 'borrador') {
      return 'draft';
    }

    if (normalizedStatus === 'pendiente_supervisor') {
      return 'pending_supervisor';
    }

    if (normalizedStatus === 'pendiente_calidad') {
      return 'pending_quality';
    }

    if (normalizedStatus === 'pendiente_gerencia') {
      return 'pending_management';
    }

    if (normalizedStatus === 'aprobado') {
      return 'approved';
    }

    if (normalizedStatus === 'rechazado' || normalizedStatus === 'rechazado_tecnico') {
      return 'rejected';
    }

    return normalizedStatus as MaintenanceStatus;
  }

  return null;
}

function isStrictPendingSupervisorStatus(status: string | null | undefined) {
  return String(status ?? '').trim() === 'PENDING_SUPERVISOR';
}

function isSupervisorOrHigherRole(role: string | null | undefined) {
  const normalizedRole = String(role ?? '').trim().toLowerCase();

  return (
    normalizedRole === 'supervisor' ||
    normalizedRole === 'superadmin' ||
    normalizedRole === 'administrador' ||
    normalizedRole === 'calidad' ||
    normalizedRole === 'propietario / gerencia' ||
    normalizedRole === 'gerente general'
  );
}

function isAdministrativeConsultationRole(role: string | null | undefined) {
  return String(role ?? '').trim().toLowerCase() === 'administrativo';
}

function canRenderSupervisorSignature(usuario: UsuarioPermisos | null, recordStatus?: string | null) {
  const normalizedRole = String(usuario?.role ?? '').trim().toLowerCase();

  return (
    (isStrictPendingSupervisorStatus(recordStatus) &&
      ['supervisor', 'administrativo', 'superadmin'].includes(normalizedRole)) ||
    usuario?.can_review === true ||
    isSupervisorOrHigherRole(usuario?.role)
  );
}

type TimelineStageState = 'completed' | 'active' | 'locked';

type TimelineStage = {
  label: string;
  detail: string;
  state: TimelineStageState;
};

function buildApprovalTimeline(status: MaintenanceStatus): TimelineStage[] {
  const stageIndexByStatus: Record<MaintenanceStatus, number> = {
    draft: 0,
    rejected: 0,
    pending_supervisor: 1,
    pending_quality: 2,
    pending_management: 3,
    approved: 3,
  };
  const activeIndex = stageIndexByStatus[status] ?? 0;

  return [
    {
      label: 'Tecnico',
      detail: 'Confeccion',
      state: activeIndex > 0 ? 'completed' : activeIndex === 0 ? 'active' : 'locked',
    },
    {
      label: 'Supervisor',
      detail: 'Revision',
      state: activeIndex > 1 ? 'completed' : activeIndex === 1 ? 'active' : 'locked',
    },
    {
      label: 'Calidad',
      detail: 'Liberacion GxP',
      state: activeIndex > 2 ? 'completed' : activeIndex === 2 ? 'active' : 'locked',
    },
    {
      label: 'Gerencia',
      detail: 'Cierre de Acta',
      state: activeIndex >= 3 ? 'active' : 'locked',
    },
  ];
}

function resolveTimelineNodeClass(state: TimelineStageState) {
  if (state === 'completed') {
    return 'border-emerald-500 bg-emerald-600 text-white shadow-sm';
  }

  if (state === 'active') {
    return 'border-amber-400 bg-amber-100 text-amber-900 shadow-sm ring-4 ring-amber-100';
  }

  return 'border-slate-200 bg-slate-100 text-slate-400';
}

function resolveTimelineLineClass(leftState: TimelineStageState) {
  return leftState === 'completed' ? 'bg-emerald-400' : 'bg-slate-200';
}

function ApprovalTimelineGraphic({ status }: { status: MaintenanceStatus }) {
  const stages = buildApprovalTimeline(status);

  return (
    <section className="rounded border border-slate-200 bg-white p-3 shadow-sm print:border-slate-300 print:shadow-none">
      <div className="flex items-center justify-between gap-2">
        {stages.map((stage, index) => (
          <div className="flex flex-1 items-center" key={stage.label}>
            <div className="flex min-w-0 flex-col items-center text-center">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-black transition ${resolveTimelineNodeClass(stage.state)} ${
                  stage.state === 'active' ? 'animate-pulse' : ''
                }`}
              >
                {stage.state === 'completed' ? '✓' : index + 1}
              </span>
              <span className="mt-2 text-[11px] font-black uppercase tracking-wide text-slate-900">
                {stage.label}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">{stage.detail}</span>
            </div>
            {index < stages.length - 1 ? (
              <div
                className={`mx-2 h-0.5 flex-1 rounded-full ${resolveTimelineLineClass(stage.state)}`}
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function parseRecordNotes(notes: string | null): RecordNotes {
  if (!notes) {
    return {};
  }

  try {
    return JSON.parse(notes) as RecordNotes;
  } catch {
    return {};
  }
}

function formatDateTimeUtc(value: string | null | undefined) {
  if (!value) {
    return 'Pendiente';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Pendiente';
  }

  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function formatResponseValue(respuesta: RespuestaAuditada) {
  if (respuesta.valor_seleccion) {
    return respuesta.valor_seleccion;
  }

  if (respuesta.valor_numerico !== null) {
    return `${respuesta.valor_numerico}${respuesta.unit ? ` ${respuesta.unit}` : ''}`;
  }

  if (respuesta.valor_booleano !== null) {
    return respuesta.valor_booleano ? 'Si' : 'No';
  }

  if (respuesta.valor_texto) {
    return respuesta.valor_texto;
  }

  return 'Sin valor registrado';
}

function buildOrderedResponses(
  respuestas: FormularioRespuestaLectura[],
  campos: FormularioCampo[],
): RespuestaAuditada[] {
  return campos
    .map((campo) => {
      const respuesta = respuestas.find((item) => item.campo_id === campo.id);

      return {
        mantenimiento_id: respuesta?.mantenimiento_id ?? null,
        campo_id: campo.id,
        valor_texto: respuesta?.valor_texto ?? null,
        valor_seleccion: respuesta?.valor_seleccion ?? null,
        valor_numerico: respuesta?.valor_numerico ?? null,
        valor_booleano: respuesta?.valor_booleano ?? null,
        field_key: campo.field_key ?? `campo_${campo.id}`,
        field_label: campo.field_label,
        field_type: campo.field_type,
        section_name: campo.section_name ?? 'Inspeccion tecnica',
        unit: campo.unit ?? null,
        section_order: campo.section_order ?? 999,
        field_order: campo.field_order ?? 999,
      };
    })
    .sort((left, right) => {
      if (left.section_order !== right.section_order) {
        return left.section_order - right.section_order;
      }

      return left.field_order - right.field_order;
    });
}

function buildEditableFieldResponses(respuestas: RespuestaAuditada[]): FieldResponse[] {
  return respuestas.map((respuesta) => ({
    field_id: Number(respuesta.campo_id ?? 0),
    field_key: respuesta.field_key,
    value_text:
      respuesta.valor_seleccion ??
      respuesta.valor_texto ??
      (respuesta.valor_booleano === null ? null : respuesta.valor_booleano ? 'true' : 'false'),
    value_numeric: respuesta.valor_numerico,
    is_out_of_range: false,
  }));
}

function hasAnyValue(respuesta: RespuestaAuditada) {
  return (
    respuesta.valor_texto !== null ||
    respuesta.valor_seleccion !== null ||
    respuesta.valor_numerico !== null ||
    respuesta.valor_booleano !== null
  );
}

function isEvidenceValue(respuesta: RespuestaAuditada) {
  const fieldType = String(respuesta.field_type ?? '').toLowerCase();
  const textValue = respuesta.valor_texto ?? '';

  return (
    fieldType === 'evidence' ||
    fieldType === 'file' ||
    /^https?:\/\//i.test(textValue) ||
    textValue.includes('evidencias-mantenimiento/')
  );
}

function isOutOfRangeResponse(respuesta: RespuestaAuditada) {
  const serializedText = `${respuesta.valor_texto ?? ''} ${respuesta.valor_seleccion ?? ''}`.toLowerCase();

  return (
    serializedText.includes('"is_out_of_range":true') ||
    serializedText.includes('"is_out_of_range": true') ||
    serializedText.includes('fuera de rango')
  );
}

function getEvidenceLabel(value: string) {
  const normalized = value.split('?')[0] ?? value;
  const parts = normalized.split('/').filter(Boolean);

  return parts.at(-1) ?? value;
}

function parseEvidenceJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function extractEvidenceValues(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  const trimmedValue = rawValue.trim();
  const parsedValue = parseEvidenceJson(trimmedValue);

  if (Array.isArray(parsedValue)) {
    return parsedValue.flatMap((item) => {
      if (typeof item === 'string') {
        return [item];
      }

      if (item && typeof item === 'object') {
        const candidate = item as Record<string, unknown>;
        const value =
          candidate.publicUrl ??
          candidate.public_url ??
          candidate.url ??
          candidate.path ??
          candidate.storagePath ??
          candidate.storage_path;

        return typeof value === 'string' ? [value] : [];
      }

      return [];
    });
  }

  if (parsedValue && typeof parsedValue === 'object') {
    const candidate = parsedValue as Record<string, unknown>;
    const value =
      candidate.publicUrl ??
      candidate.public_url ??
      candidate.url ??
      candidate.path ??
      candidate.storagePath ??
      candidate.storage_path;

    return typeof value === 'string' ? [value] : [];
  }

  return [trimmedValue];
}

function normalizeEvidenceUrl(value: string, getPublicUrl: (path: string) => string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  const normalizedPath = trimmedValue.replace(new RegExp(`^${EVIDENCE_BUCKET}/`), '');

  return getPublicUrl(normalizedPath);
}

function extractEvidenceImageUrls(
  respuestas: RespuestaAuditada[],
  getPublicUrl: (path: string) => string,
) {
  const imageUrls = respuestas.flatMap((respuesta) => {
    const fieldType = String(respuesta.field_type ?? '').toLowerCase();
    const isEvidenceField =
      respuesta.field_key === VIRTUAL_EVIDENCE_FIELD_KEY ||
      ['evidence', 'file', 'image', 'attachment'].includes(fieldType) ||
      Boolean(respuesta.valor_texto?.includes(EVIDENCE_BUCKET));

    if (!isEvidenceField) {
      return [];
    }

    return extractEvidenceValues(respuesta.valor_texto)
      .map((value) => normalizeEvidenceUrl(value, getPublicUrl))
      .filter((value): value is string => Boolean(value));
  });

  return Array.from(new Set(imageUrls));
}

async function insertChecklistAuditEvent({
  supabase,
  recordUuid,
  operatorEmail,
  timestampUtc,
  action,
  comments,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  recordUuid: string;
  operatorEmail: string | null;
  timestampUtc: string;
  action: 'INITIAL_SAVE' | 'SUBMISSION' | 'RE-SUBMISSION';
  comments: string;
}) {
  const { error } = await supabase.from('audit_trail').insert({
    entity: 'mantenimientos_registros',
    entity_uuid: recordUuid,
    accion: action,
    usuario: operatorEmail,
    timestamp: timestampUtc,
    comentarios: comments,
  });

  return error;
}

async function resolveVirtualEvidenceCampoId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
) {
  const { data: existingField, error: lookupError } = await supabase
    .from('formularios_campos')
    .select('id')
    .eq('template_code', 'TMP-HVAC-PM')
    .eq('field_key', VIRTUAL_EVIDENCE_FIELD_KEY)
    .maybeSingle();

  if (lookupError) {
    return {
      id: null,
      error: lookupError,
    };
  }

  if (existingField && typeof existingField.id === 'number') {
    return {
      id: existingField.id,
      error: null,
    };
  }

  const { data: createdField, error: insertError } = await supabase
    .from('formularios_campos')
    .insert({
      template_code: 'TMP-HVAC-PM',
      field_key: VIRTUAL_EVIDENCE_FIELD_KEY,
      section_name: 'Adjuntos y observaciones',
      field_label: 'Evidencias HVAC',
      field_type: 'evidence',
      options: null,
      minimum_value: null,
      maximum_value: null,
      help_text: 'Campo virtual auditado para evidencias multiples HVAC.',
      evidence_required: true,
      required: false,
      unit: null,
      section_order: 999,
      field_order: 999,
    })
    .select('id')
    .single();

  return {
    id: typeof createdField?.id === 'number' ? createdField.id : null,
    error: insertError,
  };
}

const EDITABLE_MAINTENANCE_STATUSES = new Set([
  'DRAFT',
  'PENDING_TECHNICIAN',
  'REJECTED',
  'RECHAZADO_TECNICO',
  'BORRADOR',
]);

function normalizeStatusToken(status: string | null | undefined) {
  return normalizeUtf8String(status).toUpperCase();
}

function isEditableMaintenanceStatus(status: string | null | undefined) {
  return EDITABLE_MAINTENANCE_STATUSES.has(normalizeStatusToken(status));
}

function isRejectedEditableStatus(status: string | null | undefined) {
  const normalizedStatus = normalizeStatusToken(status);

  return normalizedStatus === 'REJECTED' || normalizedStatus === 'RECHAZADO_TECNICO';
}

function resolveStatusBanner(status: MaintenanceStatus) {
  if (status === 'pending_supervisor') {
    return {
      className: 'border-amber-200 bg-amber-50 text-amber-900',
      text: 'Pendiente de revision por supervisor',
    };
  }

  if (status === 'pending_quality') {
    return {
      className: 'border-sky-200 bg-sky-50 text-sky-900',
      text: 'Pendiente de liberacion por calidad',
    };
  }

  if (status === 'approved') {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      text: 'Registro aprobado y cerrado en historial tecnico',
    };
  }

  if (status === 'rejected') {
    return {
      className: 'border-red-200 bg-red-50 text-red-900',
      text: 'Registro rechazado con observaciones de auditoria',
    };
  }

  return {
    className: 'border-slate-200 bg-slate-100 text-slate-800',
    text: 'Registro en ejecucion tecnica',
  };
}

function resolveReturnHrefForStatus(status: MaintenanceStatus) {
  if (status === 'approved' || status === 'pending_management') {
    return '/mantenimiento/hvac/rui/ht';
  }

  if (status === 'rejected') {
    return '/mantenimiento/hvac/rui/rechazado';
  }

  if (status === 'pending_supervisor' || status === 'pending_quality') {
    return '/mantenimiento/hvac/rui/enviado';
  }

  return '/mantenimiento/hvac/rui/activo';
}

function resolveReturnLabelForStatus(status: MaintenanceStatus) {
  if (status === 'approved' || status === 'pending_management') {
    return 'Volver al Historial Tecnico';
  }

  if (status === 'rejected') {
    return 'Volver a Ordenes Rechazadas';
  }

  if (status === 'pending_supervisor' || status === 'pending_quality') {
    return 'Volver a Ordenes Enviadas';
  }

  return 'Volver a Ordenes Pendientes';
}

async function enviarChecklistAction(formData: FormData): Promise<ChecklistSubmitResult> {
  'use server';

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const technicianEmail = user?.email?.trim().toLowerCase() ?? null;
  const assetUuid = normalizeUtf8String(String(formData.get('asset_uuid') ?? ''));
  const responsesPayload = normalizeUtf8String(
    String(formData.get('field_responses_payload') ?? '[]'),
  );
  const payloadParaDBRaw = normalizeUtf8String(
    String(formData.get('payload_para_db') ?? '[]'),
  );
  const maintenanceRecordUuid = normalizeUtf8String(
    String(formData.get('maintenance_record_uuid') ?? ''),
  );
  const technicalObservations = normalizeUtf8String(
    String(formData.get('technical_observations') ?? ''),
  );
  const submittedKeys = Array.from(formData.keys());

  if (!assetUuid) {
    return {
      ok: false,
      message: 'No se recibio el identificador del activo.',
      debug: {
        stage: 'asset_uuid_missing',
        submittedKeys,
      },
    };
  }

  if (!isUuidV4(assetUuid)) {
    return {
      ok: false,
      message: 'UUID del activo invalido. Regrese al Dashboard e inicie nuevamente.',
      debug: {
        stage: 'asset_uuid_validation',
        asset_uuid: assetUuid,
        submittedKeys,
      },
    };
  }

  if (maintenanceRecordUuid && !isUuidV4(maintenanceRecordUuid)) {
    return {
      ok: false,
      message: 'UUID de orden de mantenimiento invalido.',
      debug: {
        stage: 'maintenance_record_uuid_validation',
        maintenance_record_uuid: maintenanceRecordUuid,
        submittedKeys,
      },
    };
  }

  try {
    let parsedPayload: unknown;
    let parsedPayloadParaDB: unknown;

    try {
      parsedPayload = JSON.parse(responsesPayload) as unknown;
      parsedPayloadParaDB = JSON.parse(payloadParaDBRaw) as unknown;
    } catch (error) {
      return {
        ok: false,
        message: 'Payload de respuestas invalido.',
        debug: {
          stage: 'payload_parse',
          asset_uuid: assetUuid,
          error: error instanceof Error ? error.message : 'parse_error',
          field_responses_payload: responsesPayload,
          payload_para_db: payloadParaDBRaw,
        },
      };
    }

    const responses = Array.isArray(parsedPayload)
      ? parsedPayload.filter(isFieldResponse)
      : [];
    const payloadParaDB = Array.isArray(parsedPayloadParaDB)
      ? parsedPayloadParaDB.filter(isPayloadFilaDB)
      : [];

    console.log('[DIAGNOSTICO CHECKLIST P360] ENVIO [Paso 1 Sanitizacion]', {
      assetUuid,
      receivedResponses: Array.isArray(parsedPayload) ? parsedPayload.length : 0,
      validResponses: responses.length,
      rowsForDatabase: payloadParaDB.length,
    });

    const { data: activo, error: activoError } = await supabase
      .from('activos')
      .select('id, uuid, asset_code')
      .eq('uuid', assetUuid)
      .maybeSingle();

    if (activoError || !activo) {
      console.log('[DIAGNOSTICO CHECKLIST P360] ENVIO [Activo Invalido]', {
        assetUuid,
        error: sanitizeSupabaseError(activoError),
      });

      return {
        ok: false,
        message: 'No fue posible validar el activo inspeccionado.',
        debug: {
          stage: 'asset_lookup',
          asset_uuid: assetUuid,
          supabase_error: sanitizeSupabaseError(activoError),
          recordFound: Boolean(activo),
        },
      };
    }

    const activoValidado = activo as { id: number; uuid: string; asset_code: string };
    const normalizedAssetCode = normalizeUtf8String(activoValidado.asset_code);

    let cabeceraMantenimiento: MantenimientoCabecera | null = null;
    let auditAction: 'SUBMISSION' | 'RE-SUBMISSION' = 'SUBMISSION';
    let shouldClearRejectedState = false;

    if (maintenanceRecordUuid) {
      const { data: cabeceraExistente, error: cabeceraExistenteError } = await supabase
        .from('mantenimientos_registros')
        .select('id, uuid, status, asset_code')
        .eq('uuid', maintenanceRecordUuid)
        .maybeSingle();

      if (cabeceraExistenteError || !cabeceraExistente) {
        return {
          ok: false,
          message: 'No fue posible localizar la orden de mantenimiento para guardar la inspeccion.',
          debug: {
            stage: 'maintenance_record_lookup',
            asset_uuid: assetUuid,
            maintenance_record_uuid: maintenanceRecordUuid,
            supabase_error: sanitizeSupabaseError(cabeceraExistenteError),
          },
        };
      }

      const cabeceraExistenteValidada = cabeceraExistente as MantenimientoCabecera;

      if (!isEditableMaintenanceStatus(cabeceraExistenteValidada.status)) {
        return {
          ok: false,
          message: 'La orden no esta en un estado editable para guardar la inspeccion.',
          debug: {
            stage: 'maintenance_record_status_validation',
            maintenance_record_uuid: maintenanceRecordUuid,
            status: cabeceraExistenteValidada.status,
          },
        };
      }

      if (normalizeUtf8String(cabeceraExistenteValidada.asset_code) !== normalizedAssetCode) {
        return {
          ok: false,
          message: 'La orden de mantenimiento no corresponde al activo solicitado.',
          debug: {
            stage: 'maintenance_record_asset_validation',
            maintenance_record_uuid: maintenanceRecordUuid,
            expected_asset_code: normalizedAssetCode,
            received_asset_code: cabeceraExistenteValidada.asset_code,
          },
        };
      }

      if (isRejectedEditableStatus(cabeceraExistenteValidada.status)) {
        auditAction = 'RE-SUBMISSION';
        shouldClearRejectedState = true;
      }

      cabeceraMantenimiento = cabeceraExistenteValidada;
    } else {
      console.log(
        '[AUDITORIA INFRAESTRUCTURA P360] Intentando insercion en mantenimientos_registros con payload:',
        {
          asset_code: normalizedAssetCode,
          template_code: 'TMP-HVAC-PM',
          status: 'draft',
          assigned_technician: technicianEmail,
        },
      );

      const { data: cabecera, error: cabeceraError } = await supabase
        .from('mantenimientos_registros')
        .insert({
          record_code: buildRecordCode(normalizedAssetCode),
          asset_code: normalizedAssetCode,
          template_code: normalizeUtf8String('TMP-HVAC-PM'),
          assigned_technician: technicianEmail,
          status: 'draft',
          executed_at: new Date().toISOString(),
          notes: JSON.stringify({
            asset_uuid_origen: assetUuid,
            template_code: normalizeUtf8String('TMP-HVAC-PM'),
            captured_at: new Date().toISOString(),
            technical_observations: technicalObservations || null,
          }),
        })
        .select('id, uuid')
        .single();

      if (cabeceraError || !cabecera) {
        console.log('[DIAGNOSTICO CHECKLIST P360] ENVIO [Paso 2 Cabecera Error]', {
          error: sanitizeSupabaseError(cabeceraError),
        });

        return {
          ok: false,
          message: 'Error al crear la cabecera de mantenimiento.',
          debug: {
            stage: 'mantenimientos_registros_insert',
            asset_uuid: assetUuid,
            supabase_error: sanitizeSupabaseError(cabeceraError),
          },
        };
      }

      cabeceraMantenimiento = cabecera as MantenimientoCabecera;
    }

    if (!isUuidV4(cabeceraMantenimiento.uuid)) {
      return {
        ok: false,
        message: 'La cabecera fue creada, pero su UUID no es valido.',
        debug: {
          stage: 'cabecera_uuid_validation',
          cabecera: cabeceraMantenimiento,
        },
      };
    }

    let virtualEvidenceCampoId: number | null = null;
    const respuestasEav = [];

    for (const row of payloadParaDB) {
      let campoId = Number(row.campo_id);

      if (campoId <= 0 && row.field_key === VIRTUAL_EVIDENCE_FIELD_KEY) {
        if (virtualEvidenceCampoId === null) {
          const resolvedVirtualField = await resolveVirtualEvidenceCampoId(supabase);

          if (resolvedVirtualField.error || resolvedVirtualField.id === null) {
            return {
              ok: false,
              message: 'No fue posible preparar el campo virtual de evidencias HVAC.',
              debug: {
                stage: 'virtual_evidence_field_resolution',
                asset_uuid: assetUuid,
                cabecera_uuid: cabeceraMantenimiento.uuid,
                virtual_field_key: VIRTUAL_EVIDENCE_FIELD_KEY,
                supabase_error: sanitizeSupabaseError(resolvedVirtualField.error),
              },
            };
          }

          virtualEvidenceCampoId = resolvedVirtualField.id;
        }

        campoId = virtualEvidenceCampoId;
      }

      respuestasEav.push({
        mantenimiento_id: cabeceraMantenimiento.id,
        campo_id: campoId,
        valor_numerico: row.valor_numerico,
        valor_seleccion: row.valor_seleccion ? normalizeUtf8String(row.valor_seleccion) : null,
        valor_texto: row.valor_texto ? normalizeUtf8String(row.valor_texto) : null,
        valor_booleano: row.valor_booleano,
      });
    }

    if (respuestasEav.length > 0) {
      try {
        const { error: respuestasError } = await supabase
          .from('formularios_respuestas')
          .upsert(respuestasEav, { onConflict: 'mantenimiento_id,campo_id' });

        if (respuestasError) {
          console.error('[FALLO ATOMICO EN COMPUERTA GxP]:', respuestasError);

          return {
            ok: false,
            message: 'Error al guardar las respuestas del formulario.',
            debug: {
              stage: 'formularios_respuestas_insert',
              asset_uuid: assetUuid,
              cabecera_uuid: cabeceraMantenimiento.uuid,
              attemptedRows: respuestasEav.length,
              supabase_error: sanitizeSupabaseError(respuestasError),
              sampleRows: respuestasEav.slice(0, 3),
            },
          };
        }
      } catch (error) {
        console.error('[FALLO ATOMICO EN COMPUERTA GxP]:', error);

        return {
          ok: false,
          message: 'Error inesperado al persistir las respuestas del checklist.',
          debug: {
            stage: 'formularios_respuestas_insert_exception',
            asset_uuid: assetUuid,
            cabecera_uuid: cabeceraMantenimiento.uuid,
            attemptedRows: respuestasEav.length,
            error: error instanceof Error ? error.message : 'unknown_error',
            sampleRows: respuestasEav.slice(0, 3),
          },
        };
      }
    }

    const auditError = await insertChecklistAuditEvent({
      supabase,
      recordUuid: cabeceraMantenimiento.uuid,
      operatorEmail: technicianEmail,
      timestampUtc: new Date().toISOString(),
      action: auditAction,
      comments:
        auditAction === 'RE-SUBMISSION'
          ? 'RE-SUBMISSION: Datos corregidos por el operador'
          : 'SUBMISSION: Registro enviado por el operador a revision de Supervisor',
    });

    if (auditError) {
      console.error('[FALLO ATOMICO EN COMPUERTA GxP]:', auditError);

      return {
        ok: false,
        message: 'No fue posible registrar el evento de envio en audit_trail.',
        debug: {
          stage:
            auditAction === 'RE-SUBMISSION'
              ? 'audit_trail_resubmission_insert'
              : 'audit_trail_submission_insert',
          asset_uuid: assetUuid,
          cabecera_uuid: cabeceraMantenimiento.uuid,
          audit_action: auditAction,
          supabase_error: sanitizeSupabaseError(auditError),
        },
      };
    }

    const { error: statusUpdateError } = await supabase
      .from('mantenimientos_registros')
      .update({
        status: 'PENDING_SUPERVISOR',
        rejection_comments: shouldClearRejectedState ? null : undefined,
        supervisor_signed_by: shouldClearRejectedState ? null : undefined,
        supervisor_signed_at: shouldClearRejectedState ? null : undefined,
        quality_signed_by: shouldClearRejectedState ? null : undefined,
        quality_signed_at: shouldClearRejectedState ? null : undefined,
      })
      .eq('uuid', cabeceraMantenimiento.uuid);

    if (statusUpdateError) {
      console.error('[FALLO ATOMICO EN COMPUERTA GxP]:', statusUpdateError);

      return {
        ok: false,
        message: 'Las respuestas fueron guardadas, pero la orden no pudo liberarse a revision.',
        debug: {
          stage: 'mantenimientos_registros_status_update',
          asset_uuid: assetUuid,
          cabecera_uuid: cabeceraMantenimiento.uuid,
          supabase_error: sanitizeSupabaseError(statusUpdateError),
        },
      };
    }

    return {
      ok: true,
      message: 'Registro enviado exitosamente',
      redirectTo: `/mantenimiento/${cabeceraMantenimiento.uuid}/aprobar`,
    };
  } catch (error) {
    console.error('[FALLO ATOMICO EN COMPUERTA GxP]:', error);

    return {
      ok: false,
      message: 'Error al enviar el registro. Verifique la conexion e intente nuevamente.',
      debug: {
        stage: 'controlled_exception',
        asset_uuid: assetUuid,
        error: error instanceof Error ? error.message : 'unknown_error',
      },
    };
  }
}

export default async function ChecklistInspeccionPage({ params }: ChecklistPageProps) {
  const resolvedParams = await params;
  const requestedUuid = String(resolvedParams.area ?? '').trim();
  const reportPath = `/mantenimiento/${requestedUuid}`;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email?.trim().toLowerCase() ?? '';

  const maintenanceColumns =
    'id, uuid, record_code, status, rejection_comments, assigned_technician, executed_at, notes, supervisor_signed_by, supervisor_signed_at, quality_signed_by, quality_signed_at, asset_code';

  const [
    { data: activoPorUuid, error: activoLookupError },
    { data: maintenanceRecordByUuid },
  ] = await Promise.all([
    supabase.from('activos').select('*').eq('uuid', requestedUuid).maybeSingle(),
    supabase
      .from('mantenimientos_registros')
      .select(maintenanceColumns)
      .eq('uuid', requestedUuid)
      .maybeSingle(),
  ]);

  let activoHVAC = activoPorUuid as ActivoConUuid | null;
  let maintenanceRecord: MantenimientoRegistroResumen | null = null;

  if (maintenanceRecordByUuid) {
    maintenanceRecord = maintenanceRecordByUuid as MantenimientoRegistroResumen;

    const recordAssetCode = normalizeUtf8String(
      String((maintenanceRecordByUuid as { asset_code?: string | null }).asset_code ?? ''),
    );

    if (recordAssetCode) {
      const { data: activoPorCodigo } = await supabase
        .from('activos')
        .select('*')
        .eq('asset_code', recordAssetCode)
        .maybeSingle();

      activoHVAC = (activoPorCodigo ?? activoHVAC) as ActivoConUuid | null;
    }
  } else if (activoHVAC) {
    const { data: maintenanceRecordData } = await supabase
      .from('mantenimientos_registros')
      .select(maintenanceColumns)
      .eq('asset_code', activoHVAC.asset_code)
      .order('executed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    maintenanceRecord = (maintenanceRecordData ?? null) as MantenimientoRegistroResumen | null;
  }

  const normalizedStatus = normalizeMaintenanceStatus(maintenanceRecord?.status) ?? 'draft';
  const returnHref = resolveReturnHrefForStatus(normalizedStatus);
  const returnLabel = resolveReturnLabelForStatus(normalizedStatus);

  const [
    { data: camposData, error: camposLookupError },
    { data: respuestasData },
    { data: usuarioData },
  ] = await Promise.all([
    supabase
      .from('formularios_campos')
      .select('*')
      .eq('template_code', 'TMP-HVAC-PM')
      .order('section_order', { ascending: true })
      .order('field_order', { ascending: true }),
    maintenanceRecord?.id
      ? supabase
          .from('formularios_respuestas')
          .select('mantenimiento_id, campo_id, valor_texto, valor_seleccion, valor_numerico, valor_booleano')
          .eq('mantenimiento_id', maintenanceRecord.id)
      : Promise.resolve({ data: [] }),
    userEmail
      ? supabase
          .from('usuarios_roles')
          .select('user_email, role, can_review, can_approve')
          .eq('user_email', userEmail)
          .eq('active', true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const campos = (camposData ?? []) as FormularioCampo[];
  const respuestas = (respuestasData ?? []) as FormularioRespuestaLectura[];
  const usuario = usuarioData as UsuarioPermisos | null;
  const orderedResponses = buildOrderedResponses(respuestas, campos);
  const responsesBySection = groupAuditResponsesBySection(orderedResponses);
  const notes = parseRecordNotes(maintenanceRecord?.notes ?? null);
  const statusBanner = resolveStatusBanner(normalizedStatus);
  const isEditableDocument = normalizedStatus === 'draft' || normalizedStatus === 'rejected';
  const isReadOnlyDocument = !isEditableDocument;
  const editableInitialResponses = buildEditableFieldResponses(orderedResponses);
  const evidenceImageUrls = extractEvidenceImageUrls(orderedResponses, (path) => {
    return supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(path).data.publicUrl;
  });
  const supervisorCanSign =
    canRenderSupervisorSignature(usuario, maintenanceRecord?.status) &&
    !isAdministrativeConsultationRole(usuario?.role);
  const supervisorGateDebug = {
    sessionEmail: userEmail || null,
    usuarioRole: usuario?.role ?? null,
    usuarioCanReview: usuario?.can_review ?? null,
    rawRecordStatus: maintenanceRecord?.status ?? null,
    normalizedStatus,
    isReadOnlyDocument,
    isSupervisorStep: normalizedStatus === 'pending_supervisor',
    canRenderSupervisorSignature: canRenderSupervisorSignature(usuario, maintenanceRecord?.status),
    isAdministrativeConsultation: isAdministrativeConsultationRole(usuario?.role),
    supervisorCanSign,
  };

  if (process.env.NEXT_PUBLIC_SUPERADMIN_DEBUG === 'true') {
    console.log('[RUI SUPERVISOR ACTION GATE]', supervisorGateDebug);
  }

  const printMetadata = [
    ['Tipo de mantenimiento', 'Preventivo / Correctivo HVAC'],
    ['Fecha', formatDateTimeUtc(maintenanceRecord?.executed_at ?? notes.captured_at)],
    ['Duracion', 'No registrada'],
    ['Responsable', maintenanceRecord?.assigned_technician ?? 'No disponible'],
    ['Ubicacion', activoHVAC ? formatLocation(activoHVAC) : 'Ubicacion no disponible'],
    ['Tipo de servicio', 'Mantenimiento de aire acondicionado'],
    ['Marca', activoHVAC?.brand ?? 'No disponible'],
    [
      'Capacidad',
      activoHVAC ? `${activoHVAC.capacity} ${activoHVAC.capacity_unit}` : 'No disponible',
    ],
    ['Fecha de ultimo servicio', activoHVAC?.last_maintenance_date ?? 'No registrada'],
  ];

  if (isReadOnlyDocument) {
    const statusPanelClass =
      normalizedStatus === 'approved'
        ? 'bg-emerald-50 border-y border-emerald-200 text-emerald-900 px-4 py-2 flex items-center justify-between'
        : 'bg-amber-50 border-y border-amber-200 text-amber-900 px-4 py-2 flex items-center justify-between';
    const signatureCards = [
      {
        title: 'Tecnico',
        user: maintenanceRecord?.assigned_technician ?? 'No disponible',
        timestamp: formatDateTimeUtc(maintenanceRecord?.executed_at ?? notes.captured_at),
        meaning: 'Confeccion del registro tecnico bajo accion afirmativa del operador.',
      },
      {
        title: 'Supervisor',
        user: maintenanceRecord?.supervisor_signed_by ?? 'Pendiente',
        timestamp: formatDateTimeUtc(maintenanceRecord?.supervisor_signed_at),
        meaning: 'Revision de cumplimiento operativo bajo FDA 21 CFR Part 11.',
      },
      {
        title: 'Calidad',
        user: maintenanceRecord?.quality_signed_by ?? 'Pendiente',
        timestamp: formatDateTimeUtc(maintenanceRecord?.quality_signed_at),
        meaning: 'Liberacion documental e inmutabilidad del registro aprobado.',
      },
    ];

    return (
      <main className="h-screen w-full flex flex-col overflow-hidden bg-slate-50 select-none text-slate-950 print:block print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:text-black print:select-text">
        <style>
          {`
            @media print {
              @page {
                size: 8.5in 11in;
                margin: 0.4in 0.4in 0.45in 0.4in;
              }

              html,
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background: #ffffff !important;
                height: auto !important;
                overflow: visible !important;
              }

              * {
                box-shadow: none !important;
              }
            }
          `}
        </style>

        <section className="hidden bg-white text-black print:block">
          <header className="grid grid-cols-[1.25in_1fr] gap-4 border-b border-slate-300 pb-3 text-[10px] leading-tight">
            <div className="flex h-16 items-center justify-center border border-slate-300 text-[9px] font-bold uppercase text-slate-700">
              Logo
            </div>
            <div className="text-right">
              <h1 className="text-[13px] font-black uppercase tracking-wide text-black">
                Labymed S.A. - Planta Central
              </h1>
              <p className="mt-1 font-semibold text-slate-700">Operacion HVAC / Reporte Inmutable de Inspeccion</p>
              <p className="text-slate-600">Direccion: Panama | Tel: +507 0000-0000 | calidad@labymed.com</p>
              <p className="text-slate-600">Sistema: PharmaOps 360 | Fuente: Supabase SSR / ALCOA+</p>
            </div>
          </header>

          <section className="mt-3 border border-slate-300 text-[10px] leading-tight">
            <div className="grid grid-cols-4">
              <div className="border-b border-r border-slate-300 p-1.5">
                <p className="font-black uppercase text-slate-600">Report Unique ID</p>
                <p className="mt-1 break-all font-mono text-[9px] font-bold text-black">
                  {maintenanceRecord?.uuid ?? requestedUuid}
                </p>
              </div>
              <div className="border-b border-r border-slate-300 p-1.5">
                <p className="font-black uppercase text-slate-600">Activo / Codigo</p>
                <p className="mt-1 font-bold text-black">
                  {activoHVAC?.asset_name ?? 'Checklist HVAC'} / {activoHVAC?.asset_code ?? 'No disponible'}
                </p>
              </div>
              <div className="border-b border-r border-slate-300 p-1.5">
                <p className="font-black uppercase text-slate-600">Status</p>
                <p className="mt-1 font-bold uppercase text-black">{normalizedStatus}</p>
              </div>
              <div className="border-b border-slate-300 p-1.5">
                <p className="font-black uppercase text-slate-600">Ubicacion Fisica</p>
                <p className="mt-1 font-bold text-black">
                  {activoHVAC ? formatLocation(activoHVAC) : 'Ubicacion no disponible'}
                </p>
              </div>
              <div className="border-r border-slate-300 p-1.5">
                <p className="font-black uppercase text-slate-600">Fecha UTC</p>
                <p className="mt-1 font-bold text-black">
                  {formatDateTimeUtc(maintenanceRecord?.executed_at ?? notes.captured_at)}
                </p>
              </div>
              <div className="border-r border-slate-300 p-1.5">
                <p className="font-black uppercase text-slate-600">Plantilla</p>
                <p className="mt-1 font-bold text-black">
                  {normalizeUtf8String(notes.template_code ?? 'TMP-HVAC-PM')}
                </p>
              </div>
              <div className="border-r border-slate-300 p-1.5">
                <p className="font-black uppercase text-slate-600">Marca / Capacidad</p>
                <p className="mt-1 font-bold text-black">
                  {activoHVAC?.brand ?? 'No disponible'} /{' '}
                  {activoHVAC ? `${activoHVAC.capacity} ${activoHVAC.capacity_unit}` : 'No disponible'}
                </p>
              </div>
              <div className="p-1.5">
                <p className="font-black uppercase text-slate-600">Registro</p>
                <p className="mt-1 font-bold text-black">
                  {maintenanceRecord?.record_code ?? 'Sin codigo'}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-3">
            <h2 className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-black">
              Evidencias fotograficas
            </h2>
            <EvidencePhotoGallery imageUrls={evidenceImageUrls} />
          </section>

          <section className="mt-3">
            <h2 className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-black">
              Datos completos del checklist
            </h2>
            <table className="table-auto w-full border-collapse text-left text-[9px] leading-tight">
              <thead>
                <tr className="border-y border-slate-400 bg-white">
                  <th className="w-[38%] px-1.5 py-1 font-black uppercase">Campo</th>
                  <th className="w-[22%] px-1.5 py-1 font-black uppercase">Valor</th>
                  <th className="w-[10%] px-1.5 py-1 font-black uppercase">Unidad</th>
                  <th className="w-[30%] px-1.5 py-1 font-black uppercase">Seccion</th>
                </tr>
              </thead>
              <tbody>
                {orderedResponses.map((respuesta) => {
                  const responseValue = formatResponseValue(respuesta);
                  const isOutOfRange = isOutOfRangeResponse(respuesta);

                  return (
                    <tr
                      className="border-b border-slate-200 align-top odd:bg-white even:bg-slate-50/80"
                      key={`print-flow-${respuesta.field_key}`}
                    >
                      <td className="px-1.5 py-1 font-semibold text-black">{respuesta.field_label}</td>
                      <td className="px-1.5 py-1 font-bold text-black">
                        {isOutOfRange ? (
                          <span className="font-black underline">* {responseValue}</span>
                        ) : (
                          responseValue
                        )}
                      </td>
                      <td className="px-1.5 py-1 font-semibold text-black">{respuesta.unit ?? 'N/A'}</td>
                      <td className="px-1.5 py-1 text-slate-700">{respuesta.section_name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-1 text-[8px] font-semibold text-black">
              * Valor marcado como fuera de rango o con desviacion tecnica documentada.
            </p>
          </section>

          <section className="mt-4 grid gap-2 text-[9px] leading-tight">
            <h2 className="text-[10px] font-black uppercase tracking-wide text-black">
              Cadena de aprobacion electronica
            </h2>
            {signatureCards.map((signature) => (
              <article className="border border-slate-400 p-2" key={`print-${signature.title}`}>
                <p className="font-black uppercase text-black">{signature.title}</p>
                <p>
                  <span className="font-bold">User ID: </span>
                  {signature.user}
                </p>
                <p>
                  <span className="font-bold">Timestamp UTC: </span>
                  {signature.timestamp}
                </p>
                <p>
                  <span className="font-bold">GxP Legal Meaning: </span>
                  {signature.meaning}
                </p>
                <p>
                  <span className="font-bold">Audit Trail Comments / Observations: </span>
                  {signature.title === 'Tecnico'
                    ? notes.technical_observations || 'Sin observaciones registradas'
                    : maintenanceRecord?.rejection_comments || 'Sin comentarios adicionales registrados'}
                </p>
              </article>
            ))}
          </section>
        </section>

        <div className="h-14 shrink-0 border-b bg-white px-4 flex items-center justify-between print:hidden">
          <Link
            className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
            href={returnHref}
          >
            <span aria-hidden="true" className="mr-2">←</span>
            {returnLabel}
          </Link>
          <div className="flex items-center gap-2">
            <PrintReportButton />
          </div>
        </div>

        <section className={`${statusPanelClass} print:hidden`}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">
              Report Unique ID
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-black">
                {maintenanceRecord?.uuid ?? requestedUuid}
              </p>
              <CopyRuiButton value={maintenanceRecord?.uuid ?? requestedUuid} />
            </div>
          </div>
          <div className="hidden text-center sm:block">
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">Activo</p>
            <p className="text-sm font-black">{activoHVAC?.asset_code ?? 'Sin activo'}</p>
          </div>
          <span className="shrink-0 rounded-full border border-current bg-white/70 px-3 py-1 text-xs font-black uppercase tracking-wide">
            {normalizedStatus}
          </span>
        </section>

        <div className="px-4 pt-4 print:hidden">
          <ApprovalTimelineGraphic status={normalizedStatus} />
        </div>

        <section className="grid flex-1 grid-cols-12 gap-4 p-4 overflow-hidden h-[calc(100vh-10rem)] print:hidden">
          <div className="col-span-12 flex min-h-0 flex-col gap-3 overflow-hidden lg:col-span-8">
            <section className="grid shrink-0 gap-2 rounded border border-slate-200 bg-white p-3 text-xs md:grid-cols-3">
              <div>
                <p className="font-bold uppercase text-slate-500">Activo</p>
                <p className="mt-1 font-black text-slate-950">{activoHVAC?.asset_code ?? 'No disponible'}</p>
                <p className="truncate font-semibold text-slate-600">{activoHVAC?.asset_name ?? 'Checklist HVAC'}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-slate-500">Ubicacion</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {activoHVAC ? formatLocation(activoHVAC) : 'Ubicacion no disponible'}
                </p>
                <p className="font-semibold text-slate-600">{activoHVAC?.brand ?? 'Marca no disponible'}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-slate-500">Registro</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {maintenanceRecord?.record_code ?? 'Sin codigo'}
                </p>
                <p className="font-semibold text-slate-600">
                  {formatDateTimeUtc(maintenanceRecord?.executed_at ?? notes.captured_at)}
                </p>
              </div>
            </section>

            <section className="shrink-0 rounded border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
                    Evidencias fotograficas
                  </h2>
                  <p className="text-xs font-semibold text-slate-500">
                    Adjuntos capturados durante la inspeccion RUI.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                  {evidenceImageUrls.length} archivo(s)
                </span>
              </div>
              <EvidencePhotoGallery imageUrls={evidenceImageUrls} />
            </section>

            <section className="min-h-0 flex-1 overflow-y-auto max-h-full bg-white rounded border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-2 font-black">Campo</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-black">Valor</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-black">Unidad</th>
                    <th className="border-b border-slate-200 px-3 py-2 font-black">Seccion</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedResponses.map((respuesta) => {
                    const responseValue = formatResponseValue(respuesta);
                    const isOutOfRange = isOutOfRangeResponse(respuesta);

                    return (
                      <tr
                        className="border-b border-slate-100 align-top odd:bg-white even:bg-slate-50/80"
                        key={respuesta.field_key}
                      >
                        <td className="px-3 py-2 font-bold text-slate-900">{respuesta.field_label}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              isOutOfRange
                                ? 'inline-flex rounded bg-rose-50 px-2 py-1 text-rose-700 font-bold'
                                : 'font-semibold text-slate-700'
                            }
                          >
                            {responseValue}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-600">
                          {respuesta.unit ?? 'N/A'}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-500">
                          {respuesta.section_name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </div>

          <aside className="col-span-12 flex min-h-0 flex-col gap-3 overflow-y-auto lg:col-span-4">
            <article className="rounded border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
                  Tecnico
                </h2>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                  Firma Electronica
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">User ID</p>
                  <p className="break-all font-bold text-slate-900">
                    {maintenanceRecord?.assigned_technician ?? 'No disponible'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Timestamp UTC</p>
                  <p className="font-bold text-slate-900">
                    {formatDateTimeUtc(maintenanceRecord?.executed_at ?? notes.captured_at)}
                  </p>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    GxP Legal Meaning
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">
                    Confeccion del registro tecnico bajo accion afirmativa del operador.
                  </p>
                </div>
              </div>
            </article>

            <SignatureReviewCard
              canSign={supervisorCanSign}
              currentUserRole={usuario?.role ?? 'Sin rol activo'}
              rejectionComments={maintenanceRecord?.rejection_comments ?? null}
              recordUuid={maintenanceRecord?.uuid ?? ''}
              reviewerTitle="Supervisor"
              signedAt={maintenanceRecord?.supervisor_signed_at ?? null}
              signedBy={maintenanceRecord?.supervisor_signed_by ?? null}
              signingRole="supervisor"
              status={normalizedStatus}
            />

            <SignatureReviewCard
              canSign={usuario?.can_approve === true}
              currentUserRole={usuario?.role ?? 'Sin rol activo'}
              rejectionComments={maintenanceRecord?.rejection_comments ?? null}
              recordUuid={maintenanceRecord?.uuid ?? ''}
              reviewerTitle="Calidad"
              signedAt={maintenanceRecord?.quality_signed_at ?? null}
              signedBy={maintenanceRecord?.quality_signed_by ?? null}
              signingRole="quality"
              status={normalizedStatus}
            />
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950 print:bg-white print:px-0 print:py-0 print:text-black">
      <style>
        {`
          @media print {
            @page {
              size: 8.5in 11in;
              margin: 0.35in 0.35in 0.35in 0.35in;
            }

            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 print:relative print:h-[10.3in] print:max-w-none print:overflow-hidden print:bg-white print:px-0 print:pb-[1.85in] print:pt-0 print:text-black">
        <div className="hidden items-center justify-between border-b border-slate-400 pb-1.5 text-[9px] leading-tight text-slate-700 print:flex">
          <div className="flex h-12 w-24 items-center justify-center border border-slate-400 text-[8px] font-semibold uppercase text-slate-700">
            Logo corporativo
          </div>
          <div className="max-w-[4.5in] px-3 text-center text-[9.5px] font-bold uppercase tracking-wide text-black">
            Mantenimiento correctivo y preventivo de equipos de aires acondicionados
          </div>
          <div className="w-36 text-right text-[8px] leading-tight text-slate-700">
            <p>Planta Central Labymed</p>
            <p>Direccion: Panama</p>
            <p>Tel: +507 0000-0000</p>
            <p>Fax: +507 0000-0000</p>
            <p>calidad@labymed.com</p>
            <p>www.labymed.com</p>
          </div>
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:hidden">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                Documento unico de inspeccion
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                {activoHVAC?.asset_code ?? 'Activo no disponible'}
              </h1>
              <p className="mt-1 text-sm text-slate-700">
                {activoHVAC?.asset_name ?? 'Checklist HVAC'}
              </p>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-md bg-slate-100 px-3 py-2">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha de confeccion
                  </span>
                  <span className="mt-1 block font-semibold text-slate-900">
                    {formatDateTimeUtc(maintenanceRecord?.executed_at ?? notes.captured_at)}
                  </span>
                </div>
                <div className="rounded-md bg-slate-100 px-3 py-2">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ubicacion
                  </span>
                  <span className="mt-1 block font-semibold text-slate-900">
                    {activoHVAC ? formatLocation(activoHVAC) : 'Ubicacion no disponible'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 print:items-end">
              <div className="flex h-[120px] w-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600 print:bg-white print:text-black">
                <QrCode size={42} />
                <span className="mt-2 px-2 text-center text-[10px] leading-4">
                  {reportPath}
                </span>
              </div>
              <PrintReportButton />
            </div>
          </div>
        </header>

        <div className="print:hidden">
          <ApprovalTimelineGraphic status={normalizedStatus} />
        </div>

        {camposLookupError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            No fue posible cargar la plantilla TMP-HVAC-PM.
          </div>
        ) : null}

        {activoLookupError || !activoHVAC ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            No fue posible cargar el activo solicitado.
          </div>
        ) : null}

        {maintenanceRecord ? (
          <div className={`print:hidden rounded-lg border p-4 text-sm font-medium ${statusBanner.className}`}>
            {statusBanner.text}
          </div>
        ) : null}

        {normalizedStatus === 'rejected' && maintenanceRecord?.rejection_comments ? (
          <div className="print:hidden rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">
            {maintenanceRecord.rejection_comments}
          </div>
        ) : null}

        {activoHVAC && !isReadOnlyDocument ? (
          <ChecklistForm
            action={enviarChecklistAction}
            activoId={activoHVAC.id}
            assetUuid={activoHVAC.uuid}
            maintenanceRecordId={maintenanceRecord?.id ?? null}
            maintenanceRecordUuid={maintenanceRecord?.uuid ?? null}
            maintenanceStatus={normalizedStatus}
            rejectionComments={maintenanceRecord?.rejection_comments ?? null}
            initialResponses={editableInitialResponses}
            camposPorSeccion={groupBySection(campos)}
          />
        ) : null}

        {isReadOnlyDocument ? (
          <>
            <section className="hidden print:block">
              <div className="mb-1.5 grid grid-cols-3 border border-slate-500 text-[9px] leading-tight text-black">
                {printMetadata.map(([label, value]) => (
                  <div className="min-h-6 border border-slate-300 px-1 py-0.5" key={label}>
                    <span className="block font-bold uppercase">{label}</span>
                    <span className="block truncate">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1 text-[8px] text-black">
                <span>
                  Registro: <strong>{maintenanceRecord?.record_code ?? 'sin codigo'}</strong>
                </span>
                <span>
                  Plantilla: <strong>{normalizeUtf8String(notes.template_code ?? 'TMP-HVAC-PM')}</strong>
                </span>
                <span>
                  Estado: <strong>{statusBanner.text}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 font-sans text-[8.5px] leading-tight text-black">
                {orderedResponses.map((respuesta) => (
                  <div
                    className="flex min-w-0 justify-between gap-2 border-b border-slate-200 py-px"
                    key={`print-${respuesta.field_key}`}
                  >
                    <span className="truncate font-semibold">{respuesta.field_label}</span>
                    <span className="shrink-0 text-right">{formatResponseValue(respuesta)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-1.5 border-t border-slate-300 pt-1 text-[8px] leading-tight text-black">
                <strong>Observaciones finales: </strong>
                {notes.technical_observations || 'Sin observaciones registradas'}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold tracking-normal">Reporte de inspeccion</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Registro {maintenanceRecord?.record_code ?? 'sin codigo'} preparado para
                    revision, liberacion y soporte de impresion.
                  </p>
                </div>
                <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 print:bg-white print:text-black">
                  Plantilla: {normalizeUtf8String(notes.template_code ?? 'TMP-HVAC-PM')}
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 print:bg-white print:text-black">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">
                    Observaciones finales
                  </span>
                  <span className="mt-1 block text-slate-800 print:text-black">
                    {notes.technical_observations || 'Sin observaciones registradas'}
                  </span>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 print:bg-white print:text-black">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">
                    Total de campos del checklist
                  </span>
                  <span className="mt-1 block font-semibold text-slate-900 print:text-black">
                    {orderedResponses.length}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-5">
                {Object.entries(responsesBySection).map(([sectionName, sectionResponses]) => (
                  <section key={sectionName}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 print:text-black">
                      {sectionName}
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {sectionResponses.map((respuesta) => {
                        const responseValue = formatResponseValue(respuesta);
                        const hasValue = hasAnyValue(respuesta);

                        return (
                          <article
                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 print:bg-white print:text-black"
                            key={`${sectionName}-${respuesta.field_key}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-black">
                                  {respuesta.field_key}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-950 print:text-black">
                                  {respuesta.field_label}
                                </p>
                              </div>
                              {!hasValue ? (
                                <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500 print:border-slate-400 print:text-black">
                                  Sin dato
                                </span>
                              ) : null}
                            </div>

                            {respuesta.valor_seleccion ? (
                              <span className="mt-3 inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-800 print:border-slate-500 print:text-black">
                                {respuesta.valor_seleccion}
                              </span>
                            ) : null}

                            {respuesta.valor_numerico !== null ? (
                              <p className="mt-3 text-base font-semibold text-slate-700 print:text-black">
                                {responseValue}
                              </p>
                            ) : null}

                            {respuesta.valor_booleano !== null ? (
                              <p className="mt-3 text-base font-semibold text-slate-700 print:text-black">
                                {responseValue}
                              </p>
                            ) : null}

                            {respuesta.valor_texto ? (
                              isEvidenceValue(respuesta) ? (
                                <a
                                  className="mt-3 block break-all text-sm font-semibold text-sky-700 underline print:text-black"
                                  href={respuesta.valor_texto}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  {getEvidenceLabel(respuesta.valor_texto)}
                                </a>
                              ) : (
                                <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium text-slate-700 print:text-black">
                                  {respuesta.valor_texto}
                                </p>
                              )
                            ) : null}

                            {!hasValue ? (
                              <p className="mt-3 text-sm font-medium text-slate-500 print:text-black">
                                Sin valor registrado
                              </p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:hidden">
              <h2 className="text-base font-semibold tracking-normal">Cadena de firmas</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">Tecnico</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-900">Email: </span>
                      {maintenanceRecord?.assigned_technician ?? 'No disponible'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Fecha UTC: </span>
                      {formatDateTimeUtc(maintenanceRecord?.executed_at ?? notes.captured_at)}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">Motivo: </span>
                      {notes.technical_observations || 'Inspeccion preventiva HVAC'}
                    </div>
                  </div>
                </article>

                <SignatureReviewCard
                  canSign={supervisorCanSign}
                  currentUserRole={usuario?.role ?? 'Sin rol activo'}
                  rejectionComments={maintenanceRecord?.rejection_comments ?? null}
                  recordUuid={maintenanceRecord?.uuid ?? ''}
                  reviewerTitle="Supervisor"
                  signedAt={maintenanceRecord?.supervisor_signed_at ?? null}
                  signedBy={maintenanceRecord?.supervisor_signed_by ?? null}
                  signingRole="supervisor"
                  status={normalizedStatus}
                />

                <SignatureReviewCard
                  canSign={usuario?.can_approve === true}
                  currentUserRole={usuario?.role ?? 'Sin rol activo'}
                  rejectionComments={maintenanceRecord?.rejection_comments ?? null}
                  recordUuid={maintenanceRecord?.uuid ?? ''}
                  reviewerTitle="Calidad"
                  signedAt={maintenanceRecord?.quality_signed_at ?? null}
                  signedBy={maintenanceRecord?.quality_signed_by ?? null}
                  signingRole="quality"
                  status={normalizedStatus}
                />
              </div>
            </section>

            <section className="hidden [break-inside:avoid] [page-break-inside:avoid] print:absolute print:bottom-0 print:left-0 print:right-0 print:grid print:grid-cols-3 print:gap-3 print:border-t-2 print:border-black print:pt-3">
              <article className="h-[1.62in] [break-inside:avoid] [page-break-inside:avoid] border border-black px-2 py-1.5 text-[7.5px] leading-tight text-black">
                <div className="mb-4 h-12 border-b border-slate-400" />
                <p className="font-bold uppercase">Tecnico</p>
                <p>Usuario: {maintenanceRecord?.assigned_technician ?? 'No disponible'}</p>
                <p>Fecha UTC: {formatDateTimeUtc(maintenanceRecord?.executed_at ?? notes.captured_at)}</p>
                <p className="mt-0.5">
                  Significado legal: Confeccion del registro tecnico bajo accion afirmativa.
                </p>
              </article>

              <article className="h-[1.62in] [break-inside:avoid] [page-break-inside:avoid] border border-black px-2 py-1.5 text-[7.5px] leading-tight text-black">
                <div className="mb-4 h-12 border-b border-slate-400" />
                <p className="font-bold uppercase">Supervisor</p>
                <p>Usuario: {maintenanceRecord?.supervisor_signed_by ?? 'Pendiente'}</p>
                <p>Fecha UTC: {formatDateTimeUtc(maintenanceRecord?.supervisor_signed_at)}</p>
                <p className="mt-0.5">
                  Significado legal: Revision de cumplimiento operativo FDA 21 CFR Part 11.
                </p>
              </article>

              <article className="h-[1.62in] [break-inside:avoid] [page-break-inside:avoid] border border-black px-2 py-1.5 text-[7.5px] leading-tight text-black">
                <div className="mb-4 h-12 border-b border-slate-400" />
                <p className="font-bold uppercase">Calidad</p>
                <p>Usuario: {maintenanceRecord?.quality_signed_by ?? 'Pendiente'}</p>
                <p>Fecha UTC: {formatDateTimeUtc(maintenanceRecord?.quality_signed_at)}</p>
                <p className="mt-0.5">
                  Significado legal: Liberacion documental e inmutabilidad del registro.
                </p>
              </article>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
