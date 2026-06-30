'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  upsertUserAction,
  type UpsertUserInput,
} from '@/modules/usuarios-roles/user-admin.actions';
import type {
  UsuarioRolNombre,
  UsuarioTipo,
} from '@/modules/usuarios-roles/usuarios-roles.interface';

type UserFormProps = {
  initialValues: UpsertUserInput;
  lockedBySod: boolean;
  mode: 'create' | 'edit';
};

const roleOptions: UsuarioRolNombre[] = [
  'Administrador',
  'Administrativo',
  'Propietario / Gerencia',
  'Calidad',
  'Supervisor',
  'Técnico',
  'Temporal',
];

const userTypeOptions: UsuarioTipo[] = ['Interno', 'Externo'];

function ToggleField({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-3">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        checked={checked}
        className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

export function UserForm({ initialValues, lockedBySod, mode }: UserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<UpsertUserInput>(initialValues);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDisabled = isPending || lockedBySod;

  function updateValue<K extends keyof UpsertUserInput>(key: K, value: UpsertUserInput[K]) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (lockedBySod) {
      setError('Operación no autorizada: Privilegios insuficientes sobre cuenta raíz');
      return;
    }

    startTransition(async () => {
      const result = await upsertUserAction(values);

      if (!result.ok) {
        setError(result.error ?? 'No fue posible guardar el usuario.');
        return;
      }

      setMessage(result.message ?? 'Usuario guardado correctamente.');
      router.push('/admin/usuarios');
      router.refresh();
    });
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      {lockedBySod ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
          Cuenta raíz protegida por Segregación de Funciones. Los permisos y el estado no pueden
          ser modificados por un administrador funcional.
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold tracking-normal">Datos del usuario</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Nombre
            <input
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              disabled={isDisabled}
              onChange={(event) => updateValue('full_name', event.target.value)}
              required
              type="text"
              value={values.full_name}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Email
            <input
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              disabled={isDisabled}
              onChange={(event) => updateValue('user_email', event.target.value)}
              required
              type="email"
              value={values.user_email}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Cargo
            <input
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              disabled={isDisabled}
              onChange={(event) => updateValue('job_title', event.target.value)}
              required
              type="text"
              value={values.job_title}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Área
            <input
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              disabled={isDisabled}
              onChange={(event) => updateValue('area', event.target.value)}
              required
              type="text"
              value={values.area}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Rol
            <select
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              disabled={isDisabled}
              onChange={(event) => updateValue('role', event.target.value as UsuarioRolNombre)}
              value={values.role}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Tipo
            <select
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              disabled={isDisabled}
              onChange={(event) => updateValue('user_type', event.target.value as UsuarioTipo)}
              value={values.user_type}
            >
              {userTypeOptions.map((userType) => (
                <option key={userType} value={userType}>
                  {userType}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold tracking-normal">Permisos GxP</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ToggleField
            checked={values.active}
            disabled={isDisabled}
            label="Estado de Cuenta"
            onChange={(checked) => updateValue('active', checked)}
          />
          <ToggleField
            checked={Boolean(values.can_create_assets)}
            disabled={isDisabled}
            label="Crear Activos"
            onChange={(checked) => updateValue('can_create_assets', checked)}
          />
          <ToggleField
            checked={Boolean(values.can_execute_maintenance)}
            disabled={isDisabled}
            label="Ejecutar Mantenimiento"
            onChange={(checked) => updateValue('can_execute_maintenance', checked)}
          />
          <ToggleField
            checked={values.can_review}
            disabled={isDisabled}
            label="Rol Supervisor"
            onChange={(checked) => updateValue('can_review', checked)}
          />
          <ToggleField
            checked={values.can_approve}
            disabled={isDisabled}
            label="Aseguramiento de Calidad"
            onChange={(checked) => updateValue('can_approve', checked)}
          />
          <ToggleField
            checked={Boolean(values.can_view_audit)}
            disabled={isDisabled}
            label="Ver Auditoría"
            onChange={(checked) => updateValue('can_view_audit', checked)}
          />
          <ToggleField
            checked={Boolean(values.can_manage_users)}
            disabled={isDisabled}
            label="Administrar Usuarios"
            onChange={(checked) => updateValue('can_manage_users', checked)}
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
          onClick={() => router.push('/admin/usuarios')}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="h-11 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 active:bg-slate-950 disabled:bg-slate-300"
          disabled={isDisabled}
          type="submit"
        >
          {isPending ? 'Guardando...' : mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}
