'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { ENABLE_SUPERADMIN_DEBUG_LOGS } from '@/modules/mantenimiento/debug';
import type { UsuarioRolNombre, UsuarioTipo } from './usuarios-roles.interface';

type AdminScope = 'root_superuser' | 'functional_admin';

type UsuarioAdministrador = {
  id: number;
  user_email: string;
  role: string | null;
  active: boolean | null;
  can_manage_users: boolean | null;
};

type UsuarioObjetivo = {
  id: number;
  user_email: string;
};

type SupabaseDiagnosticError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

export type UpsertUserInput = {
  id?: number;
  user_email: string;
  full_name: string;
  job_title: string;
  role: UsuarioRolNombre;
  user_type: UsuarioTipo;
  site?: string | null;
  area: string;
  active: boolean;
  can_create_assets?: boolean;
  can_execute_maintenance?: boolean;
  can_review: boolean;
  can_approve: boolean;
  can_view_audit?: boolean;
  can_access_forensic_sheet?: boolean;
  can_export_controlled_copies?: boolean;
  can_manage_users?: boolean;
  requires_2fa?: boolean;
  notes?: string | null;
};

export type UserAdminActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
  debug?: {
    stage: string;
    code?: string;
    details?: unknown;
  };
};

const ROOT_SUPERUSER_EMAILS = ['josueth.acevedo@gmail.com'];
const FUNCTIONAL_ADMIN_EMAILS = ['albis@labymed.com'];
const ROOT_GUARD_ERROR =
  'Operación no autorizada: Privilegios insuficientes sobre cuenta raíz';
const DEFAULT_SITE = 'Planta Central';

function buildSupabaseDiagnostics(error: SupabaseDiagnosticError | unknown) {
  if (!error || typeof error !== 'object') {
    return {
      code: 'unknown_error',
      message: error instanceof Error ? error.message : 'Unknown Supabase mutation error',
      details: null,
      hint: null,
    };
  }

  const supabaseError = error as SupabaseDiagnosticError;

  return {
    code: supabaseError?.code ?? 'unknown_error',
    message: supabaseError?.message ?? 'No Supabase error message returned',
    details: supabaseError?.details ?? null,
    hint: supabaseError?.hint ?? null,
  };
}

function logD10SServerException(stage: string, context: Record<string, unknown>) {
  if (!ENABLE_SUPERADMIN_DEBUG_LOGS) {
    return;
  }

  console.error('[D10S SERVER EXCEPTION] User administration dispatcher failure', {
    stage,
    ...context,
  });
}

function logD10SServerTrace(stage: string, context: Record<string, unknown>) {
  if (!ENABLE_SUPERADMIN_DEBUG_LOGS) {
    return;
  }

  console.log('[D10S SERVER TRACE] User administration dispatcher', {
    stage,
    ...context,
  });
}

function normalizeEmail(email: string) {
  return String(email ?? '').trim().toLowerCase();
}

function isRootSuperuserEmail(email: string) {
  return ROOT_SUPERUSER_EMAILS.includes(normalizeEmail(email));
}

function resolveAdminScope(profile: UsuarioAdministrador): AdminScope | null {
  const email = normalizeEmail(profile.user_email);

  if (isRootSuperuserEmail(email)) {
    return 'root_superuser';
  }

  const isFunctionalAdminEmail = FUNCTIONAL_ADMIN_EMAILS.includes(email);
  const hasFunctionalRole =
    profile.role === 'Administrador' || profile.role === 'Administrativo';

  if (profile.can_manage_users === true && (isFunctionalAdminEmail || hasFunctionalRole)) {
    return 'functional_admin';
  }

  return null;
}

function addMonthsUtc(date: Date, months: number) {
  const nextDate = new Date(date.getTime());
  nextDate.setUTCMonth(nextDate.getUTCMonth() + months);
  return nextDate;
}

function buildAuditNotes({
  actorEmail,
  action,
  role,
  timestamp,
}: {
  actorEmail: string;
  action: 'creado' | 'actualizado';
  role: UsuarioRolNombre;
  timestamp: string;
}) {
  const base = `Perfil ${action} por ${actorEmail} el ${timestamp}. Origen: API/ServerAction.`;

  if (role !== 'Temporal') {
    return base;
  }

  const expiresAt = addMonthsUtc(new Date(timestamp), 3).toISOString();
  return `${base} Expira: ${expiresAt}.`;
}

