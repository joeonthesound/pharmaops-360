import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { PrintTrigger } from './print-trigger';

export const dynamic = 'force-dynamic';

type PrintPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type MaintenanceRecord = {
  id: number;
  uuid: string;
  record_code: string | null;
  asset_code: string | null;
  template_code: string | null;
  assigned_technician: string | null;
  executed_at: string | null;
  status: string | null;
  notes: string | null;
  supervisor_signed_by: string | null;
  supervisor_signed_at: string | null;
  quality_signed_by: string | null;
  quality_signed_at: string | null;
  management_signed_by: string | null;
  management_signed_at: string | null;
  rejection_comments: string | null;
};

type AssetProfile = {
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
  area: string | null;
  brand: string | null;
  location_detail: string | null;
  model: string | null;
  serial_number: string | null;
  site: string | null;
  status: string | null;
};

type FormField = {
  id: number;
  field_label: string | null;
  field_type: string | null;
  section_name: string | null;
  unit: string | null;
  section_order: number | null;
  field_order: number | null;
};

type FormResponse = {
  campo_id: number | null;
  valor_booleano: boolean | null;
  valor_numerico: number | string | null;
  valor_seleccion: string | null;
  valor_texto: string | null;
};

type UserProfile = {
  role: string | null;
  user_email: string | null;
};

type PrintNotes = {
  print_metadata?: {
    count?: number;
    last_printed_at_utc?: string;
    last_printed_by?: string;
  };
  [key: string]: unknown;
};

