import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { ApprovalActionsPanel } from './approval-actions-panel';

type AprobarPageProps = {
  params: Promise<{
    area: string;
  }>;
};

type MaintenanceStatus =
  | 'draft'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'approved'
  | 'rejected';

type MantenimientoRegistro = {
  id: number;
  uuid: string;
  record_code: string | null;
  asset_code: string | null;
  template_code: string | null;
  assigned_technician: string | null;
  executed_at: string | null;
  status: MaintenanceStatus | string | null;
  notes: string | null;
  supervisor_signed_by: string | null;
  supervisor_signed_at: string | null;
  quality_signed_by: string | null;
  quality_signed_at: string | null;
  rejection_comments: string | null;
};

type ActivoResumen = {
  asset_code: string;
  asset_name: string;
  brand: string;
  model: string;
  area: string;
  location_detail: string | null;
};

type UsuarioPermisos = {
  user_email: string;
  full_name: string | null;
  role: string | null;
  can_review: boolean | null;
  can_approve: boolean | null;
};

type FormularioRespuesta = {
  mantenimiento_id: number | null;
  campo_id: number | null;
  valor_texto: string | null;
  valor_seleccion: string | null;
  valor_numerico: number | null;
};

type FormularioCampoMetadata = {
  id: number;
  field_key: string | null;
  section_name: string | null;
  field_label: string;
  field_type: string | null;
  unit: string | null;
  section_order: number | null;
  field_order: number | null;
};

type RespuestaAuditada = FormularioRespuesta & {
  field_key: string;
  field_label: string;
  section_name: string;
  unit: string | null;
  section_order: number;
  field_order: number;
};

const statusLabel: Record<MaintenanceStatus, string> = {
  draft: 'Borrador',
  pending_supervisor: 'Pendiente Supervisor',
  pending_quality: 'Pendiente Calidad',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

const statusClass: Record<MaintenanceStatus, string> = {
  draft: 'border-slate-200 bg-slate-100 text-slate-700',
  pending_supervisor: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_quality: 'border-sky-200 bg-sky-50 text-sky-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
};

function isMaintenanceStatus(status: string | null | undefined): status is MaintenanceStatus {
  return (
    status === 'draft' ||
    status === 'pending_supervisor' ||
    status === 'pending_quality' ||
    status === 'approved' ||
    status === 'rejected'
  );
}

function formatLocation(activo: ActivoResumen | null) {
  if (!activo) {
    return 'Activo no disponible';
  }

  return [activo.location_detail, activo.area].filter(Boolean).join(' / ') || activo.area;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Pendiente';
  }

  return new Intl.DateTimeFormat('es-PA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Panama',
  }).format(new Date(value));
}

function getOutOfRangeCount(respuestas: FormularioRespuesta[]) {
  return respuestas.filter((respuesta) => respuesta.valor_numerico !== null).length;
}

function buildOrderedResponses(
  respuestas: FormularioRespuesta[],
  campos: FormularioCampoMetadata[],
): RespuestaAuditada[] {
  const metadataByFieldKey = new Map(
    campos
      .filter((campo) => Boolean(campo.field_key))
      .map((campo) => [campo.field_key as string, campo]),
  );

  return respuestas
    .map((respuesta) => {
      const metadata = campos.find((campo) => campo.id === respuesta.campo_id);

      return {
        ...respuesta,
        field_key: metadata?.field_key ?? `campo_${respuesta.campo_id ?? 'sin_id'}`,
        field_label: metadata?.field_label ?? `Campo ${respuesta.campo_id ?? '-'}`,
        section_name: metadata?.section_name ?? 'Inspeccion tecnica',
        unit: metadata?.unit ?? null,
        section_order: metadata?.section_order ?? 999,
        field_order: metadata?.field_order ?? 999,
      };
    })
    .sort((left, right) => {
      if (left.section_order !== right.section_order) {
        return left.section_order - right.section_order;
      }

      return left.field_order - right.field_order;
    });
}

function formatResponseValue(respuesta: RespuestaAuditada) {
  if (respuesta.valor_seleccion) {
    return respuesta.valor_seleccion;
  }

  if (respuesta.valor_numerico !== null) {
    return `${respuesta.valor_numerico}${respuesta.unit ? ` ${respuesta.unit}` : ''}`;
  }

  if (respuesta.valor_texto) {
    return respuesta.valor_texto;
  }

  return 'Sin valor';
}

