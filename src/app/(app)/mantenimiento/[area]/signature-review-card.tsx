'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { X } from 'lucide-react';
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

type SignatureIntent = MaintenanceSigningAction | null;

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
  const [signatureIntent, setSignatureIntent] = useState<SignatureIntent>(null);
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeStep = isActiveStep(status, signingRole);
  const isModalOpen = signatureIntent !== null;
  const canSubmit = comments.trim().length >= 10 && !isPending;
  const reviewLabel = signingRole === 'supervisor' ? 'Supervisor' : 'Calidad';
  const isAdministrativeConsultation =
    signingRole === 'supervisor' && currentUserRole.trim().toLowerCase() === 'administrativo';

  function openSignatureModal(action: MaintenanceSigningAction) {
    setSignatureIntent(action);
    setComments('');
    setErrorMessage(null);
  }

  function closeSignatureModal() {
    if (isPending) {
      return;
    }

    setSignatureIntent(null);
    setComments('');
    setErrorMessage(null);
  }

  function submitAction() {
    if (!signatureIntent) {
      return;
    }

    const validationComments = comments.trim();

    if (validationComments.length < 10) {
      setErrorMessage('Los comentarios de validacion GxP requieren al menos 10 caracteres.');
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const clientMetadata = {
        deviceTimestamp: new Date().toISOString(),
        clientIp: 'client-ip-pending-server-capture',
        userAgent: navigator.userAgent,
      };

      const result = await signMaintenanceRecordAction({
        recordUuid,
        signingRole,
        action: signatureIntent,
        validationComments,
        rejectionComments: signatureIntent === 'reject' ? validationComments : undefined,
        clientMetadata,
      });

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setSignatureIntent(null);
      setComments('');
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
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-300"
              disabled={isPending}
              onClick={() => openSignatureModal('approve')}
              type="button"
            >
              Aprobar Inspección
            </button>
            <button
              className="h-11 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:border-slate-200 disabled:text-slate-300"
              disabled={isPending}
              onClick={() => openSignatureModal('reject')}
              type="button"
            >
              Rechazar con Desvío
            </button>
          </div>
          {errorMessage ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
              {errorMessage}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeStep && !canSign && isAdministrativeConsultation ? (
        <div className="print:hidden mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Modo Consulta: Registro retenido en fase de Supervisión Operativa.
        </div>
      ) : null}

      {isModalOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 print:hidden"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Firma Electronica Regulada
                </p>
                <h2 className="mt-1 text-lg font-black text-slate-950">
                  {signatureIntent === 'approve'
                    ? `Aprobar inspeccion - ${reviewLabel}`
                    : `Rechazar con desvio - ${reviewLabel}`}
                </h2>
              </div>
              <button
                aria-label="Cerrar modal de firma"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                onClick={closeSignatureModal}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <label
              className="mt-5 block text-sm font-bold text-slate-900"
              htmlFor={`${signingRole}-validation-comments`}
            >
              Comentarios de Validación GxP
            </label>
            <textarea
              className="mt-2 min-h-32 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-950 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-100"
              id={`${signingRole}-validation-comments`}
              onChange={(event) => {
                setComments(event.target.value);
                setErrorMessage(null);
              }}
              placeholder="Documente la base tecnica y regulatoria de esta decision."
              value={comments}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
              <span>Minimo requerido: 10 caracteres</span>
              <span>{comments.trim().length}/10</span>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
              <p>Device timestamp: se capturara al confirmar.</p>
              <p>Client IP: client-ip-pending-server-capture</p>
              <p className="truncate">User-agent: navegador del operador en sesion.</p>
            </div>

            {errorMessage ? (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:text-slate-300"
                disabled={isPending}
                onClick={closeSignatureModal}
                type="button"
              >
                Cancelar
              </button>
              <button
                className={
                  signatureIntent === 'approve'
                    ? 'h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-300'
                    : 'h-11 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:bg-slate-300'
                }
                disabled={!canSubmit}
                onClick={submitAction}
                type="button"
              >
                {isPending
                  ? 'Procesando...'
                  : signatureIntent === 'approve'
                    ? 'Confirmar aprobación'
                    : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
