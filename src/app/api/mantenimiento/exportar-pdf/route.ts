import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  created_at: string | null;
  updated_at: string | null;
};

type AssetProfile = {
  asset_code: string;
  asset_name: string | null;
  asset_type: string | null;
  site: string | null;
  area: string | null;
  location_detail: string | null;
  status: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
};

type FormField = {
  id: number;
  field_key: string | null;
  section_name: string | null;
  field_label: string | null;
  field_type: string | null;
  unit: string | null;
  required: boolean | null;
  evidence_required: boolean | null;
  section_order: number | null;
  field_order: number | null;
};

type FormResponse = {
  campo_id: number | null;
  valor_texto: string | null;
  valor_seleccion: string | null;
  valor_numerico: number | string | null;
  valor_booleano: boolean | null;
};

type UserProfile = {
  user_email: string | null;
  full_name: string | null;
  role: string | null;
  active: boolean | null;
};

type AuditTrailInsertResult = {
  id: number;
};

type PdfPage = {
  commands: string[];
};

type PdfDocumentModel = {
  pages: PdfPage[];
  currentPage: PdfPage;
  y: number;
  trackingHash: string;
  generatedAtUtc: string;
  watermark: string | null;
};

type ChecklistRow = {
  sectionName: string;
  fieldLabel: string;
  fieldType: string;
  value: string;
  unit: string;
  boundaries: string;
  required: string;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 48;
const TOP_Y = 742;
const BOTTOM_Y = 78;
const LINE_HEIGHT = 14;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(status: number, message: string) {
  return Response.json({ ok: false, message }, { status });
}

function normalizeText(value: unknown, fallback = 'N/A') {
  const normalizedValue = String(value ?? '').normalize('NFC').trim();
  return normalizedValue || fallback;
}

function normalizeRole(role: string | null | undefined) {
  return normalizeText(role, 'Sin rol')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function getRequesterIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'ip-no-disponible';
  }

  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'ip-no-disponible'
  );
}

function createTrackingHash(input: {
  recordUuid: string;
  operatorEmail: string;
  roleAttribution: string;
  generatedAtUtc: string;
  purpose: string;
  ipAddress: string;
  userAgent: string;
}) {
  return createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 32)
    .toUpperCase();
}

function pdfString(value: string) {
  const normalized = value.normalize('NFC');
  const bytes = Buffer.alloc(2 + normalized.length * 2);
  bytes[0] = 0xfe;
  bytes[1] = 0xff;

  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    bytes[2 + index * 2] = code >> 8;
    bytes[3 + index * 2] = code & 0xff;
  }

  return `<${bytes.toString('hex').toUpperCase()}>`;
}

function textCommand(text: string, x: number, y: number, size = 10) {
  return `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm ${pdfString(text)} Tj ET`;
}

function drawLine(x1: number, y1: number, x2: number, y2: number) {
  return `${x1} ${y1} m ${x2} ${y2} l S`;
}

function wrapText(text: string, maxChars: number) {
  const words = normalizeText(text).split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function createPdfModel({
  generatedAtUtc,
  trackingHash,
  watermark,
}: {
  generatedAtUtc: string;
  trackingHash: string;
  watermark: string | null;
}): PdfDocumentModel {
  const firstPage: PdfPage = { commands: [] };

  return {
    pages: [firstPage],
    currentPage: firstPage,
    y: TOP_Y,
    trackingHash,
    generatedAtUtc,
    watermark,
  };
}

function addPage(model: PdfDocumentModel) {
  const page: PdfPage = { commands: [] };
  model.pages.push(page);
  model.currentPage = page;
  model.y = TOP_Y;
}

function ensureSpace(model: PdfDocumentModel, requiredHeight: number) {
  if (model.y - requiredHeight < BOTTOM_Y) {
    addPage(model);
  }
}

function addText(
  model: PdfDocumentModel,
  text: string,
  options: {
    size?: number;
    x?: number;
    maxChars?: number;
    gap?: number;
  } = {},
) {
  const size = options.size ?? 10;
  const maxChars = options.maxChars ?? 92;
  const gap = options.gap ?? LINE_HEIGHT;
  const lines = wrapText(text, maxChars);
  ensureSpace(model, lines.length * gap + 4);

  lines.forEach((line) => {
    model.currentPage.commands.push(textCommand(line, options.x ?? MARGIN_X, model.y, size));
    model.y -= gap;
  });
}

function addSectionTitle(model: PdfDocumentModel, title: string) {
  ensureSpace(model, 34);
  model.currentPage.commands.push(drawLine(MARGIN_X, model.y + 8, PAGE_WIDTH - MARGIN_X, model.y + 8));
  model.currentPage.commands.push(textCommand(title, MARGIN_X, model.y - 8, 12));
  model.y -= 30;
}

function addKeyValue(model: PdfDocumentModel, label: string, value: string) {
  addText(model, `${label}: ${normalizeText(value)}`, { maxChars: 98, gap: 13 });
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
    sectionName: normalizeText(field.section_name, 'Inspeccion tecnica'),
    fieldLabel: normalizeText(field.field_label ?? field.field_key, `Campo ${field.id}`),
    fieldType: normalizeText(field.field_type),
    value: getResponseValue(responsesByFieldId.get(field.id)),
    unit: normalizeText(field.unit),
    boundaries: 'Limites configurados: N/A',
    required: field.required || field.evidence_required ? 'Si' : 'No',
  }));
}