export default async function PanelAprobacionPage({ params }: AprobarPageProps) {
  const resolvedParams = await params;
  const recordUuid = String(resolvedParams.area ?? '').trim();
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email?.trim().toLowerCase() ?? '';

  const { data: registroData, error: registroError } = await supabase
    .from('mantenimientos_registros')
    .select(
      'id, uuid, record_code, asset_code, template_code, assigned_technician, executed_at, status, notes, supervisor_signed_by, supervisor_signed_at, quality_signed_by, quality_signed_at, rejection_comments',
    )
    .eq('uuid', recordUuid)
    .maybeSingle();

  const registro = registroData as MantenimientoRegistro | null;
  const normalizedStatus = isMaintenanceStatus(registro?.status) ? registro.status : 'draft';

  const [
    { data: activoData },
    { data: respuestasData },
    { data: camposData },
    { data: usuarioData },
  ] =
    await Promise.all([
      registro?.asset_code
        ? supabase
            .from('activos')
            .select('asset_code, asset_name, brand, model, area, location_detail')
            .eq('asset_code', registro.asset_code)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from('formularios_respuestas')
        .select('mantenimiento_id, campo_id, valor_texto, valor_seleccion, valor_numerico')
        .eq('mantenimiento_id', registro?.id ?? 0),
      supabase
        .from('formularios_campos')
        .select('id, field_key, section_name, field_label, field_type, unit, section_order, field_order')
        .eq('template_code', registro?.template_code ?? 'TMP-HVAC-PM')
        .order('section_order', { ascending: true })
        .order('field_order', { ascending: true }),
      userEmail
        ? supabase
            .from('usuarios_roles')
            .select('user_email, full_name, role, can_review, can_approve')
            .eq('user_email', userEmail)
            .eq('active', true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const activo = activoData as ActivoResumen | null;
  const respuestas = (respuestasData ?? []) as FormularioRespuesta[];
  const campos = (camposData ?? []) as FormularioCampoMetadata[];
  const respuestasAuditadas = buildOrderedResponses(respuestas, campos);
  const usuario = usuarioData as UsuarioPermisos | null;
  const outOfRangeCount = getOutOfRangeCount(respuestas);
  const canReview = usuario?.can_review === true;
  const canApprove = usuario?.can_approve === true;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-5">
          <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                  Revision y firmas
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                  {activo?.asset_code ?? registro?.asset_code ?? 'Orden no disponible'}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Flujo humano de aprobacion con trazabilidad GxP / FDA 21 CFR Part 11.
                </p>
              </div>
              <span
                className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[normalizedStatus]}`}
              >
                {statusLabel[normalizedStatus]}
              </span>
            </div>
          </header>

          {registroError || !registro ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
              No fue posible cargar la orden de mantenimiento solicitada.
            </div>
          ) : null}

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold tracking-normal">Datos de la orden</h2>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md bg-slate-100 px-3 py-2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Codigo de registro
                </span>
                <span className="mt-1 block font-semibold text-slate-950">
                  {registro?.record_code ?? 'Sin codigo'}
                </span>
              </div>
              <div className="rounded-md bg-slate-100 px-3 py-2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Plantilla
                </span>
                <span className="mt-1 block font-semibold text-slate-950">
                  {registro?.template_code ?? 'Sin plantilla'}
                </span>
              </div>
              <div className="rounded-md bg-slate-100 px-3 py-2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Equipo
                </span>
                <span className="mt-1 block font-semibold text-slate-950">
                  {activo ? `${activo.brand} ${activo.model}` : 'Sin metadata'}
                </span>
              </div>
              <div className="rounded-md bg-slate-100 px-3 py-2">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Ubicacion
                </span>
                <span className="mt-1 block font-semibold text-slate-950">
                  {formatLocation(activo)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-normal">
                  Respuestas del tecnico
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {respuestasAuditadas.length} respuestas EAV recuperadas para auditoria.
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  outOfRangeCount > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {outOfRangeCount > 0 ? `${outOfRangeCount} fuera de rango` : 'Sin desviaciones'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {respuestasAuditadas.map((respuesta) => {
                const value = formatResponseValue(respuesta);

                return (
                  <article
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                    key={respuesta.field_key}
                  >
                    <div className="flex h-full flex-col justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {respuesta.section_name}
                        </p>
                        <p className="mt-1 font-semibold text-slate-950">
                          {respuesta.field_label}
                        </p>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <p className="text-base font-semibold text-slate-700">{value}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="grid gap-5 lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold tracking-normal">
              Historial de firmas electronicas
            </h2>
            <div className="mt-4 grid gap-3">
              <article className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Supervisor</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {registro?.supervisor_signed_by ?? 'Pendiente de firma'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(registro?.supervisor_signed_at ?? null)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      registro?.supervisor_signed_at
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-100 text-slate-700'
                    }`}
                  >
                    {registro?.supervisor_signed_at ? 'Firmado' : 'Pendiente'}
                  </span>
                </div>
              </article>

              <article className="rounded-md border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Aseguramiento de la Calidad
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {registro?.quality_signed_by ?? 'Pendiente de firma'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(registro?.quality_signed_at ?? null)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      registro?.quality_signed_at
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-100 text-slate-700'
                    }`}
                  >
                    {registro?.quality_signed_at ? 'Firmado' : 'Pendiente'}
                  </span>
                </div>
              </article>
            </div>
          </section>

          <ApprovalActionsPanel
            canApprove={canApprove}
            canReview={canReview}
            recordUuid={recordUuid}
            status={normalizedStatus}
            userRole={usuario?.role ?? 'Sin rol activo'}
          />
        </aside>
      </section>
    </main>
  );
}