type ChecklistRow = {
  fieldLabel: string;
  sectionName: string;
  unit: string;
  value: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeText(value: unknown, fallback = 'N/A') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function normalizeRole(role: string | null | undefined) {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isAuditorRole(role: string | null | undefined) {
  return normalizeRole(role) === 'auditor';
}

function formatUtc(value: string | null | undefined) {
  if (!value) {
    return 'Pendiente';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function parseNotes(notes: string | null): PrintNotes {
  if (!notes) {
    return {};
  }

  try {
    const parsed = JSON.parse(notes) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as PrintNotes)
      : { raw_notes: notes };
  } catch {
    return { raw_notes: notes };
  }
}

function buildUpdatedNotes({
  notes,
  operatorEmail,
  printedAtUtc,
}: {
  notes: PrintNotes;
  operatorEmail: string;
  printedAtUtc: string;
}) {
  const previousCount = Number(notes.print_metadata?.count ?? 0);
  const printIndex = Number.isFinite(previousCount) ? previousCount + 1 : 1;

  return {
    notes: {
      ...notes,
      print_metadata: {
        count: printIndex,
        last_printed_at_utc: printedAtUtc,
        last_printed_by: operatorEmail,
      },
    },
    printIndex,
  };
}

function getResponseValue(response: FormResponse | undefined) {
  if (!response) {
    return 'Sin respuesta registrada';
  }

  if (response.valor_numerico !== null && response.valor_numerico !== undefined) {
    return String(response.valor_numerico);
  }

  if (response.valor_seleccion) {
    return response.valor_seleccion;
  }

  if (response.valor_texto) {
    return response.valor_texto;
  }

  if (response.valor_booleano !== null && response.valor_booleano !== undefined) {
    return response.valor_booleano ? 'Si' : 'No';
  }

  return 'Sin respuesta registrada';
}

function buildChecklistRows(fields: FormField[], responses: FormResponse[]) {
  const responsesByFieldId = new Map<number, FormResponse>();

  responses.forEach((response) => {
    if (typeof response.campo_id === 'number') {
      responsesByFieldId.set(response.campo_id, response);
    }
  });

  return fields.map<ChecklistRow>((field) => ({
    fieldLabel: normalizeText(field.field_label, `Campo ${field.id}`),
    sectionName: normalizeText(field.section_name, 'Inspeccion tecnica'),
    unit: normalizeText(field.unit, 'N/A'),
    value: getResponseValue(responsesByFieldId.get(field.id)),
  }));
}

function getSignatureRows(record: MaintenanceRecord) {
  return [
    {
      meaning: 'Confeccion del registro tecnico bajo accion afirmativa del operador.',
      role: 'Tecnico',
      timestamp: record.executed_at,
      user: record.assigned_technician,
    },
    {
      meaning: 'Revision de cumplimiento operativo bajo FDA 21 CFR Part 11.',
      role: 'Supervisor',
      timestamp: record.supervisor_signed_at,
      user: record.supervisor_signed_by,
    },
    {
      meaning: 'Liberacion documental e inmutabilidad del registro aprobado.',
      role: 'Calidad',
      timestamp: record.quality_signed_at,
      user: record.quality_signed_by,
    },
    {
      meaning: 'Aprobacion final y cierre administrativo del RUI.',
      role: 'Gerencia',
      timestamp: record.management_signed_at,
      user: record.management_signed_by,
    },
  ];
}

export default async function ControlledPrintPage({ params }: PrintPageProps) {
  const resolvedParams = await params;
  const recordUuid = normalizeText(resolvedParams.id, '');

  if (!UUID_PATTERN.test(recordUuid)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const operatorEmail = user?.email?.trim().toLowerCase() ?? '';

  if (!operatorEmail) {
    redirect('/?error=unauthorized');
  }

  const { data: profileData } = await supabase
    .from('usuarios_roles')
    .select('user_email, role')
    .eq('user_email', operatorEmail)
    .eq('active', true)
    .maybeSingle();
  const profile = profileData as UserProfile | null;

  if (!profile) {
    redirect('/?error=unauthorized');
  }

  const { data: recordData } = await supabase
    .from('mantenimientos_registros')
    .select(
      'id, uuid, record_code, asset_code, template_code, assigned_technician, executed_at, status, notes, supervisor_signed_by, supervisor_signed_at, quality_signed_by, quality_signed_at, management_signed_by, management_signed_at, rejection_comments',
    )
    .eq('uuid', recordUuid)
    .maybeSingle();

  if (!recordData) {
    notFound();
  }

  const record = recordData as MaintenanceRecord;
  const printedAtUtc = new Date().toISOString();
  const parsedNotes = parseNotes(record.notes);
  const { notes: updatedNotes, printIndex } = buildUpdatedNotes({
    notes: parsedNotes,
    operatorEmail,
    printedAtUtc,
  });

  await supabase
    .from('mantenimientos_registros')
    .update({
      notes: JSON.stringify(updatedNotes),
    })
    .eq('uuid', record.uuid);

  await supabase.from('audit_trail').insert({
    entity: 'mantenimientos_registros',
    entity_uuid: record.uuid,
    accion: 'PRINT_CONTROLLED_COPY',
    usuario: operatorEmail,
    timestamp: printedAtUtc,
    comentarios: JSON.stringify({
      action: 'PRINT_CONTROLLED_COPY',
      operator_identity: operatorEmail,
      metadata_snapshot: {
        print_index: printIndex,
        target_rui: record.uuid,
        timestamp: printedAtUtc,
      },
    }),
  });

  const [
    { data: assetData },
    { data: fieldsData },
    { data: responsesData },
  ] = await Promise.all([
    record.asset_code
      ? supabase
          .from('activos')
          .select('asset_code, asset_name, asset_type, site, area, location_detail, status, brand, model, serial_number')
          .eq('asset_code', record.asset_code)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('formularios_campos')
      .select('id, field_label, field_type, section_name, unit, section_order, field_order')
      .order('section_order', { ascending: true })
      .order('field_order', { ascending: true }),
    supabase
      .from('formularios_respuestas')
      .select('campo_id, valor_texto, valor_seleccion, valor_numerico, valor_booleano')
      .eq('mantenimiento_id', record.id),
  ]);

  const asset = assetData as AssetProfile | null;
  const checklistRows = buildChecklistRows(
    (fieldsData ?? []) as FormField[],
    (responsesData ?? []) as FormResponse[],
  );
  const signatureRows = getSignatureRows(record);
  const isAuditor = isAuditorRole(profile.role);

  return (
    <main className="min-h-screen bg-white text-black print:bg-white">
      <PrintTrigger />
      <style>
        {`
          @media print {
            @page {
              size: letter;
              margin: 0.45in;
            }

            html,
            body {
              background: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>

      <div className="print:hidden border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">
            Preparando copia controlada para impresión.
          </p>
          <span className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Use Ctrl/Cmd + P si el diálogo no abre
          </span>
        </div>
      </div>

      <section className="relative mx-auto min-h-screen max-w-5xl bg-white px-8 py-8 print:max-w-none print:px-0 print:py-0">
        {isAuditor ? (
          <div className="pointer-events-none fixed inset-0 hidden items-center justify-center print:flex">
            <p className="text-center text-5xl font-black uppercase tracking-wide text-slate-200/70" style={{ transform: 'rotate(-35deg)' }}>
              COPIA CONTROLADA - EXCLUSIVO PARA AUDITORÍA
            </p>
          </div>
        ) : null}

        <header className="relative z-10 grid gap-4 border-b-2 border-black pb-4 sm:grid-cols-[140px_1fr]">
          <div className="flex h-16 items-center justify-center border border-slate-400 text-xs font-black uppercase text-slate-600">
            Logo corporativo
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-600">
              PharmaOps 360 - Copia Controlada
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase">
              Expediente RUI Inmutable
            </h1>
            <div className="mt-2 grid gap-1 text-xs font-semibold sm:grid-cols-2">
              <p>RUI UUID: {record.uuid}</p>
              <p>Record Code: {record.record_code ?? 'Sin codigo'}</p>
              <p>Activo: {record.asset_code ?? asset?.asset_code ?? 'N/A'}</p>
              <p>Estado: {record.status ?? 'N/A'}</p>
              <p>Solicitado por: {operatorEmail}</p>
              <p>Impresión UTC: {formatUtc(printedAtUtc)}</p>
            </div>
          </div>
        </header>

        <section className="relative z-10 mt-5 grid gap-3 text-xs sm:grid-cols-3">
          <div className="border border-slate-400 p-2">
            <p className="font-black uppercase">Activo Fijo</p>
            <p>{asset?.asset_name ?? 'Activo no disponible'}</p>
            <p>{asset?.brand ?? 'Marca N/A'} / {asset?.model ?? 'Modelo N/A'}</p>
          </div>
          <div className="border border-slate-400 p-2">
            <p className="font-black uppercase">Ubicación</p>
            <p>{[asset?.location_detail, asset?.area, asset?.site].filter(Boolean).join(' / ') || 'N/A'}</p>
          </div>
          <div className="border border-slate-400 p-2">
            <p className="font-black uppercase">Control de Copia</p>
            <p>Copia Controlada Impresión #{printIndex}</p>
            <p>Usuario: {operatorEmail}</p>
          </div>
        </section>

        <section className="relative z-10 mt-5">
          <h2 className="mb-2 text-sm font-black uppercase">Checklist de ejecución</h2>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-500 px-2 py-1 text-left">Sección</th>
                <th className="border border-slate-500 px-2 py-1 text-left">Campo</th>
                <th className="border border-slate-500 px-2 py-1 text-left">Valor</th>
                <th className="border border-slate-500 px-2 py-1 text-left">Unidad</th>
              </tr>
            </thead>
            <tbody>
              {checklistRows.map((row, index) => (
                <tr key={`${row.fieldLabel}-${index}`}>
                  <td className="border border-slate-400 px-2 py-1">{row.sectionName}</td>
                  <td className="border border-slate-400 px-2 py-1 font-semibold">{row.fieldLabel}</td>
                  <td className="border border-slate-400 px-2 py-1">{row.value}</td>
                  <td className="border border-slate-400 px-2 py-1">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="relative z-10 mt-5">
          <h2 className="mb-2 text-sm font-black uppercase">Cadena de firmas electrónicas</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {signatureRows.map((signature) => (
              <article className="border border-slate-500 p-3 text-xs" key={signature.role}>
                <p className="font-black uppercase">{signature.role}</p>
                <p className="mt-1">
                  <span className="font-bold">Usuario: </span>
                  {signature.user ?? 'Pendiente'}
                </p>
                <p>
                  <span className="font-bold">Timestamp UTC: </span>
                  {formatUtc(signature.timestamp)}
                </p>
                <p className="mt-1">
                  <span className="font-bold">Significado legal: </span>
                  {signature.meaning}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="relative z-10 mt-6 border-t-2 border-black pt-3 text-center text-xs font-black">
          Copia Controlada Impresión #{printIndex} | Solicitado por: {operatorEmail}
        </footer>

        <div className="print:hidden mt-8 flex justify-center">
          <Link className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/auditoria">
            Volver al portal de auditoría
          </Link>
        </div>
      </section>
    </main>
  );
}
