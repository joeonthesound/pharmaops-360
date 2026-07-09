'use client';

import { type FormEvent, type ReactNode, use, useState } from 'react';
import { Gauge, KeyRound, Send, ShieldCheck, UserRound } from 'lucide-react';

type TechnicalExecutionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type TechnicalExecutionState = {
  technicianName: string;
  corporateEmail: string;
  ambientTemperature: string;
  differentialPressure: string;
  relativeHumidity: string;
  technicalComments: string;
  signaturePin: string;
};

const initialState: TechnicalExecutionState = {
  technicianName: '',
  corporateEmail: '',
  ambientTemperature: '',
  differentialPressure: '',
  relativeHumidity: '',
  technicalComments: '',
  signaturePin: '',
};

function FieldLabel({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label
      className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500"
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

function TextInput({
  autoComplete,
  id,
  inputMode,
  maxLength,
  onChange,
  pattern,
  placeholder,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  id: string;
  inputMode?: 'decimal' | 'email' | 'numeric' | 'text';
  maxLength?: number;
  onChange: (value: string) => void;
  pattern?: string;
  placeholder?: string;
  type?: 'email' | 'number' | 'password' | 'text';
  value: string;
}) {
  return (
    <input
      autoComplete={autoComplete}
      className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
      id={id}
      inputMode={inputMode}
      maxLength={maxLength}
      onChange={(event) => onChange(event.target.value)}
      pattern={pattern}
      placeholder={placeholder}
      type={type}
      value={value}
    />
  );
}

function BlockTitle({
  children,
  icon,
}: {
  children: string;
  icon: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
        {icon}
      </span>
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
        {children}
      </h2>
    </div>
  );
}

export default function HvacTechnicalExecutionPage({ params }: TechnicalExecutionPageProps) {
  const { id: rui } = use(params);
  const [values, setValues] = useState<TechnicalExecutionState>(initialState);

  function updateField<Key extends keyof TechnicalExecutionState>(
    field: Key,
    value: TechnicalExecutionState[Key],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function handlePinChange(value: string) {
    updateField('signaturePin', value.replace(/\D/g, '').slice(0, 6));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    console.group('[GxP TECHNICAL UPLOAD ADUANA — SUBMITTING EXECUTION DATA]');
    console.log('RUI:', rui);
    console.log('FORM_ID:', 'FOR-MNT-HVAC-TECH');
    console.log('SCREEN_ID:', 'SCREEN-MNT-TECH-01');
    console.log('payload:', {
      rui,
      technicianName: values.technicianName,
      corporateEmail: values.corporateEmail,
      ambientTemperature: values.ambientTemperature,
      differentialPressure: values.differentialPressure,
      relativeHumidity: values.relativeHumidity,
      technicalComments: values.technicalComments,
      signaturePinLength: values.signaturePin.length,
      submittedAtUtc: new Date().toISOString(),
    });
    console.groupEnd();
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <div className="w-full max-w-[98vw] mx-auto px-4 lg:px-6 py-6">
        <header className="mb-6 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-wide text-slate-500">
              RUI: {rui}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950 md:text-4xl">
              Ejecución Técnica HVAC
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Registro de lecturas instrumentales y firma técnica de campo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <span className="rounded border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[11px] font-black uppercase tracking-wide text-slate-700">
              FORM_ID: FOR-MNT-HVAC-TECH
            </span>
            <span className="rounded border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[11px] font-black uppercase tracking-wide text-slate-700">
              SCREEN_ID: SCREEN-MNT-TECH-01
            </span>
          </div>
        </header>

        {/* SUBSECTION_ID: SUB-TECH-FORM-CONTAINER */}
        <form className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr_0.9fr]" onSubmit={handleSubmit}>
          <section className="rounded-lg border border-slate-200 border-t-4 border-t-slate-500 bg-white p-4 shadow-sm">
            {/* COMPONENT_ID: COMP-TECH-METADATA-BLOCK */}
            <BlockTitle icon={<UserRound aria-hidden="true" size={18} />}>
              Identificación del Personal
            </BlockTitle>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <FieldLabel htmlFor="technicianName">Technician Name</FieldLabel>
                <TextInput
                  autoComplete="name"
                  id="technicianName"
                  onChange={(value) => updateField('technicianName', value)}
                  placeholder="Nombre del técnico ejecutor"
                  value={values.technicianName}
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="corporateEmail">Corporate Email</FieldLabel>
                <TextInput
                  autoComplete="email"
                  id="corporateEmail"
                  inputMode="email"
                  onChange={(value) => updateField('corporateEmail', value)}
                  placeholder="operador@pharmaops.local"
                  type="email"
                  value={values.corporateEmail}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 border-t-4 border-t-indigo-600 bg-white p-4 shadow-sm">
            {/* COMPONENT_ID: COMP-TECH-PARAMETERS-BLOCK */}
            <BlockTitle icon={<Gauge aria-hidden="true" size={18} />}>
              Parámetros Instrumentales
            </BlockTitle>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <FieldLabel htmlFor="ambientTemperature">Temperatura Ambiente (°C)</FieldLabel>
                <TextInput
                  id="ambientTemperature"
                  inputMode="decimal"
                  onChange={(value) => updateField('ambientTemperature', value)}
                  placeholder="22.5"
                  type="number"
                  value={values.ambientTemperature}
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="differentialPressure">Presión Diferencial (Pa)</FieldLabel>
                <TextInput
                  id="differentialPressure"
                  inputMode="decimal"
                  onChange={(value) => updateField('differentialPressure', value)}
                  placeholder="15"
                  type="number"
                  value={values.differentialPressure}
                />
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="relativeHumidity">Humedad Relativa (% RH)</FieldLabel>
                <TextInput
                  id="relativeHumidity"
                  inputMode="decimal"
                  onChange={(value) => updateField('relativeHumidity', value)}
                  placeholder="45"
                  type="number"
                  value={values.relativeHumidity}
                />
              </div>
              <div className="grid gap-2 md:col-span-3">
                <FieldLabel htmlFor="technicalComments">Technical Comments/Findings</FieldLabel>
                <textarea
                  className="min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                  id="technicalComments"
                  onChange={(event) => updateField('technicalComments', event.target.value)}
                  placeholder="Hallazgos técnicos, observaciones de campo o desviaciones detectadas."
                  value={values.technicalComments}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 border-t-4 border-t-emerald-600 bg-white p-4 shadow-sm">
            {/* COMPONENT_ID: COMP-TECH-SIGNATURE-BLOCK */}
            <BlockTitle icon={<KeyRound aria-hidden="true" size={18} />}>
              Firma Electrónica
            </BlockTitle>
            <div className="grid gap-4">
              <div className="rounded-r-lg border-l-4 border-amber-500 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
                FDA 21 CFR Part 11 / ALCOA+: La firma electrónica vincula estas lecturas al
                operador autenticado y al RUI de la orden. Toda alteración posterior debe quedar
                registrada en el Audit Trail validado del sistema.
              </div>
              <div className="grid gap-2">
                <FieldLabel htmlFor="signaturePin">Signature PIN</FieldLabel>
                <TextInput
                  autoComplete="one-time-code"
                  id="signaturePin"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={handlePinChange}
                  pattern="[0-9]{6}"
                  placeholder="••••••"
                  type="password"
                  value={values.signaturePin}
                />
              </div>
              {/* COMPONENT_ID: COMP-TECH-ACTION-TARGET */}
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-emerald-800"
                type="submit"
              >
                <Send aria-hidden="true" size={16} />
                Registrar Ejecución Técnica
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