function addChecklistSection(model: PdfDocumentModel, rows: ChecklistRow[]) {
  let currentSection = '';

  rows.forEach((row) => {
    if (row.sectionName !== currentSection) {
      currentSection = row.sectionName;
      ensureSpace(model, 28);
      model.currentPage.commands.push(textCommand(`Seccion: ${currentSection}`, MARGIN_X, model.y, 11));
      model.y -= 18;
    }

    addText(model, `Campo: ${row.fieldLabel}`, { size: 9, maxChars: 96, gap: 12 });
    addText(model, `Valor: ${row.value}`, { size: 9, x: MARGIN_X + 12, maxChars: 92, gap: 12 });
    addText(model, `Tipo: ${row.fieldType} | Unidad: ${row.unit} | ${row.boundaries} | Requerido: ${row.required}`, {
      size: 8,
      x: MARGIN_X + 12,
      maxChars: 98,
      gap: 12,
    });
    model.y -= 4;
  });
}

function addSignatureGraph(model: PdfDocumentModel, record: MaintenanceRecord) {
  const signatures = [
    {
      stage: 'Tecnico',
      email: record.assigned_technician,
      timestamp: record.executed_at,
      intent: 'Ejecucion tecnica y captura inicial del RUI',
    },
    {
      stage: 'Supervisor',
      email: record.supervisor_signed_by,
      timestamp: record.supervisor_signed_at,
      intent: 'Revision tecnica de cumplimiento operativo',
    },
    {
      stage: 'Calidad',
      email: record.quality_signed_by,
      timestamp: record.quality_signed_at,
      intent: 'Verificacion regulatoria QA y liberacion documental',
    },
    {
      stage: 'Gerencia',
      email: record.management_signed_by,
      timestamp: record.management_signed_at,
      intent: 'Sello institucional y cierre gerencial',
    },
  ];

  signatures.forEach((signature) => {
    addText(model, `${signature.stage}: ${normalizeText(signature.email, 'Pendiente')}`, {
      size: 9,
      maxChars: 98,
      gap: 12,
    });
    addText(model, `Fecha UTC: ${normalizeText(signature.timestamp, 'Pendiente')} | Intencion: ${signature.intent}`, {
      size: 8,
      x: MARGIN_X + 12,
      maxChars: 98,
      gap: 12,
    });
    model.y -= 3;
  });
}

function buildPageContent(page: PdfPage, pageNumber: number, totalPages: number, model: PdfDocumentModel) {
  const commands = [...page.commands];

  if (model.watermark) {
    commands.unshift(
      `q 0.88 0.88 0.88 rg BT /F1 28 Tf 0.707 0.707 -0.707 0.707 96 230 Tm ${pdfString(
        model.watermark,
      )} Tj ET Q`,
    );
  }

  commands.push(drawLine(MARGIN_X, 54, PAGE_WIDTH - MARGIN_X, 54));
  commands.push(
    textCommand(
      `Pagina ${pageNumber} de ${totalPages} | Generado UTC: ${model.generatedAtUtc} | Tracking Hash: ${model.trackingHash}`,
      MARGIN_X,
      38,
      8,
    ),
  );

  return commands.join('\n');
}

