'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Save, ShieldCheck } from 'lucide-react';
import {
  saveAssetManagementForm,
  type AssetManagementAction,
  type AssetManagementAssetInput,
} from '@/modules/activos/actions/save-asset-management-form';

type FormState = AssetManagementAssetInput;

const initialFormState: FormState = {
  uuid: '',
  asset_code: '',
  asset_name: '',
  asset_type: 'Sistemas HVAC',
  site: '',
  area: '',
  location_detail: '',
  brand: '',
  model: '',
  serial_number: '',
  capacity: '',
  capacity_unit: 'TR',
  installation_date: '',
  status: 'Operativo',
  maintenance_frequency: 'Mensual',
  last_maintenance_date: '',
  next_maintenance_date: '',
  internal_responsible: '',
  technical_provider: '',
  qr_possible: true,
  notes: '',
};

function normalizeAction(value: string | null): AssetManagementAction {
  if (value === 'edit' || value === 'delete') {
    return value;
  }

  return 'create';
}

function Field({
  label,
  name,
  onChange,
  required = false,
  type = 'text',
  value,
}: {
  label: string;
  name: keyof FormState;
  onChange: (name: keyof FormState, value: string) => void;
  required?: boolean;
  type?: string;
  value: string | null | undefined;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
        type={type}
        value={value ?? ''}
      />
    </label>
  );
}

export default function AssetManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = normalizeAction(searchParams.get('action'));
  const targetUuid = searchParams.get('uuid') ?? '';
  const [values, setValues] = useState<FormState>({
    ...initialFormState,
    uuid: targetUuid,
  });
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    status: 'success' | 'error';
    text: string;
  } | null>(null);
  const isJustificationInvalid = justification.trim().length > 0 && justification.trim().length < 15;
  const actionLabel = useMemo(() => {
    if (action === 'edit') {
      return 'Modificar activo';
    }

    if (action === 'delete') {
      return 'Dar de baja activo';
    }

    return 'Crear activo';
  }, [action]);

  function updateValue(name: keyof FormState, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResultMessage(null);

    if (justification.trim().length < 15) {
      setResultMessage({
        status: 'error',
        text: 'La JUSTIFICACIÓN DE MODIFICACIÓN debe contener al menos 15 caracteres.',
      });
      return;
    }

    setIsSubmitting(true);

    const result = await saveAssetManagementForm({
      action,
      targetUuid: targetUuid || values.uuid || null,
      justification,
      asset: {
        ...values,
        uuid: values.uuid || targetUuid || null,
        qr_possible: Boolean(values.qr_possible),
      },
    });

    setIsSubmitting(false);

    if (result.ok) {
      setResultMessage({
        status: 'success',
        text: result.message,
      });
      router.push('/activos/hvac');
      router.refresh();
      return;
    }

    setResultMessage({
      status: 'error',
      text: result.message,
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <form className="mx-auto grid w-full max-w-5xl gap-5" onSubmit={handleSubmit}>
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              PharmaOps 360 / Activos / Gestión
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-normal">
              Formulario Universal de Gestión de Activos
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {actionLabel} con control GxP, justificación obligatoria y auditoría Part 11.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
            <ShieldCheck aria-hidden="true" size={16} />
            Superadmin
          </span>
        </header>

        {resultMessage ? (
          <div
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-bold ${
              resultMessage.status === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {resultMessage.status === 'success' ? (
              <CheckCircle2 aria-hidden="true" size={18} />
            ) : (
              <AlertTriangle aria-hidden="true" size={18} />
            )}
            {resultMessage.text}
          </div>
        ) : null}

        <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-950">Identificación del activo</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="UUID objetivo" name="uuid" onChange={updateValue} value={values.uuid} />
            <Field
              label="Código de activo"
              name="asset_code"
              onChange={updateValue}
              required={action !== 'delete'}
              value={values.asset_code}
            />
            <Field
              label="Nombre de equipo"
              name="asset_name"
              onChange={updateValue}
              required={action !== 'delete'}
              value={values.asset_name}
            />
            <Field label="Tipo" name="asset_type" onChange={updateValue} value={values.asset_type} />
            <Field label="Área" name="area" onChange={updateValue} value={values.area} />
            <Field
              label="Ubicación detallada"
              name="location_detail"
              onChange={updateValue}
              value={values.location_detail}
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-950">Datos técnicos</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Marca" name="brand" onChange={updateValue} value={values.brand} />
            <Field label="Modelo" name="model" onChange={updateValue} value={values.model} />
            <Field
              label="Número de serie"
              name="serial_number"
              onChange={updateValue}
              value={values.serial_number}
            />
            <Field label="Capacidad" name="capacity" onChange={updateValue} value={values.capacity} />
            <Field
              label="Unidad capacidad"
              name="capacity_unit"
              onChange={updateValue}
              value={values.capacity_unit}
            />
            <Field label="Estado" name="status" onChange={updateValue} value={values.status} />
            <Field
              label="Frecuencia mantenimiento"
              name="maintenance_frequency"
              onChange={updateValue}
              value={values.maintenance_frequency}
            />
            <Field
              label="Fecha instalación"
              name="installation_date"
              onChange={updateValue}
              type="date"
              value={values.installation_date}
            />
            <Field
              label="Próximo mantenimiento"
              name="next_maintenance_date"
              onChange={updateValue}
              type="date"
              value={values.next_maintenance_date}
            />
            <Field
              label="Responsable interno"
              name="internal_responsible"
              onChange={updateValue}
              value={values.internal_responsible}
            />
            <Field
              label="Proveedor técnico"
              name="technical_provider"
              onChange={updateValue}
              value={values.technical_provider}
            />
            <Field label="Sitio" name="site" onChange={updateValue} value={values.site} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-950">
            JUSTIFICACIÓN DE MODIFICACIÓN
          </h2>
          <textarea
            className={`mt-3 min-h-28 w-full rounded-md border p-3 text-sm font-semibold outline-none transition focus:ring-2 ${
              isJustificationInvalid || resultMessage?.status === 'error'
                ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100'
                : 'border-slate-300 bg-white text-slate-900 focus:border-sky-600 focus:ring-sky-100'
            }`}
            onChange={(event) => setJustification(event.target.value)}
            placeholder="Explique el motivo técnico y regulatorio de esta acción. Mínimo 15 caracteres."
            required
            value={justification}
          />
          <p
            className={`mt-2 text-xs font-bold ${
              justification.trim().length < 15 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {justification.trim().length}/15 caracteres mínimos requeridos.
          </p>
        </section>

        <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-950">Notas regulatorias</h2>
          <textarea
            className="mt-3 min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
            onChange={(event) => updateValue('notes', event.target.value)}
            placeholder="Notas complementarias del activo."
            value={values.notes}
          />
        </section>

        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-400"
          disabled={isSubmitting}
          type="submit"
        >
          <Save aria-hidden="true" size={17} />
          {isSubmitting ? 'Guardando...' : 'Guardar y auditar'}
        </button>
      </form>
    </main>
  );
}
