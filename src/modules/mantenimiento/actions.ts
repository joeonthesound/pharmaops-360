'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

export type MaintenanceSigningRole = 'supervisor' | 'quality';
export type MaintenanceSigningAction = 'approve' | 'reject';

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

type MaintenanceRecordStatus =
  | 'draft'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'approved'
  | 'rejected';

type UsuarioRolPermisos = {
  user_email: string | null;
  active: boolean | null;
  role: string | null;
  can_review: boolean | null;
  can_approve: boolean | null;
};

type ClientSignatureMetadata = {
  deviceTimestamp: string;
  clientIp: string;
  userAgent: string;
};

type MantenimientoRegistroFirma = {
  uuid: string;
  status: MaintenanceRecordStatus | string | null;
};

type AuditInsertResult = {
  ok: boolean;
  table?: 'mantenimiento_firmas' | 'audit_trail';
  error?: unknown;
};

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
    normalizedStatus === 'pending_supervisor' ||
    normalizedStatus === 'pendiente_supervisor' ||
    normalizedStatus === 'pending_quality' ||
    normalizedStatus === 'pendiente_calidad' ||
    normalizedStatus === 'approved' ||
    normalizedStatus === 'aprobado' ||
    normalizedStatus === 'rejected' ||
    normalizedStatus === 'rechazado'
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

    if (normalizedStatus === 'aprobado') {
      return 'approved';
    }

    if (normalizedStatus === 'rechazado') {
      return 'rejected';
    }

    return normalizedStatus as MaintenanceRecordStatus;
  }

  return null;
}

function isStrictPendingSupervisorStatus(status: MantenimientoRegistroFirma['status']) {
  return String(status ?? '').trim() === 'PENDING_SUPERVISOR';
}

function isAdministrativeConsultationRole(role: string | null | undefined) {
  return String(role ?? '').trim().toLowerCase() === 'administrativo';
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

function canSignCurrentStep(
  signingRole: MaintenanceSigningRole,
  status: MaintenanceRecordStatus | string | null,
) {
  const normalizedStatus = normalizeMaintenanceRecordStatus(status);

  if (signingRole === 'supervisor') {
    return normalizedStatus === 'pending_supervisor';
  }

  return normalizedStatus === 'pending_quality';
}

function resolveApprovedStatus(signingRole: MaintenanceSigningRole): MaintenanceRecordStatus {
  return signingRole === 'supervisor' ? 'pending_quality' : 'approved';
}

function canReviewAsSupervisorOrHigher(permisos: UsuarioRolPermisos) {
  const normalizedRole = String(permisos.role ?? '').trim().toLowerCase();

  return (
    permisos.can_review === true ||
    [
      'supervisor',
      'calidad',
      'administrador',
      'superadmin',
      'propietario / gerencia',
      'gerente general',
    ].includes(normalizedRole)
  );
}

function buildSignaturePatch(
  signingRole: MaintenanceSigningRole,
  action: MaintenanceSigningAction,
  signerEmail: string,
  signedAtUtc: string,
  rejectionComments: string,
) {
  const nextStatus =
    action === 'reject' ? 'rejected' : resolveApprovedStatus(signingRole);

  const signaturePatch =
    signingRole === 'supervisor'
      ? {
          supervisor_signed_by: signerEmail,
          supervisor_signed_at: signedAtUtc,
        }
      : {
          quality_signed_by: signerEmail,
          quality_signed_at: signedAtUtc,
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

  if (signingRole !== 'supervisor' && signingRole !== 'quality') {
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
    .select('user_email, active, role, can_review, can_approve')
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

  if (signingRole === 'quality' && permisos.can_approve !== true) {
    return {
      ok: false,
      message: 'Usuario sin permiso can_approve para firma de Calidad.',
      debug: {
        stage: 'rbac_validation',
        code: 'missing_can_approve',
        details: { signerEmail, role: permisos.role },
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

  if (maintenanceRecord.status === 'approved' || maintenanceRecord.status === 'rejected') {
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

  if (
    signingRole === 'supervisor' &&
    isStrictPendingSupervisorStatus(maintenanceRecord.status) &&
    isAdministrativeConsultationRole(permisos.role)
  ) {
    return {
      ok: false,
      message: 'Perfil Administrativo autorizado solo para consulta en supervision operativa.',
      debug: {
        stage: 'rbac_validation',
        code: 'administrative_read_only_profile',
        details: { signerEmail, role: permisos.role },
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
