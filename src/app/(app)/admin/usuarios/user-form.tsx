'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  upsertUserAction,
  type UpsertUserInput,
  type UserAdminActionResult,
} from '@/modules/usuarios-roles/user-admin.actions';
import { ENABLE_SUPERADMIN_DEBUG_LOGS } from '@/modules/mantenimiento/debug';
import type {
  UsuarioRolNombre,
  UsuarioTipo,
} from '@/modules/usuarios-roles/usuarios-roles.interface';

type UserFormProps = {
  initialValues: UpsertUserInput;
  lockedBySod: boolean;
  mode: 'create' | 'edit';
};

type PermissionKey =
  | 'active'
  | 'can_create_assets'
  | 'can_execute_maintenance'
  | 'can_review'
  | 'can_approve'
  | 'can_manage_users'
  | 'can_view_audit'
  | 'can_access_forensic_sheet'
  | 'can_export_controlled_copies';

type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  description: string;
};

type PermissionPolicy = Partial<Record<PermissionKey, { checked: boolean; locked: boolean }>>;

const roleOptions: Array<{ value: UsuarioRolNombre; label: string }> = [
  { value: 'tecnico', label: 'tecnico' },
  { value: 'supervisor', label: 'supervisor' },
  { value: 'calidad', label: 'calidad' },
  { value: 'gerencia', label: 'gerencia' },
  { value: 'auditor', label: 'auditor' },
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Administrativo', label: 'Administrativo' },
  { value: 'Temporal', label: 'Temporal' },
];

const areaOptions = [
  'Control de Calidad (QC)',
  'Aseguramiento de Calidad (QA)',
  'Ingeniería y Mantenimiento',
  'Producción/Planta',
  'Entidad Regulatoria Externa',
];

const jobTitleOptions = [
  'Técnico de Campo',
  'Supervisor Técnico',
  'Oficial de QA',
  'Director de Planta',
  'Auditor Externo',
];

const userTypeOptions: UsuarioTipo[] = ['Interno', 'Externo'];

const permissionDefinitions: PermissionDefinition[] = [
  {
    key: 'active',
    label: 'Estado de Cuenta',
    description: 'Habilita o bloquea el acceso logico del perfil.',
  },
  {
    key: 'can_create_assets',
    label: 'Crear Activos',
    description: 'Permite altas controladas de activos maestros.',
  },
  {
    key: 'can_execute_maintenance',
    label: 'Ejecutar Mantenimiento',
    description: 'Permite captura tecnica y ejecucion en planta.',
  },
  {
    key: 'can_review',
    label: 'Rol Supervisor',
    description: 'Permite revision tecnica y respuesta de validacion primaria.',
  },
  {
    key: 'can_approve',
    label: 'Aseguramiento de Calidad',
    description: 'Liberacion y dictamen GxP.',
  },
  {
    key: 'can_manage_users',
    label: 'Administrar Usuarios',
    description: 'Gestiona perfiles bajo segregacion de funciones.',
  },
  {
    key: 'can_view_audit',
    label: 'Ver Auditoria',
    description: 'Acceso read-only a logs y registros del sistema.',
  },
  {
    key: 'can_access_forensic_sheet',
    label: 'Acceso a Ficha Forense',
    description: 'Permite abrir la vista responsive Lifecycle Sheet al 89%.',
  },
  {
    key: 'can_export_controlled_copies',
    label: 'Exportar Copias Controladas',
    description: 'Habilita el Route Handler PDF con marcas de agua regulatorias.',
  },
];

const SOD_WARNING =
  'Incompatibilidad GxP: Restriccion por Segregacion de Funciones (SoD) activa.';

function logD10SClientSubmissionFailure(result: UserAdminActionResult) {
  if (!ENABLE_SUPERADMIN_DEBUG_LOGS) {
    return;
  }

  console.log(
    `🔮 [D10S CLIENT EXCEPTION]: Submission payload structure failed validation: ${
      result.error ?? result.message ?? 'Unknown response error'
    }`,
    result,
  );
}