function sanitizeUpsertInput(input: UpsertUserInput) {
  return {
    id: input.id,
    user_email: normalizeEmail(input.user_email),
    full_name: String(input.full_name ?? '').trim(),
    job_title: String(input.job_title ?? '').trim(),
    role: input.role,
    user_type: input.user_type,
    site: input.site ? String(input.site).trim() : DEFAULT_SITE,
    area: String(input.area ?? '').trim(),
    active: Boolean(input.active),
    can_create_assets: Boolean(input.can_create_assets),
    can_execute_maintenance: Boolean(input.can_execute_maintenance),
    can_review: Boolean(input.can_review),
    can_approve: Boolean(input.can_approve),
    can_view_audit: Boolean(input.can_view_audit),
    can_access_forensic_sheet: Boolean(input.can_access_forensic_sheet),
    can_export_controlled_copies: Boolean(input.can_export_controlled_copies),
    can_manage_users: Boolean(input.can_manage_users),
    requires_2fa: false,
  };
}

export async function assertRootAdminAccess(): Promise<{
  actorEmail: string;
  scope: AdminScope;
}> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  const actorEmail = normalizeEmail(user?.email ?? '');

  if (sessionError || !actorEmail) {
    logD10SServerException('session_validation', {
      supabase: buildSupabaseDiagnostics(sessionError),
      actorEmailPresent: Boolean(actorEmail),
    });
    throw new Error('Acceso denegado: sesión administrativa no válida.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('usuarios_roles')
    .select('id, user_email, role, active, can_manage_users')
    .eq('user_email', actorEmail)
    .eq('active', true)
    .maybeSingle();

  if (profileError || !profile) {
    logD10SServerException('admin_profile_lookup', {
      actorEmail,
      supabase: buildSupabaseDiagnostics(profileError),
      profileFound: Boolean(profile),
    });
    throw new Error('Acceso denegado: usuario sin perfil administrativo activo.');
  }

  const scope = resolveAdminScope(profile as UsuarioAdministrador);

  if (!scope) {
    logD10SServerException('admin_scope_validation', {
      actorEmail,
      profileRole: (profile as UsuarioAdministrador).role,
      canManageUsers: (profile as UsuarioAdministrador).can_manage_users,
    });
    throw new Error('Acceso denegado: privilegios insuficientes para administrar usuarios.');
  }

  return { actorEmail, scope };
}

export async function upsertUserAction(
  input: UpsertUserInput,
): Promise<UserAdminActionResult> {
  try {
    console.error('[CRITICAL DEBUG BYPASS] upsertUserAction try block entered');
    console.log(
      '[CRITICAL DEBUG BYPASS] Raw input arriving at server action:',
      JSON.stringify(input, null, 2),
    );

    const actor = await assertRootAdminAccess();
    const payload = sanitizeUpsertInput(input);
    const timestampUtc = new Date().toISOString();

    console.log(
      '🚨 [CRITICAL DEBUG BYPASS] Raw payload arriving at server action:',
      JSON.stringify(payload, null, 2),
    );

    logD10SServerTrace('payload_sanitized', {
      mode: payload.id ? 'update' : 'insert',
      actorEmail: actor.actorEmail,
      targetEmail: payload.user_email,
      role: payload.role,
      area: payload.area,
      jobTitle: payload.job_title,
      permissionSnapshot: {
        active: payload.active,
        can_create_assets: payload.can_create_assets,
        can_execute_maintenance: payload.can_execute_maintenance,
        can_review: payload.can_review,
        can_approve: payload.can_approve,
        can_view_audit: payload.can_view_audit,
        can_access_forensic_sheet: payload.can_access_forensic_sheet,
        can_export_controlled_copies: payload.can_export_controlled_copies,
        can_manage_users: payload.can_manage_users,
      },
    });

    if (!payload.user_email || !payload.full_name || !payload.job_title || !payload.area) {
      logD10SServerException('input_validation', {
        code: 'missing_required_fields',
        targetEmail: payload.user_email,
        hasFullName: Boolean(payload.full_name),
        hasJobTitle: Boolean(payload.job_title),
        hasArea: Boolean(payload.area),
      });

      return {
        ok: false,
        error: 'Campos obligatorios incompletos para administrar usuario.',
        debug: {
          stage: 'input_validation',
          code: 'missing_required_fields',
        },
      };
    }

    if (isRootSuperuserEmail(payload.user_email) && actor.scope !== 'root_superuser') {
      logD10SServerException('sod_root_guard', {
        code: 'functional_admin_blocked',
        actorEmail: actor.actorEmail,
        targetEmail: payload.user_email,
      });

      return {
        ok: false,
        error: ROOT_GUARD_ERROR,
        debug: {
          stage: 'sod_root_guard',
          code: 'functional_admin_blocked',
          details: { actorEmail: actor.actorEmail, targetEmail: payload.user_email },
        },
      };
    }

    const supabase = await createSupabaseServerClient();

    if (payload.id) {
      const { data: targetUser, error: targetError } = await supabase
        .from('usuarios_roles')
        .select('id, user_email')
        .eq('id', payload.id)
        .maybeSingle();

      if (targetError || !targetUser) {
        logD10SServerException('target_lookup', {
          targetUserId: payload.id,
          supabase: buildSupabaseDiagnostics(targetError),
          targetFound: Boolean(targetUser),
        });

        return {
          ok: false,
          error: 'No fue posible localizar el usuario objetivo.',
          debug: {
            stage: 'target_lookup',
            code: targetError?.code,
          },
        };
      }

      const target = targetUser as UsuarioObjetivo;

      if (isRootSuperuserEmail(target.user_email) && actor.scope !== 'root_superuser') {
        logD10SServerException('sod_root_guard', {
          code: 'functional_admin_blocked',
          actorEmail: actor.actorEmail,
          targetEmail: target.user_email,
        });

        return {
          ok: false,
          error: ROOT_GUARD_ERROR,
          debug: {
            stage: 'sod_root_guard',
            code: 'functional_admin_blocked',
            details: { actorEmail: actor.actorEmail, targetEmail: target.user_email },
          },
        };
      }

      const { error } = await supabase
        .from('usuarios_roles')
        .update({
          user_email: payload.user_email,
          full_name: payload.full_name,
          job_title: payload.job_title,
          role: payload.role,
          user_type: payload.user_type,
          site: payload.site,
          area: payload.area,
          active: payload.active,
          can_create_assets: payload.can_create_assets,
          can_execute_maintenance: payload.can_execute_maintenance,
          can_review: payload.can_review,
          can_approve: payload.can_approve,
          can_view_audit: payload.can_view_audit,
          can_access_forensic_sheet: payload.can_access_forensic_sheet,
          can_export_controlled_copies: payload.can_export_controlled_copies,
          can_manage_users: payload.can_manage_users,
          requires_2fa: payload.requires_2fa,
          notes: buildAuditNotes({
            actorEmail: actor.actorEmail,
            action: 'actualizado',
            role: payload.role,
            timestamp: timestampUtc,
          }),
        })
        .eq('id', payload.id);

      if (error) {
        const diagnostics = buildSupabaseDiagnostics(error);

        console.error('💥 [RAW SUPABASE ERROR CODE]:', error.code);
        console.error('💥 [RAW SUPABASE ERROR MESSAGE]:', error.message);
        console.error('💥 [RAW SUPABASE ERROR DETAILS]:', error.details);
        console.error('💥 [RAW SUPABASE ERROR HINT]:', error.hint);

        logD10SServerException('user_update', {
          action: 'usuarios_roles.update',
          targetUserId: payload.id,
          targetEmail: payload.user_email,
          supabase: diagnostics,
          rlsOrConstraintDetails: diagnostics.details,
        });

        return {
          ok: false,
          error: 'No fue posible actualizar el usuario.',
          debug: {
            stage: 'user_update',
            code: diagnostics.code,
            details: diagnostics,
          },
        };
      }
    } else {
      const { error } = await supabase.from('usuarios_roles').insert({
        user_email: payload.user_email,
        full_name: payload.full_name,
        job_title: payload.job_title,
        role: payload.role,
        user_type: payload.user_type,
        site: payload.site,
        area: payload.area,
        active: payload.active,
        can_create_assets: payload.can_create_assets,
        can_execute_maintenance: payload.can_execute_maintenance,
        can_review: payload.can_review,
        can_approve: payload.can_approve,
        can_view_audit: payload.can_view_audit,
        can_access_forensic_sheet: payload.can_access_forensic_sheet,
        can_export_controlled_copies: payload.can_export_controlled_copies,
        can_manage_users: payload.can_manage_users,
        requires_2fa: payload.requires_2fa,
        notes: buildAuditNotes({
          actorEmail: actor.actorEmail,
          action: 'creado',
          role: payload.role,
          timestamp: timestampUtc,
        }),
      });

      if (error) {
        const diagnostics = buildSupabaseDiagnostics(error);

        console.error('💥 [RAW SUPABASE ERROR CODE]:', error.code);
        console.error('💥 [RAW SUPABASE ERROR MESSAGE]:', error.message);
        console.error('💥 [RAW SUPABASE ERROR DETAILS]:', error.details);
        console.error('💥 [RAW SUPABASE ERROR HINT]:', error.hint);

        logD10SServerException('user_insert', {
          action: 'usuarios_roles.insert',
          targetEmail: payload.user_email,
          role: payload.role,
          area: payload.area,
          jobTitle: payload.job_title,
          supabase: diagnostics,
          rlsOrConstraintDetails: diagnostics.details,
        });

        return {
          ok: false,
          error: 'No fue posible crear el usuario.',
          debug: {
            stage: 'user_insert',
            code: diagnostics.code,
            details: diagnostics,
          },
        };
      }
    }

    revalidatePath('/admin/usuarios');

    return {
      ok: true,
      message: payload.id
        ? 'Usuario actualizado con huella de auditoría.'
        : 'Usuario creado con huella de auditoría.',
    };
  } catch (error) {
    console.error('[CRITICAL DEBUG BYPASS] upsertUserAction catch block entered');
    console.error(
      '[CRITICAL DEBUG BYPASS] Raw caught exception:',
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    );

    logD10SServerException('controlled_exception', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error inesperado en administracion.',
      debug: {
        stage: 'controlled_exception',
      },
    };
  }
}

export async function toggleUserStatusAction(
  targetUserId: number,
  activeStatus: boolean,
): Promise<UserAdminActionResult> {
  try {
    const actor = await assertRootAdminAccess();

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return {
        ok: false,
        error: 'Identificador de usuario invalido.',
        debug: {
          stage: 'input_validation',
          code: 'invalid_target_user_id',
        },
      };
    }

    const supabase = await createSupabaseServerClient();

    const { data: targetUser, error: targetError } = await supabase
      .from('usuarios_roles')
      .select('id, user_email')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetError || !targetUser) {
      return {
        ok: false,
        error: 'No fue posible localizar el usuario objetivo.',
        debug: {
          stage: 'target_lookup',
          code: targetError?.code,
        },
      };
    }

    const target = targetUser as UsuarioObjetivo;

    if (isRootSuperuserEmail(target.user_email)) {
      return {
        ok: false,
        error: 'Operación bloqueada: la cuenta raíz no puede ser desactivada.',
        debug: {
          stage: 'sod_root_status_guard',
          code: 'root_deactivation_blocked',
          details: { actorEmail: actor.actorEmail, targetEmail: target.user_email },
        },
      };
    }

    const timestampUtc = new Date().toISOString();
    const { error } = await supabase
      .from('usuarios_roles')
      .update({
        active: Boolean(activeStatus),
        notes: `Estado lógico actualizado por ${actor.actorEmail} el ${timestampUtc}. Origen: API/ServerAction.`,
      })
      .eq('id', targetUserId);

    if (error) {
      return {
        ok: false,
        error: 'No fue posible actualizar el estado del usuario.',
        debug: {
          stage: 'logical_status_update',
          code: error.code,
          details: error.message,
        },
      };
    }

    revalidatePath('/admin/usuarios');

    return {
      ok: true,
      message: activeStatus
        ? 'Usuario reactivado mediante actualizacion logica.'
        : 'Usuario desactivado mediante actualizacion logica.',
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error inesperado en administracion.',
      debug: {
        stage: 'controlled_exception',
      },
    };
  }
}
