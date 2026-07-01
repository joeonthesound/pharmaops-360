'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  descalificarActivoRegulado,
  registrarCambioParametroCalificacion,
} from '@/modules/activos/actions/asset-profile-compliance-actions';

type ActionState = {
  tone: 'success' | 'error';
  message: string;
} | null;

type AdminQualificationCardProps = {
  activoUuid: string;
};

type SuperadminDestructiveCardProps = {
  activoUuid: string;
};

function ValidationMessage({ state }: { state: ActionState }) {
  if (!state) {
    return null;
  }

  return (
    <p
      className={`rounded-md border px-3 py-2 text-xs font-bold ${
        state.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {state.message}
    </p>
  );
}

export function AdminQualificationCard({ activoUuid }: AdminQualificationCardProps) {
  const [nuevoSetpoint, setNuevoSetpoint] = useState('');
  const [razon, setRazon] = useState('');
  const [state, setState] = useState<ActionState>(null);
  const [isPending, startTransition] = useTransition();
  const isReasonInvalid = razon.trim().length > 0 && razon.trim().length < 15;

  function handleSubmit() {
    if (razon.trim().length < 15) {
      setState({
        tone: 'error',
        message: 'Debe documentar una razón GxP de al menos 15 caracteres.',
      });
      return;
    }

    startTransition(async () => {
      const result = await registrarCambioParametroCalificacion({
        activoUuid,
        nuevoSetpoint,
        razon,
      });

      setState({
        tone: result.ok ? 'success' : 'error',
        message: result.message,
      });
    });
  }

  return (
    <section className="rounded-lg border border-[#C76E00] bg-orange-50 p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <SlidersHorizontal aria-hidden="true" className="mt-0.5 text-[#C76E00]" size={18} />
        <div>
          <h2 className="text-sm font-black text-slate-950">Perfil Admin</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">
            Cambios de parametros requieren justificacion GxP y huella de auditoria.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <input
          className="h-10 rounded-md border border-orange-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[#C76E00] focus:ring-2 focus:ring-orange-100"
          onChange={(event) => setNuevoSetpoint(event.target.value)}
          placeholder="Nuevo setpoint autorizado"
          value={nuevoSetpoint}
        />
        <textarea
          className={`min-h-20 rounded-md border bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 ${
            isReasonInvalid
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
              : 'border-orange-200 focus:border-[#C76E00] focus:ring-orange-100'
          }`}
          onChange={(event) => setRazon(event.target.value)}
          placeholder="Razon auditada del cambio de parametros"
          value={razon}
        />
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#C76E00] px-4 text-sm font-black text-white transition hover:brightness-95 disabled:bg-slate-400"
          disabled={isPending}
          onClick={handleSubmit}
          type="button"
        >
          {isPending ? 'Registrando...' : 'Modificar Parametros de Calificacion'}
        </button>
        <ValidationMessage state={state} />
      </div>
    </section>
  );
}

export function SuperadminDestructiveCard({ activoUuid }: SuperadminDestructiveCardProps) {
  const [razon, setRazon] = useState('');
  const [state, setState] = useState<ActionState>(null);
  const [isPending, startTransition] = useTransition();

  function handleDescalificar() {
    if (razon.trim().length < 15) {
      setState({
        tone: 'error',
        message: 'Debe documentar una razón GxP de al menos 15 caracteres.',
      });
      return;
    }

    startTransition(async () => {
      const result = await descalificarActivoRegulado(activoUuid, razon);

      setState({
        tone: result.ok ? 'success' : 'error',
        message: result.message,
      });
    });
  }

  return (
    <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden="true" className="mt-0.5 text-rose-700" size={18} />
        <div>
          <h2 className="text-sm font-black text-rose-950">Perfil SuperAdmin</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-rose-800">
            Accion destructiva logica. No elimina datos; descalifica el activo y preserva la pista ALCOA+.
          </p>
        </div>
      </div>
      <textarea
        className="mt-4 min-h-20 w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-950 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
        onChange={(event) => setRazon(event.target.value)}
        placeholder="Razon regulatoria de descalificacion"
        value={razon}
      />
      <button
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border-2 border-rose-700 bg-white px-4 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:border-slate-400 disabled:text-slate-400"
        disabled={isPending}
        onClick={handleDescalificar}
        type="button"
      >
        <Trash2 aria-hidden="true" size={17} />
        {isPending ? 'Descalificando...' : 'Dar de Baja del Sistema (Descalificar Activo)'}
      </button>
      <div className="mt-3">
        <ValidationMessage state={state} />
      </div>
    </section>
  );
}
