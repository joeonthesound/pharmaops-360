'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  signMaintenanceRecordAction,
  type MaintenanceSigningAction,
  type MaintenanceSigningRole,
} from '@/modules/mantenimiento/actions';

type MaintenanceStatus =
  | 'draft'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'pending_management'
  | 'approved'
  | 'rejected';

type ApprovalActionsPanelProps = {
  canApprove: boolean;
  canManage: boolean;
  canReview: boolean;
  recordUuid: string;
  status: MaintenanceStatus;
  userRole: string;
};

type PendingIntent = {
  signingRole: MaintenanceSigningRole;
  action: MaintenanceSigningAction;
} | null;

function resolveActiveBlock(status: MaintenanceStatus) {
  if (status === 'pending_supervisor') {
    return {
      title: 'Firma Electronica - Supervisor',
      signingRole: 'supervisor' as const,
      approveLabel: 'Aprobar',
      confirmApproveLabel: 'Confirmar aprobacion',
      showRejectAction: true,
      permissionLabel: 'can_review',
    };
  }

  if (status === 'pending_quality') {
    return {
      title: 'Firma Electronica - Aseguramiento de la Calidad',
      signingRole: 'quality' as const,
      approveLabel: 'Liberar',
      confirmApproveLabel: 'Confirmar liberacion',
      showRejectAction: true,
      permissionLabel: 'can_approve',
    };
  }

  if (status === 'pending_management') {
    return {
      title: 'Cierre de Gerencia - Emision RUI',
      signingRole: 'management' as const,
      approveLabel: 'Aprobar Cierre',
      confirmApproveLabel: 'Confirmar cierre de Gerencia',
      rejectLabel: 'Rechazar a Tecnico',
      confirmRejectLabel: 'Confirmar rechazo a Tecnico',
      showRejectAction: true,
      permissionLabel: 'can_manage_users o rol Administrativo/Gerencia',
    };
  }

  return null;
}

function normalizeRoleValue(role: string) {
  return role
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function isManagementRole(role: string) {
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

export function ApprovalActionsPanel({
  canApprove,
  canManage,
  canReview,
  recordUuid,
  status,
  userRole,
}: ApprovalActionsPanelProps) {
  const router = useRouter();
  const [pendingIntent, setPendingIntent] = useState<PendingIntent>(null);
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeBlock = useMemo(() => resolveActiveBlock(status), [status]);
  const canSignManagement =
    isManagementRole(userRole) || (canApprove === true && canReview === true);

  const hasPermission =
    activeBlock?.signingRole === 'supervisor'
      ? canReview
      : activeBlock?.signingRole === 'quality'
        ? canApprove
        : activeBlock?.signingRole === 'management'
          ? canManage || canSignManagement
          : false;

  function submitSignature(intent: PendingIntent) {
    if (!intent) {
      return;
    }

    const validationComments = comments.trim();

    if (validationComments.length < 10) {
      setErrorMessage('Los comentarios de validacion GxP requieren al menos 10 caracteres.');
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await signMaintenanceRecordAction({
        recordUuid,
        signingRole: intent.signingRole,
        action: intent.action,
        validationComments,
        rejectionComments: intent.action === 'reject' ? validationComments : undefined,
        clientMetadata: {
          deviceTimestamp: new Date().toISOString(),
          clientIp: 'client-ip-pending-server-capture',
          userAgent: navigator.userAgent,
        },
      });

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      router.push('/dashboard?approval=success');
    });
  }

  if (status === 'draft') {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold tracking-normal">Acciones de firma</h2>
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-100 p-3 text-sm font-medium text-slate-700">
          Registro en fase de ejecucion. El tecnico debe enviarlo a revision para habilitar las
          firmas electronicas.
        </div>
      </section>
    );
  }

  if (!activeBlock) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold tracking-normal">Acciones de firma</h2>
        <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
          Esta orden se encuentra en estado terminal y no admite nuevas firmas.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold tracking-normal">{activeBlock.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Usuario en sesion: <span className="font-semibold">{userRole}</span>
        </p>
      </div>

      {!hasPermission ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          El usuario no posee el permiso {activeBlock.permissionLabel} requerido para este paso.
        </div>
      ) : null}

      {hasPermission ? (
      <div className="mt-4 grid gap-3">
        <button
          className="h-12 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 active:bg-emerald-900 disabled:bg-slate-300"
          disabled={isPending}
          onClick={() => {
            setPendingIntent({
              signingRole: activeBlock.signingRole,
              action: 'approve',
            });
            setComments('');
            setErrorMessage(null);
          }}
          type="button"
        >
          {isPending
            ? 'Procesando...'
            : activeBlock.signingRole === 'management'
              ? activeBlock.approveLabel
              : `${activeBlock.approveLabel} firma electronica`}
        </button>

        {activeBlock.showRejectAction ? (
          <button
            className="h-12 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 active:bg-red-900 disabled:bg-slate-300"
            disabled={isPending}
            onClick={() => {
              setPendingIntent({
                signingRole: activeBlock.signingRole,
                action: 'reject',
              });
              setErrorMessage(null);
            }}
            type="button"
          >
            {activeBlock.rejectLabel ?? 'Rechazar'}
          </button>
        ) : null}

        {pendingIntent ? (
          <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <label className="text-sm font-semibold text-slate-900" htmlFor="signature-comments">
              Comentarios de validacion GxP
            </label>
            <textarea
              className="min-h-28 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-950 outline-none transition focus:border-slate-600 focus:ring-2 focus:ring-slate-100"
              id="signature-comments"
              onChange={(event) => setComments(event.target.value)}
              placeholder="Describa la base tecnica y regulatoria de la decision."
              value={comments}
            />
            <button
              className={
                pendingIntent.action === 'approve'
                  ? 'h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 active:bg-emerald-900 disabled:bg-slate-300'
                  : 'h-11 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 active:bg-red-900 disabled:bg-slate-300'
              }
              disabled={isPending || comments.trim().length < 10}
              onClick={() => submitSignature(pendingIntent)}
              type="button"
            >
              {isPending
                ? 'Procesando...'
                : pendingIntent.action === 'approve'
                  ? activeBlock.confirmApproveLabel
                  : activeBlock.confirmRejectLabel ?? 'Confirmar rechazo'}
            </button>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
            {errorMessage}
          </div>
        ) : null}
      </div>
      ) : null}
    </section>
  );
}
