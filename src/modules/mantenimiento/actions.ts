'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

const ENABLE_SUPERADMIN_DEBUG_LOGS = false;

export type MaintenanceSigningRole = 'supervisor' | 'quality' | 'management';
export type MaintenanceSigningAction = 'approve' | 'reject';
export type DirectedRejectionReturnStage = 'DRAFT' | 'PENDING_SUPERVISOR' | 'PENDING_QUALITY';

export type SignMaintenanceRecordInput = {
  recordUuid: string;
  signingRole: MaintenanceSigningRole;
  action: MaintenanceSigningAction;
  validationComments?: string;
  rejectionComments?: string;
  clientMetadata?: {
    deviceTimestamp: string;
    clientIp: string;
    userAgent: string;
    activePath?: string;
  };
};

export type SignMaintenanceRecordResult = {
  ok: boolean;
  message: string;
  recordUuid?: string;
  nextStatus?: MaintenanceRecordStatus;
  debug?: {
    stage: string;
    code?: string;
    details?: unknown;
  };
};

export type DirectedRejectionInput = {
  recordUuid: string;
  returnStage: DirectedRejectionReturnStage;
  returnStageLabel: string;
  deviationDescription: string;
  clientMetadata?: {
    deviceTimestamp: string;
    clientIp: string;
    userAgent: string;
    activePath?: string;
  };
};

type MaintenanceRecordStatus =
  | 'draft'
  | 'pending_technician'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'pending_management'
  | 'approved'
  | 'rejected'
  | 'DRAFT'
  | 'PENDING_TECHNICIAN'
  | 'PENDING_SUPERVISOR'
  | 'PENDING_QUALITY'
  | 'PENDING_MANAGEMENT'
  | 'APPROVED'
  | 'REJECTED';

type UsuarioRolPermisos = {
  user_email: string | null;
  active: boolean | null;
  role: string | null;
  can_review: boolean | null;
  can_approve: boolean | null;
  can_manage_users?: boolean | null;
};

type ClientSignatureMetadata = {
  deviceTimestamp: string;
  clientIp: string;
  userAgent: string;
  activePath?: string;
};

type MantenimientoRegistroFirma = {
  uuid: string;
  status: MaintenanceRecordStatus | string | null;
  notes?: string | null;
};

type DirectedRejectionResult = {
  ok: boolean;
  message: string;
  nextStatus?: DirectedRejectionReturnStage;
  debug?: {
    stage: string;
    code?: string;
    details?: unknown;
  };
};

type AuditInsertResult = {
  ok: boolean;
  table?: 'mantenimiento_firmas' | 'audit_trail';
  error?: unknown;
};

type SupabaseMutationError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeInput(input: SignMaintenanceRecordInput) {
  return {
    recordUuid: String(input.recordUuid ?? '').trim(),
    signingRole: input.signingRole,
    action: input.action,
    validationComments: String(input.validationComments ?? '').trim(),
    rejectionComments: String(input.rejectionComments ?? '').trim(),
    clientMetadata: {
      deviceTimestamp: String(input.clientMetadata?.deviceTimestamp ?? '').trim(),
      clientIp: String(input.clientMetadata?.clientIp ?? 'client-ip-pending-server-capture').trim(),
      userAgent: String(input.clientMetadata?.userAgent ?? '').trim(),
      activePath: String(input.clientMetadata?.activePath ?? '').trim() || undefined,
    },
  };
}

function isValidMaintenanceStatus(
  status: MantenimientoRegistroFirma['status'],
): status is MaintenanceRecordStatus {
  return normalizeMaintenanceRecordStatus(status) !== null;
}

