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
  | 'approved'
  | 'rejected';

type ApprovalActionsPanelProps = {
  canApprove: boolean;
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
      permissionLabel: 'can_review',
    };
  }

  if (status === 'pending_quality') {
    return {
      title: 'Firma Electronica - Aseguramiento de la Calidad',
      signingRole: 'quality' as const,
      approveLabel: 'Liberar',
      permissionLabel: 'can_approve',
    };
  }

  return null;
}

export function ApprovalActionsPanel({
  canApprove,
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

  const hasPermission =
    activeBlock?.signingRole === 'supervisor'
      ? canReview
      : activeBlock?.signingRole === 'quality'
        ? canApprove
        : false;

  function submitSignature(intent: PendingIntent) {
    if (!intent) {
      return;
    }

    if (intent.action === 'reject' && !comments.trim()) {
      setErrorMessage('El rechazo requiere observaciones obligatorias.');
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await signMaintenanceRecordAction({
        recordUuid,
        signingRole: intent.signingRole,
        action: intent.action,
        rejectionComments: intent.action === 'reject' ? comments : undefined,
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
          onClick={() =>
            submitSignature({
              signingRole: activeBlock.signingRole,
              action: 'approve',
            })
          }
          type="button"
        >
          {isPending ? 'Procesando...' : `${activeBlock.approveLabel} firma electronica`}
        </button>

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
          Rechazar
        </button>

        {pendingIntent?.action === 'reject' ? (
          <div className="grid gap-3 rounded-md border border-red-200 bg-red-50 p-3">
            <label className="text-sm font-semibold text-red-900" htmlFor="rejection-comments">
              Comentarios obligatorios de rechazo
            </label>
            <textarea
              className="min-h-28 rounded-md border border-red-200 bg-white p-3 text-sm text-slate-950 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100"
              id="rejection-comments"
              onChange={(event) => setComments(event.target.value)}
              placeholder="Describa la causa tecnica o documental del rechazo."
              value={comments}
            />
            <button
              className="h-11 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 active:bg-red-900 disabled:bg-slate-300"
              disabled={isPending}
              onClick={() => submitSignature(pendingIntent)}
              type="button"
            >
              {isPending ? 'Procesando rechazo...' : 'Confirmar rechazo'}
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