function toPdfBuffer(model: PdfDocumentModel) {
  const objects: string[] = [];
  const pagesRootObjectNumber = 2;
  const fontObjectNumber = 3;
  const firstPageObjectNumber = 4;
  const pageObjectNumbers: number[] = [];

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[fontObjectNumber - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  model.pages.forEach((page, index) => {
    const pageObjectNumber = firstPageObjectNumber + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    const content = buildPageContent(page, index + 1, model.pages.length, model);

    pageObjectNumbers.push(pageObjectNumber);
    objects[pageObjectNumber - 1] =
      `<< /Type /Page /Parent ${pagesRootObjectNumber} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber - 1] =
      `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`;
  });

  objects[pagesRootObjectNumber - 1] =
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((objectNumber) => `${objectNumber} 0 R`).join(' ')}] /Count ${pageObjectNumbers.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((objectBody, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${index + 1} 0 obj\n${objectBody}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

function buildControlledCopyPdf(input: {
  record: MaintenanceRecord;
  asset: AssetProfile | null;
  checklistRows: ChecklistRow[];
  generatedAtUtc: string;
  trackingHash: string;
  requesterRole: string;
}) {
  const model = createPdfModel({
    generatedAtUtc: input.generatedAtUtc,
    trackingHash: input.trackingHash,
    watermark:
      normalizeRole(input.requesterRole) === 'auditor'
        ? 'COPIA CONTROLADA - EXCLUSIVO PARA AUDITORIA'
        : null,
  });
  const asset = input.asset;

  addText(model, 'PharmaOps 360 - Copia Controlada de RUI', { size: 16, maxChars: 78, gap: 18 });
  addText(model, 'Reporte legal generado desde estado inmutable de base de datos', {
    size: 10,
    maxChars: 90,
    gap: 18,
  });

  addSectionTitle(model, 'Bloque de cabecera');
  addKeyValue(model, 'RUI UUID', input.record.uuid);
  addKeyValue(model, 'Codigo de registro', normalizeText(input.record.record_code));
  addKeyValue(model, 'Estado documental', normalizeText(input.record.status));
  addKeyValue(model, 'Activo', `${normalizeText(input.record.asset_code)} - ${normalizeText(asset?.asset_name)}`);
  addKeyValue(model, 'Tipo de activo', normalizeText(asset?.asset_type));
  addKeyValue(model, 'Ubicacion / area', `${normalizeText(asset?.location_detail)} / ${normalizeText(asset?.area)}`);
  addKeyValue(model, 'Criticidad', 'No especificada en metadata canonica');
  addKeyValue(model, 'Marca / modelo / serie', `${normalizeText(asset?.brand)} / ${normalizeText(asset?.model)} / ${normalizeText(asset?.serial_number)}`);

  addSectionTitle(model, 'Logs de inspeccion tecnica');
  if (input.checklistRows.length > 0) {
    addChecklistSection(model, input.checklistRows);
  } else {
    addText(model, 'No existen respuestas de checklist registradas para este RUI.', {
      size: 10,
      maxChars: 88,
    });
  }

  addSectionTitle(model, 'Grafo de captura de firmas');
  addSignatureGraph(model, input.record);

  addSectionTitle(model, 'Control de extraccion');
  addKeyValue(model, 'Tracking Hash', input.trackingHash);
  addKeyValue(model, 'Generado UTC', input.generatedAtUtc);
  addKeyValue(model, 'Rol solicitante', input.requesterRole);
  addText(
    model,
    'Este PDF es una copia controlada derivada. La fuente primaria permanece en Supabase bajo pistas de auditoria GxP.',
    { size: 9, maxChars: 92 },
  );

  return toPdfBuffer(model);
}

export async function GET(request: NextRequest) {
  const recordUuid = normalizeText(request.nextUrl.searchParams.get('id'), '');
  const purpose = normalizeText(
    request.nextUrl.searchParams.get('purpose') ?? request.nextUrl.searchParams.get('justification'),
    'Exportacion controlada de evidencia RUI',
  );

  if (!UUID_PATTERN.test(recordUuid)) {
    return jsonResponse(400, 'Parametro id de RUI invalido o ausente.');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();
  const operatorEmail = user?.email?.trim().toLowerCase() ?? '';

  if (sessionError || !operatorEmail) {
    return jsonResponse(401, 'Sesion invalida o expirada para exportacion PDF controlada.');
  }

  const { data: profileData, error: profileError } = await supabase
    .from('usuarios_roles')
    .select('user_email, full_name, role, active')
    .eq('user_email', operatorEmail)
    .eq('active', true)
    .maybeSingle();

  if (profileError || !profileData) {
    return jsonResponse(403, 'Usuario sin perfil activo autorizado para extraccion documental.');
  }

  const profile = profileData as UserProfile;
  const roleAttribution = normalizeText(profile.role, 'Perfil no clasificado');

  const { data: recordData, error: recordError } = await supabase
    .from('mantenimientos_registros')
    .select(
      'id, uuid, record_code, asset_code, template_code, assigned_technician, executed_at, status, notes, supervisor_signed_by, supervisor_signed_at, quality_signed_by, quality_signed_at, management_signed_by, management_signed_at, rejection_comments, created_at, updated_at',
    )
    .eq('uuid', recordUuid)
    .maybeSingle();

  if (recordError) {
    console.error('[ALERTA PDF GxP] Error consultando RUI canonico', {
      recordUuid,
      operatorEmail,
      error: recordError,
    });
    return jsonResponse(500, 'No fue posible consultar el registro canonico del RUI.');
  }

  if (!recordData) {
    return jsonResponse(404, 'RUI no encontrado para exportacion controlada.');
  }

  const record = recordData as MaintenanceRecord;

  const [
    { data: assetData },
    { data: responsesData, error: responsesError },
    { data: fieldsData, error: fieldsError },
  ] = await Promise.all([
    record.asset_code
      ? supabase
          .from('activos')
          .select(
            'asset_code, asset_name, asset_type, site, area, location_detail, status, brand, model, serial_number',
          )
          .eq('asset_code', record.asset_code)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('formularios_respuestas')
      .select('campo_id, valor_texto, valor_seleccion, valor_numerico, valor_booleano')
      .eq('mantenimiento_id', record.id),
    supabase
      .from('formularios_campos')
      .select(
        'id, field_key, section_name, field_label, field_type, unit, required, evidence_required, section_order, field_order',
      )
      .order('section_order', { ascending: true })
      .order('field_order', { ascending: true }),
  ]);

  if (responsesError || fieldsError) {
    console.error('[ALERTA PDF GxP] Error consultando checklist canonico', {
      recordUuid,
      operatorEmail,
      responsesError,
      fieldsError,
    });
    return jsonResponse(500, 'No fue posible compilar el checklist canonico del RUI.');
  }

  const generatedAtUtc = new Date().toISOString();
  const ipAddress = getRequesterIp(request);
  const userAgent = request.headers.get('user-agent') ?? 'user-agent-no-disponible';
  const trackingHash = createTrackingHash({
    recordUuid,
    operatorEmail,
    roleAttribution,
    generatedAtUtc,
    purpose,
    ipAddress,
    userAgent,
  });
  const metadataSnapshot = {
    action: 'EXPORT_PDF',
    record_id: recordUuid,
    operator_identity: operatorEmail,
    role_attribution: roleAttribution,
    justification: purpose,
    purpose,
    ip_address: ipAddress,
    user_agent: userAgent,
    generated_at_utc: generatedAtUtc,
    tracking_hash: trackingHash,
    requester_profile_name: profile.full_name,
    source_table: 'public.mantenimientos_registros',
  };

  const { error: auditError } = await supabase.from('audit_trail').insert({
    entity: 'mantenimientos_registros',
    entity_uuid: recordUuid,
    accion: 'EXPORT_PDF',
    usuario: operatorEmail,
    timestamp: generatedAtUtc,
    comentarios: JSON.stringify({
      action: 'EXPORT_PDF',
      record_id: recordUuid,
      operator_identity: operatorEmail,
      role_attribution: roleAttribution,
      metadata_snapshot: metadataSnapshot,
    }),
  }).select('id').maybeSingle<AuditTrailInsertResult>();

  if (auditError) {
    console.error('[ALERTA PDF GxP] Exportacion bloqueada por fallo de audit_trail', {
      recordUuid,
      operatorEmail,
      auditError,
    });
    return jsonResponse(500, 'No fue posible registrar la pista de auditoria de exportacion.');
  }

  const fields = (fieldsData ?? []) as FormField[];
  const responses = (responsesData ?? []) as FormResponse[];
  const checklistRows = buildChecklistRows(fields, responses);
  const pdfBuffer = buildControlledCopyPdf({
    record,
    asset: assetData as AssetProfile | null,
    checklistRows,
    generatedAtUtc,
    trackingHash,
    requesterRole: roleAttribution,
  });

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="EXPEDI_RUI_${recordUuid}_CONTROLLED.pdf"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'X-PharmaOps-Tracking-Hash': trackingHash,
    },
  });
}
