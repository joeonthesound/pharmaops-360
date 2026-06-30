'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  signMaintenanceRecordAction,
  type MaintenanceSigningRole,
} from '@/modules/mantenimiento/actions';

type MaintenanceStatus =
  | 'draft'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'approved'
  | 'rejected';

type SignatureReviewCardProps = {
  canSign: boolean;
  currentUserRole: string;
  recordUuid: string;
  rejectionComments: string | null;
  reviewerTitle: string;
  signedAt: string | null;
  signedBy: string | null;
  signingRole: MaintenanceSigningRole;
  status: MaintenanceStatus;
};

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

function isActiveStep(status: MaintenanceStatus, signingRole: MaintenanceSigningRole) {
  return (
    (signingRole === 'supervisor' && status === 'pending_supervisor') ||
    (signingRole === 'quality' && status === 'pending_quality')
  );
}

export function SignatureReviewCard({
  canSign,
  currentUserRole,
  recordUuid,
  rejectionComments,
  reviewerTitle,
  signedAt,
  signedBy,
  signingRole,
  status,
}: SignatureReviewCardProps) {
  const router = useRouter();
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeStep = isActiveStep(status, signingRole);

  function submitAction(action: 'approve' | 'reject') {
    if (action === 'reject' && !comments.trim()) {
      setErrorMessage('El rechazo requiere comentarios obligatorios.');
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await signMaintenanceRecordAction({
        recordUuid,
        signingRole,
        action,
        rejectionComments: action === 'reject' ? comments : undefined,
      });

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">{reviewerTitle}</p>
      <div className="mt-3 grid gap-2 text-sm text-slate-700">
        <div>
          <span className="font-semibold text-slate-900">Estado: </span>
          {signedAt ? 'Firmado' : activeStep ? 'Pendiente de revision' : 'En espera'}
        </div>
        <div>
          <span className="font-semibold text-slate-900">Firmante: </span>
          {signedBy ?? 'Pendiente de revision'}
        </div>
        <div>
          <span className="font-semibold text-slate-900">Fecha UTC: </span>
          {formatDateTimeUtc(signedAt)}
        </div>
      </div>

      {status === 'rejected' && rejectionComments ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">
          {rejectionComments}
        </div>
      ) : null}

      {activeStep && canSign ? (
        <div className="print:hidden mt-4 grid gap-3">
          <p className="text-sm text-slate-600">
            Usuario en sesion: <span className="font-semibold">{currentUserRole}</span>
          </p>
          <textarea
            className="min-h-28 rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-950 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            onChange={(event) => setComments(event.target.value)}
            placeholder="Comentarios de revision o motivo de rechazo."
            value={comments}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-300"
              disabled={isPending}
              onClick={() => submitAction('approve')}
              type="button"
            >
              {isPending ? 'Procesando...' : 'Aprobar Revision'}
            </button>
            <button
              className="h-11 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:bg-slate-300"
              disabled={isPending}
              onClick={() => submitAction('reject')}
              type="button"
            >
              {isPending ? 'Procesando...' : 'Rechazar'}
            </button>
          </div>
          {errorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              {errorMessage}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
