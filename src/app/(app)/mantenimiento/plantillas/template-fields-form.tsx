'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  saveTemplateFields,
  type TemplateDataType,
  type TemplateFieldDraft,
} from './actions';

type TemplateFieldsFormProps = {
  assetType: string;
};

function createEmptyField(): TemplateFieldDraft {
  return {
    id: crypto.randomUUID(),
    seccion_nombre: '',
    campo_nombre: '',
    tipo_dato: 'OK_NOK',
    unidad_medida: 'N/A',
  };
}

export function TemplateFieldsForm({ assetType }: TemplateFieldsFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<TemplateFieldDraft[]>([createEmptyField()]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canSave = useMemo(
    () =>
      Boolean(assetType) &&
      fields.some((field) => field.seccion_nombre.trim() && field.campo_nombre.trim()),
    [assetType, fields],
  );

  function updateField(
    id: string,
    key: keyof Omit<TemplateFieldDraft, 'id'>,
    value: string,
  ) {
    setFields((currentFields) =>
      currentFields.map((field) =>
        field.id === id
          ? {
              ...field,
              [key]: key === 'tipo_dato' ? (value as TemplateDataType) : value,
            }
          : field,
      ),
    );
  }

  function addField() {
    setFields((currentFields) => [...currentFields, createEmptyField()]);
  }

  function removeField(id: string) {
    setFields((currentFields) => currentFields.filter((field) => field.id !== id));
  }

  function handleSubmit() {
    setMessage(null);
    setIsSuccess(false);

    startTransition(async () => {
      const result = await saveTemplateFields({
        assetType,
        fields,
      });

      setMessage(result.message);
      setIsSuccess(result.ok);

      if (result.ok) {
        window.setTimeout(() => {
          router.push('/mantenimiento/crear-ordenes?template_saved=1');
        }, 900);
      }
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">
            Modificar Parametros de Calificacion
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Plantilla: {assetType || 'Tipo de activo no especificado'}
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Configure los parametros que se inyectaran al generar una orden para este tipo de
            activo.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          onClick={addField}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Agregar Campo
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
        <div className="hidden grid-cols-[1fr_1.2fr_160px_140px_56px] gap-0 bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-500 md:grid">
          <div className="px-3 py-2">Seccion</div>
          <div className="px-3 py-2">Nombre del Parametro</div>
          <div className="px-3 py-2">Tipo de Dato</div>
          <div className="px-3 py-2">Unidad</div>
          <div className="px-3 py-2 text-center">Quitar</div>
        </div>

        <div className="divide-y divide-slate-100">
          {fields.map((field) => (
            <div
              className="grid gap-3 p-3 md:grid-cols-[1fr_1.2fr_160px_140px_56px] md:items-center"
              key={field.id}
            >
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                onChange={(event) => updateField(field.id, 'seccion_nombre', event.target.value)}
                placeholder="Seccion"
                value={field.seccion_nombre}
              />
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                onChange={(event) => updateField(field.id, 'campo_nombre', event.target.value)}
                placeholder="Nombre del parametro"
                value={field.campo_nombre}
              />
              <select
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                onChange={(event) => updateField(field.id, 'tipo_dato', event.target.value)}
                value={field.tipo_dato}
              >
                <option value="OK_NOK">OK_NOK</option>
                <option value="NUMERIC">NUMERIC</option>
                <option value="TEXT">TEXT</option>
              </select>
              <input
                className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                onChange={(event) => updateField(field.id, 'unidad_medida', event.target.value)}
                placeholder="N/A"
                value={field.unidad_medida}
              />
              <button
                aria-label="Eliminar campo"
                className="inline-flex h-10 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={fields.length === 1}
                onClick={() => removeField(field.id)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {message ? (
          <div
            className={`rounded-lg border px-3 py-2 text-sm font-bold ${
              isSuccess
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {message}
          </div>
        ) : (
          <div className="text-sm font-semibold text-slate-500">
            Los cambios se guardaran como plantilla oficial para {assetType || 'este tipo'}.
          </div>
        )}

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:bg-slate-300"
          disabled={!canSave || isPending}
          onClick={handleSubmit}
          type="button"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {isPending ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </section>
  );
}