function normalizePolicyValue(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function isAuditorGate(values: UpsertUserInput) {
  return (
    normalizePolicyValue(values.role) === 'auditor' ||
    normalizePolicyValue(values.job_title) === 'auditor externo' ||
    normalizePolicyValue(values.area) === 'entidad regulatoria externa'
  );
}

function isTechnicianGate(values: UpsertUserInput) {
  return normalizePolicyValue(values.job_title) === 'tecnico de campo';
}

function buildPermissionPolicy(values: UpsertUserInput): PermissionPolicy {
  const policy: PermissionPolicy = {};

  if (isAuditorGate(values)) {
    policy.can_view_audit = { checked: true, locked: true };
    policy.can_access_forensic_sheet = { checked: true, locked: true };
    policy.can_export_controlled_copies = { checked: true, locked: true };
    policy.can_create_assets = { checked: false, locked: true };
    policy.can_execute_maintenance = { checked: false, locked: true };
    policy.can_manage_users = { checked: false, locked: true };
    policy.can_review = { checked: false, locked: true };
    policy.can_approve = { checked: false, locked: true };
  }

  if (isTechnicianGate(values)) {
    policy.can_execute_maintenance = { checked: true, locked: true };
    policy.can_approve = { checked: false, locked: true };
    policy.can_manage_users = { checked: false, locked: true };
  }

  return policy;
}

function getEffectiveValues(values: UpsertUserInput): UpsertUserInput {
  const policy = buildPermissionPolicy(values);

  return permissionDefinitions.reduce<UpsertUserInput>(
    (currentValues, permission) => {
      const rule = policy[permission.key];

      if (!rule) {
        return currentValues;
      }

      return {
        ...currentValues,
        [permission.key]: rule.checked,
      };
    },
    {
      ...values,
      can_create_assets: Boolean(values.can_create_assets),
      can_execute_maintenance: Boolean(values.can_execute_maintenance),
      can_review: Boolean(values.can_review),
      can_approve: Boolean(values.can_approve),
      can_view_audit: Boolean(values.can_view_audit),
      can_access_forensic_sheet: Boolean(values.can_access_forensic_sheet),
      can_export_controlled_copies: Boolean(values.can_export_controlled_copies),
      can_manage_users: Boolean(values.can_manage_users),
      active: Boolean(values.active),
    },
  );
}

function ToggleField({
  checked,
  description,
  disabled,
  label,
  locked,
  onChange,
  onLockedClick,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  locked: boolean;
  onChange: (checked: boolean) => void;
  onLockedClick: () => void;
}) {
  const isBlocked = disabled || locked;

  return (
    <button
      aria-checked={checked}
      aria-disabled={isBlocked}
      className={`flex min-h-24 items-start justify-between gap-4 rounded-md border px-3 py-3 text-left transition focus:outline-none focus:ring-2 ${
        checked
          ? 'border-emerald-200 bg-emerald-50 focus:ring-emerald-100'
          : 'border-slate-200 bg-white focus:ring-slate-200'
      } ${isBlocked ? 'cursor-not-allowed opacity-80' : 'hover:bg-slate-50'}`}
      onClick={() => {
        if (isBlocked) {
          onLockedClick();
          return;
        }

        onChange(!checked);
      }}
      role="checkbox"
      type="button"
    >
      <span>
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span>
        {locked ? (
          <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
            SoD activo
          </span>
        ) : null}
      </span>
      <span
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
        }`}
      >
        {checked ? <span className="h-2 w-2 rounded-sm bg-white" /> : null}
      </span>
    </button>
  );
}

export function UserForm({ initialValues, lockedBySod, mode }: UserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<UpsertUserInput>(() => getEffectiveValues(initialValues));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sodWarning, setSodWarning] = useState<string | null>(null);
  const effectiveValues = useMemo(() => getEffectiveValues(values), [values]);
  const permissionPolicy = useMemo(() => buildPermissionPolicy(values), [values]);
  const isDisabled = isPending || lockedBySod;
  const auditorGateActive = isAuditorGate(values);
  const technicianGateActive = isTechnicianGate(values);

  function updateValue<K extends keyof UpsertUserInput>(key: K, value: UpsertUserInput[K]) {
    setValues((current) => getEffectiveValues({ ...current, [key]: value }));
    setSodWarning(null);
  }

  function updatePermission(key: PermissionKey, checked: boolean) {
    setValues((current) => getEffectiveValues({ ...current, [key]: checked }));
    setSodWarning(null);
  }

  function showLockedWarning() {
    setSodWarning(SOD_WARNING);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (lockedBySod) {
      setError('Operacion no autorizada: Privilegios insuficientes sobre cuenta raiz');
      return;
    }

    startTransition(async () => {
      const result = await upsertUserAction(getEffectiveValues(values));

      if (!result.ok) {
        logD10SClientSubmissionFailure(result);
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
          Cuenta raiz protegida por Segregacion de Funciones. Los permisos y el estado no pueden
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
              value={effectiveValues.full_name}
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
              value={effectiveValues.user_email}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Area validada
            <select
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              disabled={isDisabled}
              onChange={(event) => updateValue('area', event.target.value)}
              value={effectiveValues.area}
            >
              {areaOptions.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Cargo operativo
            <select
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              disabled={isDisabled}
              onChange={(event) => updateValue('job_title', event.target.value)}
              value={effectiveValues.job_title}
            >
              {jobTitleOptions.map((jobTitle) => (
                <option key={jobTitle} value={jobTitle}>
                  {jobTitle}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Rol
            <select
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
              disabled={isDisabled}
              onChange={(event) => updateValue('role', event.target.value as UsuarioRolNombre)}
              value={effectiveValues.role}
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
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
              value={effectiveValues.user_type}
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-normal">Permisos GxP</h2>
            <p className="mt-1 text-sm text-slate-600">
              Matriz parametrica con limites automaticos por rol, cargo y area.
            </p>
          </div>
          {(auditorGateActive || technicianGateActive) && !sodWarning ? (
            <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              SoD activo
            </span>
          ) : null}
        </div>

        {sodWarning ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
            {sodWarning}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {permissionDefinitions.map((permission) => {
            const policy = permissionPolicy[permission.key];
            const checked = Boolean(effectiveValues[permission.key]);
            const locked = Boolean(policy?.locked);

            return (
              <ToggleField
                checked={checked}
                description={permission.description}
                disabled={isDisabled}
                key={permission.key}
                label={permission.label}
                locked={locked}
                onChange={(nextChecked) => updatePermission(permission.key, nextChecked)}
                onLockedClick={showLockedWarning}
              />
            );
          })}
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
