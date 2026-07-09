'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  ShieldAlert,
  StepForward,
  UsersRound,
  Wrench,
} from 'lucide-react';
import {
  purgeDevelopmentDataAction,
  seedAssetsAction,
  seedInitialWorkOrderAction,
  seedRolesAction,
  type ResetWizardActionResult,
  type SeedRoleInput,
} from '@/modules/admin/actions/reset-wizard.actions';

type WizardStep = 1 | 2 | 3;

const initialRoleInput: SeedRoleInput = {
  technicianEmail: 'tecnico.hvac@pharmaops.local',
  technicianPin: '111111',
  supervisorEmail: 'supervisor.hvac@pharmaops.local',
  supervisorPin: '222222',
  qaEmail: 'qa.hvac@pharmaops.local',
  qaPin: '333333',
};

function FieldLabel({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-wide text-slate-500" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function TextInput({
  id,
  onChange,
  type = 'text',
  value,
}: {
  id: string;
  onChange: (value: string) => void;
  type?: 'email' | 'password' | 'text';
  value: string;
}) {
  return (
    <input
      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
      id={id}
      maxLength={type === 'password' ? 6 : undefined}
      onChange={(event) => onChange(event.target.value)}
      type={type}
      value={value}
    />
  );
}

function ResultPanel({ result }: { result: ResetWizardActionResult | null }) {
  if (!result) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border p-3 text-sm font-semibold ${
        result.ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-rose-200 bg-rose-50 text-rose-900'
      }`}
    >
      <div className="flex items-start gap-2">
        {result.ok ? (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p>{result.message}</p>
      </div>
    </div>
  );
}

export default function AdminMaintenanceResetPage() {
  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  const [roleInput, setRoleInput] = useState<SeedRoleInput>(initialRoleInput);
  const [lastResult, setLastResult] = useState<ResetWizardActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDevelopmentMode = process.env.NODE_ENV === 'development';
  const stepStatus = useMemo(
    () => [
      { id: 1 as const, label: 'Roles' },
      { id: 2 as const, label: 'Activos' },
      { id: 3 as const, label: 'Orden HVAC-03' },
    ],
    [],
  );

  function updateRoleField(field: keyof SeedRoleInput, value: string) {
    setRoleInput((currentInput) => ({
      ...currentInput,
      [field]: field.toLowerCase().includes('pin') ? value.replace(/\D/g, '').slice(0, 6) : value,
    }));
  }

  function executeAction(action: () => Promise<ResetWizardActionResult>) {
    startTransition(async () => {
      const result = await action();
      setLastResult(result);
    });
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <div className="w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6">
        <header className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Admin / Development Reset Wizard
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950 md:text-4xl">
              Inicialización Controlada GxP
            </h1>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-600">
              Consola de desarrollo para purga controlada y carga baseline de roles, activos y orden
              inicial HVAC-03 con parámetros nulos.
            </p>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-lg border border-rose-200 border-t-4 border-t-rose-600 bg-white p-4 shadow-sm">
            {/* COMPONENT_ID: COMP-ADM-PURGE-TRIGGER */}
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                <ShieldAlert aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
                  Truncado Cascade de Desarrollo
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  Esta acción destruye datos de cambio, firmas, parámetros, órdenes y activos para
                  reconstruir un estado baseline. Está bloqueada fuera de desarrollo por límites FDA
                  21 CFR Part 11 y ALCOA+.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-r-lg border-l-4 border-rose-500 bg-rose-50 p-3 text-xs font-semibold leading-5 text-rose-900">
              Impacto: la operación intenta ejecutar TRUNCATE CASCADE con reinicio de identidad vía
              RPC de desarrollo. Si el RPC no está instalado, se realiza una purga ordenada con
              service role y se reporta la limitación de secuencias.
            </div>

            {isDevelopmentMode ? (
              <button
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-rose-700 bg-rose-700 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={() => executeAction(purgeDevelopmentDataAction)}
                type="button"
              >
                <DatabaseZap aria-hidden="true" size={16} />
                Ejecutar Purga Cascade de Desarrollo
              </button>
            ) : (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-600">
                Acción oculta: NODE_ENV no está en development.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 border-t-4 border-t-indigo-600 bg-white p-4 shadow-sm">
            {/* SUBSECTION_ID: SUB-ADM-WIZARD-FLOW */}
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
                  Flujo Secuencial Baseline
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Ejecute los pasos en orden para inicializar un dataset limpio.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {stepStatus.map((step) => (
                  <button
                    className={`h-12 rounded-lg border px-3 font-mono text-[11px] font-black uppercase transition ${
                      activeStep === step.id
                        ? 'border-indigo-700 bg-indigo-700 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'
                    }`}
                    key={step.id}
                    onClick={() => setActiveStep(step.id)}
                    type="button"
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              {activeStep === 1 ? (
                <div>
                  {/* COMPONENT_ID: COMP-WIZARD-STEP-ROLES */}
                  <div className="mb-4 flex items-center gap-2">
                    <UsersRound aria-hidden="true" className="text-indigo-700" size={18} />
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-950">
                      Paso 1 / Usuarios y Roles
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ['technicianEmail', 'Technician Email', 'email'],
                      ['technicianPin', 'Technician PIN', 'password'],
                      ['supervisorEmail', 'Supervisor Email', 'email'],
                      ['supervisorPin', 'Supervisor PIN', 'password'],
                      ['qaEmail', 'QA Email', 'email'],
                      ['qaPin', 'QA PIN', 'password'],
                    ].map(([field, label, type]) => (
                      <div className="grid gap-2" key={field}>
                        <FieldLabel htmlFor={field}>{label}</FieldLabel>
                        <TextInput
                          id={field}
                          onChange={(value) => updateRoleField(field as keyof SeedRoleInput, value)}
                          type={type as 'email' | 'password'}
                          value={roleInput[field as keyof SeedRoleInput]}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-indigo-700 bg-indigo-700 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => executeAction(() => seedRolesAction(roleInput))}
                    type="button"
                  >
                    <StepForward aria-hidden="true" size={16} />
                    Poblar Roles Baseline
                  </button>
                </div>
              ) : null}

              {activeStep === 2 ? (
                <div>
                  {/* COMPONENT_ID: COMP-WIZARD-STEP-ASSETS */}
                  <div className="mb-4 flex items-center gap-2">
                    <Wrench aria-hidden="true" className="text-indigo-700" size={18} />
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-950">
                      Paso 2 / Catálogo de Activos
                    </h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {['HVAC-01', 'HVAC-02', 'HVAC-03'].map((assetCode) => (
                      <div
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                        key={assetCode}
                      >
                        <p className="font-mono text-sm font-black text-slate-950">{assetCode}</p>
                        <p className="mt-1 text-xs font-bold uppercase text-slate-500">
                          Operativo / APROBADO / Rev. 1
                        </p>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-indigo-700 bg-indigo-700 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => executeAction(seedAssetsAction)}
                    type="button"
                  >
                    <StepForward aria-hidden="true" size={16} />
                    Poblar Activos HVAC
                  </button>
                </div>
              ) : null}

              {activeStep === 3 ? (
                <div>
                  {/* COMPONENT_ID: COMP-WIZARD-STEP-ORDER */}
                  <div className="mb-4 flex items-center gap-2">
                    <DatabaseZap aria-hidden="true" className="text-indigo-700" size={18} />
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-950">
                      Paso 3 / Orden Inicial HVAC-03
                    </h3>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                    Se generará una RUI UUID para HVAC-03 con parámetros instrumentales NULL. El
                    tablero debe reflejar Técnico = 1 en el semáforo GxP.
                  </div>
                  <button
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-indigo-700 bg-indigo-700 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() =>
                      executeAction(() => seedInitialWorkOrderAction(roleInput.technicianEmail))
                    }
                    type="button"
                  >
                    <StepForward aria-hidden="true" size={16} />
                    Generar Orden Vacía HVAC-03
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <ResultPanel result={lastResult} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