function normalizeMaintenanceRecordStatus(
  status: MantenimientoRegistroFirma['status'],
): MaintenanceRecordStatus | null {
  const normalizedStatus = String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

  if (
    normalizedStatus === 'draft' ||
    normalizedStatus === 'borrador' ||
    normalizedStatus === 'pending_technician' ||
    normalizedStatus === 'pendiente_tecnico' ||
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

    if (normalizedStatus === 'pendiente_tecnico') {
      return 'pending_technician';
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

    return normalizedStatus as MaintenanceRecordStatus;
  }

  return null;
}

function isStrictPendingSupervisorStatus(status: MantenimientoRegistroFirma['status']) {
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

function normalizeRoleValue(role: string | null | undefined) {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function isQualityAssuranceRole(role: string | null | undefined) {
  const normalizedRole = normalizeRoleValue(role);

  return [
    'calidad',
    'qa',
    'quality',
    'quality assurance',
    'aseguramiento de calidad',
    'aseguramiento de la calidad',
    'auditor',
  ].includes(normalizedRole);
}

function hasApproveCapability(canApprove: UsuarioRolPermisos['can_approve']) {
  return canApprove === true || String(canApprove).trim().toLowerCase() === 'true';
}

function canApproveAsQuality(permisos: UsuarioRolPermisos) {
  const normalizedRole = normalizeRoleValue(permisos.role);
  const isQA =
    normalizedRole === 'administrativo' ||
    normalizedRole === 'calidad' ||
    normalizedRole === 'quality' ||
    isQualityAssuranceRole(permisos.role) ||
    hasApproveCapability(permisos.can_approve);

  return isQA;
}

function isManagementSignatureRole(role: string | null | undefined) {
  const normalizedRole = normalizeRoleValue(role);

  return [
    'administrador',
    'administrativo',
    'gerencia',
    'propietario / gerencia',
    'propietario/gerencia',
    'propietario gerencia',
    'gerente general',
    'superadmin',
  ].includes(normalizedRole);
}

function canSignAsManagement(permisos: UsuarioRolPermisos, signerEmail: string) {
  return (
    permisos.can_manage_users === true ||
    isManagementSignatureRole(permisos.role) ||
    signerEmail === 'josueth.acevedo@gmail.com'
  );
}

function isAdministrativeAuthorityProfile(permisos: Pick<UsuarioRolPermisos, 'role'>) {
  return normalizeRoleValue(permisos.role) === 'administrativo';
}

function logCriticalSupabaseMutationError(
  error: SupabaseMutationError | unknown,
  context: Record<string, unknown>,
) {
  if (!error || typeof error !== 'object') {
    return;
  }

  const supabaseError = error as SupabaseMutationError;

  console.error('🚨 [ERROR CRITICO MUTACION SUPABASE P360]', {
    ...context,
    code: supabaseError?.code,
    message: supabaseError?.message,
    details: supabaseError?.details,
    hint: supabaseError?.hint,
  });
}

function normalizeDirectedRejectionReturnStage(
  returnStage: DirectedRejectionReturnStage | string | null | undefined,
): DirectedRejectionReturnStage {
  const normalizedStage = String(returnStage ?? '').trim().toUpperCase();

  if (normalizedStage === 'PENDING_TECHNICIAN') {
    return 'DRAFT';
  }

  return normalizedStage as DirectedRejectionReturnStage;
}

function sanitizeDirectedRejectionInput(input: DirectedRejectionInput) {
  return {
    recordUuid: String(input.recordUuid ?? '').trim(),
    returnStage: normalizeDirectedRejectionReturnStage(input.returnStage),
    returnStageLabel: String(input.returnStageLabel ?? '').trim(),
    deviationDescription: String(input.deviationDescription ?? '').trim(),
    clientMetadata: {
      deviceTimestamp: String(input.clientMetadata?.deviceTimestamp ?? '').trim(),
      clientIp: String(input.clientMetadata?.clientIp ?? 'client-ip-pending-server-capture').trim(),
      userAgent: String(input.clientMetadata?.userAgent ?? '').trim(),
      activePath: String(input.clientMetadata?.activePath ?? '').trim() || undefined,
    },
  };
}

function revalidateActiveMaintenancePath(activePath: string | undefined) {
  if (activePath?.startsWith('/mantenimiento/')) {
    revalidatePath(activePath);
  }
}

function resolveAllowedReturnStages(
  status: MaintenanceRecordStatus | string | null,
): DirectedRejectionReturnStage[] {
  const normalizedStatus = normalizeMaintenanceRecordStatus(status);

  if (normalizedStatus === 'pending_technician') {
    return ['DRAFT'];
  }

  if (normalizedStatus === 'pending_supervisor') {
    return ['DRAFT'];
  }

  if (normalizedStatus === 'pending_quality') {
    return ['PENDING_SUPERVISOR', 'DRAFT'];
  }

  if (normalizedStatus === 'pending_management') {
    return ['PENDING_QUALITY', 'PENDING_SUPERVISOR', 'DRAFT'];
  }

  return [];
}

function canSignCurrentStep(
  signingRole: MaintenanceSigningRole,
  status: MaintenanceRecordStatus | string | null,
) {
  const normalizedStatus = normalizeMaintenanceRecordStatus(status);

  if (signingRole === 'supervisor') {
    return normalizedStatus === 'pending_supervisor';
  }

  if (signingRole === 'quality') {
    return normalizedStatus === 'pending_quality';
  }

  return normalizedStatus === 'pending_management';
}

function resolveApprovedStatus(signingRole: MaintenanceSigningRole): MaintenanceRecordStatus {
  if (signingRole === 'supervisor') {
    return 'PENDING_QUALITY';
  }

  return 'PENDING_MANAGEMENT';
}

function canReviewAsSupervisorOrHigher(permisos: UsuarioRolPermisos) {
  const normalizedRole = normalizeRoleValue(permisos.role);

  if (normalizedRole === 'administrativo') {
    return true;
  }

  return (
    permisos.can_review === true ||
    [
      'supervisor',
      'administrativo',
      'calidad',
      'administrador',
      'superadmin',
      'propietario / gerencia',
      'gerente general',
    ].includes(normalizedRole)
  );
}

function appendRejectionAuditTrailToNotes({
  existingNotes,
  auditTrailReasonText,
  operatorEmail,
  operatorRole,
  selectedStage,
  selectedStageLabel,
  previousStatus,
  timestamp,
  clientMetadata,
}: {
  existingNotes: string | null | undefined;
  auditTrailReasonText: string;
  operatorEmail: string;
  operatorRole: string | null;
  selectedStage: DirectedRejectionReturnStage;
  selectedStageLabel: string;
  previousStatus: MantenimientoRegistroFirma['status'];
  timestamp: string;
  clientMetadata: ClientSignatureMetadata;
}) {
  const fallbackNotes = { raw_notes: existingNotes };
  let parsedNotes: Record<string, unknown> = {};

  if (existingNotes) {
    try {
      const parsed = JSON.parse(existingNotes) as unknown;
      parsedNotes = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : fallbackNotes;
    } catch {
      parsedNotes = fallbackNotes;
    }
  }

  const previousTrail = Array.isArray(parsedNotes.rejection_audit_trail)
    ? parsedNotes.rejection_audit_trail
    : [];

  return JSON.stringify({
    ...parsedNotes,
    rejection_audit_trail: [
      ...previousTrail,
      {
        action: 'REJECT_WITH_DEVIATION',
        audit_trail_reason: auditTrailReasonText,
        operator_email: operatorEmail,
        operator_role: operatorRole,
        previous_status: previousStatus,
        target_return_stage: selectedStage,
        target_return_stage_label: selectedStageLabel,
        timestamp,
        environment_metadata: clientMetadata,
      },
    ],
  });
}

function buildSignaturePatch(
  signingRole: MaintenanceSigningRole,
  action: MaintenanceSigningAction,
  signerEmail: string,
  signedAtUtc: string,
  rejectionComments: string,
) {
  const nextStatus =
    action === 'reject' ? 'REJECTED' : resolveApprovedStatus(signingRole);

  const signaturePatch =
    signingRole === 'supervisor'
      ? {
          supervisor_signed_by: signerEmail,
          supervisor_signed_at: signedAtUtc,
        }
      : signingRole === 'quality'
        ? {
            quality_signed_by: signerEmail,
            quality_signed_at: signedAtUtc,
          }
        : {
            management_signed_by: signerEmail,
            management_signed_at: signedAtUtc,
          };

  return {
    ...signaturePatch,
    status: nextStatus,
    rejection_comments: action === 'reject' ? rejectionComments : null,
  };
}

async function insertSignatureAuditEvent({
  supabase,
  recordUuid,
  action,
  signerEmail,
  signedAtUtc,
  validationComments,
  rejectionComments,
  clientMetadata,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  recordUuid: string;
  action: MaintenanceSigningAction;
  signerEmail: string;
  signedAtUtc: string;
  validationComments: string;
  rejectionComments: string;
  clientMetadata: ClientSignatureMetadata;
}): Promise<AuditInsertResult> {
  const accion = action.toUpperCase();
  const comentarios = JSON.stringify({
    validation_comments: validationComments,
    rejection_comments: action === 'reject' ? rejectionComments : null,
    environment_metadata: clientMetadata,
  });

  const { error: firmasError } = await supabase.from('mantenimiento_firmas').insert({
    mantenimiento_uuid: recordUuid,
    accion,
    usuario: signerEmail,
    timestamp: signedAtUtc,
    comentarios,
  });

  if (!firmasError) {
    return {
      ok: true,
      table: 'mantenimiento_firmas',
    };
  }

  const { error: auditTrailError } = await supabase.from('audit_trail').insert({
    entity: 'mantenimientos_registros',
    entity_uuid: recordUuid,
    accion,
    usuario: signerEmail,
    timestamp: signedAtUtc,
    comentarios,
  });

  if (!auditTrailError) {
    return {
      ok: true,
      table: 'audit_trail',
    };
  }

  return {
    ok: false,
    error: {
      mantenimiento_firmas: firmasError,
      audit_trail: auditTrailError,
    },
  };
}

export async function signMaintenanceRecordAction(
  input: SignMaintenanceRecordInput,
): Promise<SignMaintenanceRecordResult> {
  await cookies();

  const { recordUuid, signingRole, action, validationComments, rejectionComments, clientMetadata } =
    sanitizeInput(input);

  if (!UUID_PATTERN.test(recordUuid)) {
    return {
      ok: false,
      message: 'UUID de registro de mantenimiento invalido.',
      debug: {
        stage: 'input_validation',
        code: 'invalid_record_uuid',
      },
    };
  }

  if (signingRole !== 'supervisor' && signingRole !== 'quality' && signingRole !== 'management') {
    return {
      ok: false,
      message: 'Rol de firma no permitido.',
      debug: {
        stage: 'input_validation',
        code: 'invalid_signing_role',
      },
    };
  }

  if (action !== 'approve' && action !== 'reject') {
    return {
      ok: false,
      message: 'Accion de firma no permitida.',
      debug: {
        stage: 'input_validation',
        code: 'invalid_action',
      },
    };
  }

  if (validationComments.length < 10) {
    return {
      ok: false,
      message: 'Los comentarios de validacion GxP requieren al menos 10 caracteres.',
      debug: {
        stage: 'input_validation',
        code: 'missing_validation_comments',
      },
    };
  }

  if (action === 'reject' && !rejectionComments) {
    return {
      ok: false,
      message: 'El rechazo requiere observaciones obligatorias.',
      debug: {
        stage: 'input_validation',
        code: 'missing_rejection_comments',
      },
    };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  const signerEmail = user?.email?.trim().toLowerCase();

  if (sessionError || !signerEmail) {
    console.error('[ALERTA AUDITORIA GxP] Firma bloqueada por sesion invalida', {
      recordUuid,
      signingRole,
      action,
      error: sessionError,
    });

    return {
      ok: false,
      message: 'Sesion invalida o expirada. Inicie sesion nuevamente.',
      debug: {
        stage: 'session_validation',
        code: sessionError?.code,
      },
    };
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios_roles')
    .select('user_email, active, role, can_review, can_approve, can_manage_users')
    .eq('user_email', signerEmail)
    .eq('active', true)
    .maybeSingle();

  if (usuarioError || !usuario) {
    console.error('[ALERTA AUDITORIA GxP] Firma bloqueada por usuario sin rol activo', {
      recordUuid,
      signerEmail,
      signingRole,
      action,
      error: usuarioError,
    });

    return {
      ok: false,
      message: 'Usuario sin rol activo autorizado para firma electronica.',
      debug: {
        stage: 'rbac_lookup',
        code: usuarioError?.code,
      },
    };
  }

  const permisos = usuario as UsuarioRolPermisos;
  const userProfile = permisos;
  const userMetadata = user?.user_metadata as { role?: string | null } | null;

  if (ENABLE_SUPERADMIN_DEBUG_LOGS && userProfile?.role?.toLowerCase() === 'administrativo') {
    const auditTrailReasonText = action === 'reject' ? rejectionComments : validationComments;

    console.log('[MUTACION ESCRITURA DIAGNOSTICO P360]', {
      action: action === 'reject' ? 'REJECT_SIGNATURE' : 'APPROVE_SIGNATURE',
      recordUuid,
      operatorEmail: userProfile.user_email ?? signerEmail,
      operatorRole: userProfile.role,
      signingRole,
      hasAuditTrailReason: !!auditTrailReasonText,
      payloadCommentsLength: auditTrailReasonText?.length || 0,
      targetReturnStage: action === 'reject' ? 'REJECTED' : resolveApprovedStatus(signingRole),
    });
  }

  console.log('[DEBUG QA SECURITY GUARD]', {
    userEmail: user?.email,
    detectedRole: userMetadata?.role || permisos.role,
    profileRole: permisos.role,
    normalizedProfileRole: normalizeRoleValue(permisos.role),
    canApproveFlag: permisos.can_approve,
    isQA: canApproveAsQuality(permisos),
    signingRole,
  });

  if (signingRole === 'supervisor' && !canReviewAsSupervisorOrHigher(permisos)) {
    return {
      ok: false,
      message: 'Usuario sin perfil Supervisor o superior para firma electronica.',
      debug: {
        stage: 'rbac_validation',
        code: 'missing_supervisor_or_higher_profile',
        details: { signerEmail, role: permisos.role },
      },
    };
  }

  if (signingRole === 'quality' && !canApproveAsQuality(permisos)) {
    return {
      ok: false,
      message: 'Falta rol de aseguramiento de calidad o permisos.',
      debug: {
        stage: 'rbac_validation',
        code: 'missing_quality_assurance_role_or_can_approve',
        details: {
          signerEmail,
          role: permisos.role,
          normalizedRole: normalizeRoleValue(permisos.role),
          canApprove: permisos.can_approve,
        },
      },
    };
  }

  if (signingRole === 'management' && !canSignAsManagement(permisos, signerEmail)) {
    return {
      ok: false,
      message: 'Usuario sin perfil de Gerencia o Administracion para cierre del RUI.',
      debug: {
        stage: 'rbac_validation',
        code: 'missing_management_signature_profile',
        details: {
          signerEmail,
          role: permisos.role,
          normalizedRole: normalizeRoleValue(permisos.role),
          canManageUsers: permisos.can_manage_users,
        },
      },
    };
  }

  const { data: record, error: recordError } = await supabase
    .from('mantenimientos_registros')
    .select('uuid, status')
    .eq('uuid', recordUuid)
    .maybeSingle();

  if (recordError || !record) {
    return {
      ok: false,
      message: 'No fue posible localizar la orden de mantenimiento.',
      debug: {
        stage: 'record_lookup',
        code: recordError?.code,
      },
    };
  }

  const maintenanceRecord = record as MantenimientoRegistroFirma;

  if (!isValidMaintenanceStatus(maintenanceRecord.status)) {
    return {
      ok: false,
      message: 'La orden tiene un estado no homologado para firma electronica.',
      debug: {
        stage: 'status_validation',
        code: 'invalid_record_status',
        details: { status: maintenanceRecord.status },
      },
    };
  }

  const normalizedMaintenanceStatus = normalizeMaintenanceRecordStatus(maintenanceRecord.status);

  if (normalizedMaintenanceStatus === 'approved' || normalizedMaintenanceStatus === 'rejected') {
    return {
      ok: false,
      message: 'La orden ya se encuentra cerrada y no admite nuevas firmas.',
      debug: {
        stage: 'status_validation',
        code: 'terminal_status',
        details: { status: maintenanceRecord.status },
      },
    };
  }

  if (!canSignCurrentStep(signingRole, maintenanceRecord.status)) {
    return {
      ok: false,
      message: 'La firma solicitada no corresponde al estado actual de la orden.',
      debug: {
        stage: 'workflow_validation',
        code: 'invalid_step_for_role',
        details: {
          signingRole,
          currentStatus: maintenanceRecord.status,
        },
      },
    };
  }

  const signedAtUtc = new Date().toISOString();
  const updatePayload = buildSignaturePatch(
    signingRole,
    action,
    signerEmail,
    signedAtUtc,
    rejectionComments,
  );

  const auditResult = await insertSignatureAuditEvent({
    supabase,
    recordUuid,
    action,
    signerEmail,
    signedAtUtc,
    validationComments,
    rejectionComments,
    clientMetadata,
  });

  if (!auditResult.ok) {
    logCriticalSupabaseMutationError(auditResult.error, {
      action: 'SIGNATURE_AUDIT_INSERT',
      recordUuid,
      signerEmail,
      signingRole,
      signingAction: action,
    });

    console.error('[ALERTA AUDITORIA GxP] Firma bloqueada por fallo de audit trail', {
      recordUuid,
      signerEmail,
      signingRole,
      action,
      auditError: auditResult.error,
    });

    return {
      ok: false,
      message: 'No fue posible registrar el evento de firma en la pista de auditoria.',
      debug: {
        stage: 'audit_trail_insert',
        code: 'audit_insert_failed',
        details: auditResult.error,
      },
    };
  }

  const { data: updatedRecord, error: updateError } = await supabase
    .from('mantenimientos_registros')
    .update(updatePayload)
    .eq('uuid', recordUuid)
    .eq('status', maintenanceRecord.status)
    .select('uuid, status')
    .single();

  if (updateError || !updatedRecord) {
    logCriticalSupabaseMutationError(updateError, {
      action: 'SIGNATURE_UPDATE',
      recordUuid,
      signerEmail,
      signingRole,
      signingAction: action,
      attemptedStatus: updatePayload.status,
    });

    console.error('[ALERTA AUDITORIA GxP] Error al estampar firma electronica', {
      recordUuid,
      signerEmail,
      signingRole,
      action,
      updateError,
    });

    return {
      ok: false,
      message: 'No fue posible estampar la firma electronica.',
      debug: {
        stage: 'signature_update',
        code: updateError?.code,
      },
    };
  }

  const signedRecord = updatedRecord as MantenimientoRegistroFirma;
  const nextStatus = isValidMaintenanceStatus(signedRecord.status)
    ? signedRecord.status
    : updatePayload.status;

  revalidatePath(`/mantenimiento/${recordUuid}/aprobar`);
  revalidatePath(`/mantenimiento/hvac/rui/enviado/${recordUuid}`);
  revalidatePath(`/mantenimiento/hvac/rui/ht/${recordUuid}`);
  revalidateActiveMaintenancePath(clientMetadata.activePath);
  revalidatePath('/mantenimiento/hvac/page');
  revalidatePath('/mantenimiento/hvac');
  revalidatePath(`/mantenimiento/hvac/rui/ht`);
  revalidatePath('/dashboard');

  return {
    ok: true,
    message:
      action === 'reject'
        ? 'Orden rechazada con trazabilidad GxP.'
        : 'Firma electronica aplicada correctamente.',
    recordUuid,
    nextStatus,
  };
}

export async function rejectMaintenanceWithDeviationAction(
  input: DirectedRejectionInput,
): Promise<DirectedRejectionResult> {
  await cookies();

  const { recordUuid, returnStage, returnStageLabel, deviationDescription, clientMetadata } =
    sanitizeDirectedRejectionInput(input);

  if (!UUID_PATTERN.test(recordUuid)) {
    return {
      ok: false,
      message: 'UUID de registro de mantenimiento invalido.',
      debug: {
        stage: 'input_validation',
        code: 'invalid_record_uuid',
      },
    };
  }

  if (!['DRAFT', 'PENDING_SUPERVISOR', 'PENDING_QUALITY'].includes(returnStage)) {
    return {
      ok: false,
      message: 'Etapa de retorno no permitida para este flujo.',
      debug: {
        stage: 'input_validation',
        code: 'invalid_return_stage',
      },
    };
  }

  if (!returnStageLabel) {
    return {
      ok: false,
      message: 'La etiqueta de destino del rechazo es obligatoria.',
      debug: {
        stage: 'input_validation',
        code: 'missing_return_stage_label',
      },
    };
  }

  if (deviationDescription.length < 15) {
    return {
      ok: false,
      message: 'La descripcion del desvio requiere al menos 15 caracteres.',
      debug: {
        stage: 'input_validation',
        code: 'missing_deviation_description',
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();
  const supervisorEmail = user?.email?.trim().toLowerCase() ?? null;

  if (sessionError || !user?.id || !supervisorEmail) {
    return {
      ok: false,
      message: 'Sesion invalida o expirada. Inicie sesion nuevamente.',
      debug: {
        stage: 'session_validation',
        code: sessionError?.code,
      },
    };
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios_roles')
    .select('user_email, active, role, can_review, can_approve, can_manage_users')
    .eq('user_email', supervisorEmail)
    .eq('active', true)
    .maybeSingle();

  if (usuarioError || !usuario) {
    return {
      ok: false,
      message: 'Usuario sin rol activo autorizado para rechazo con desvio.',
      debug: {
        stage: 'rbac_lookup',
        code: usuarioError?.code,
      },
    };
  }

  const permisos = usuario as UsuarioRolPermisos;
  const userProfile = permisos;
  const isAdministrativeAuthority = isAdministrativeAuthorityProfile(userProfile);
  const auditTrailReasonText = deviationDescription;
  const selectedStage = returnStage;
  const operatorEmail = userProfile.user_email ?? supervisorEmail;

  if (ENABLE_SUPERADMIN_DEBUG_LOGS && userProfile?.role?.toLowerCase() === 'administrativo') {
    console.log('[MUTACION ESCRITURA DIAGNOSTICO P360]', {
      action: 'REJECT_WITH_DEVIATION',
      recordUuid,
      operatorEmail,
      operatorRole: userProfile.role,
      hasAuditTrailReason: !!auditTrailReasonText,
      payloadCommentsLength: auditTrailReasonText?.length || 0,
      targetReturnStage: selectedStage,
    });
  }

  if (!isAdministrativeAuthority && !canReviewAsSupervisorOrHigher(permisos)) {
    return {
      ok: false,
      message: 'Usuario sin perfil Supervisor o superior para rechazo con desvio.',
      debug: {
        stage: 'rbac_validation',
        code: 'missing_supervisor_or_higher_profile',
        details: { supervisorEmail, role: permisos.role },
      },
    };
  }

  const { data: record, error: recordError } = await supabase
    .from('mantenimientos_registros')
    .select('uuid, status, notes')
    .eq('uuid', recordUuid)
    .maybeSingle();

  if (recordError || !record) {
    return {
      ok: false,
      message: 'No fue posible localizar la orden de mantenimiento.',
      debug: {
        stage: 'record_lookup',
        code: recordError?.code,
      },
    };
  }

  const maintenanceRecord = record as MantenimientoRegistroFirma;
  const normalizedStatus = normalizeMaintenanceRecordStatus(maintenanceRecord.status);

  const allowedReturnStages = resolveAllowedReturnStages(maintenanceRecord.status);

  if (!allowedReturnStages.includes(returnStage)) {
    return {
      ok: false,
      message: 'La etapa seleccionada no es previa al estado actual del documento.',
      debug: {
        stage: 'workflow_validation',
        code: 'invalid_return_stage_for_current_status',
        details: {
          currentStatus: maintenanceRecord.status,
          normalizedStatus,
          returnStage,
          allowedReturnStages,
        },
      },
    };
  }

  const timestamp = new Date().toISOString();
  const updatePayload = {
    status: returnStage,
    rejection_comments: deviationDescription,
    notes: appendRejectionAuditTrailToNotes({
      existingNotes: maintenanceRecord.notes,
      auditTrailReasonText,
      operatorEmail: supervisorEmail,
      operatorRole: permisos.role,
      selectedStage,
      selectedStageLabel: returnStageLabel,
      previousStatus: maintenanceRecord.status,
      timestamp,
      clientMetadata,
    }),
    supervisor_signed_by: supervisorEmail,
    supervisor_signed_at: timestamp,
  };

  const { error: updateError } = await supabase
    .from('mantenimientos_registros')
    .update(updatePayload)
    .eq('uuid', recordUuid)
    .eq('status', maintenanceRecord.status);

  if (updateError) {
    logCriticalSupabaseMutationError(updateError, {
      action: 'REJECT_WITH_DEVIATION_UPDATE',
      recordUuid,
      operatorEmail,
      previousStatus: maintenanceRecord.status,
      attemptedStatus: updatePayload.status,
      selectedStage,
    });

    return {
      ok: false,
      message: 'No fue posible retornar el registro al flujo tecnico.',
      debug: {
        stage: 'mantenimientos_registros_update',
        code: updateError.code,
        details: updateError,
      },
    };
  }

  const auditPayload = {
    entity: 'mantenimientos_registros',
    entity_uuid: recordUuid,
    usuario: operatorEmail,
    accion: 'REJECT_WITH_DEVIATION',
    timestamp,
    comentarios: JSON.stringify({
      validation_comments: null,
      rejection_comments: auditTrailReasonText,
      environment_metadata: {
        ...clientMetadata,
        previous_status: maintenanceRecord.status,
        next_status: returnStage,
        return_stage: returnStage,
        return_stage_label: returnStageLabel,
        operator_role: permisos.role,
        operator_user_id: user.id,
      },
    }),
  };

  const { error: auditError } = await supabase
    .from('audit_trail')
    .insert(auditPayload);

  if (auditError) {
    logCriticalSupabaseMutationError(auditError, {
      action: 'REJECT_WITH_DEVIATION_AUDIT_INSERT',
      recordUuid,
      operatorEmail,
      previousStatus: maintenanceRecord.status,
      attemptedStatus: updatePayload.status,
      selectedStage,
    });

    const { error: rollbackError } = await supabase
      .from('mantenimientos_registros')
      .update({
        status: maintenanceRecord.status,
        rejection_comments: null,
        notes: maintenanceRecord.notes ?? null,
        supervisor_signed_by: null,
        supervisor_signed_at: null,
      })
      .eq('uuid', recordUuid);

    if (rollbackError) {
      logCriticalSupabaseMutationError(rollbackError, {
        action: 'REJECT_WITH_DEVIATION_ROLLBACK',
        recordUuid,
        operatorEmail,
        rollbackStatus: maintenanceRecord.status,
      });
    }

    return {
      ok: false,
      message: 'No fue posible registrar la pista de auditoria. La mutacion fue revertida.',
      debug: {
        stage: 'audit_trail_insert',
        code: auditError.code,
        details: auditError,
      },
    };
  }

  revalidatePath(`/mantenimiento/${recordUuid}`);
  revalidatePath(`/mantenimiento/${recordUuid}/aprobar`);
  revalidatePath(`/mantenimiento/hvac/rui/enviado/${recordUuid}`);
  revalidatePath(`/mantenimiento/hvac/rui/ht/${recordUuid}`);
  revalidateActiveMaintenancePath(clientMetadata.activePath);
  revalidatePath('/mantenimiento/hvac');
  revalidatePath('/dashboard');

  return {
    ok: true,
    message: 'Registro retornado con desvio auditado.',
    nextStatus: returnStage,
  };
}
