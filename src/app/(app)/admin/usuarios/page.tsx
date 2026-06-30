import Link from 'next/link';
import { redirect } from 'next/navigation';
import { assertRootAdminAccess } from '@/modules/usuarios-roles/user-admin.actions';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

export const runtime = 'edge';

type UsuarioListado = {
  id: number;
  user_email: string;
  full_name: string;
  job_title: string;
  role: string;
  area: string;
  active: boolean;
  can_execute_maintenance: boolean;
  can_review: boolean;
  can_approve: boolean;
  can_manage_users: boolean;
};

type UserHierarchyLevel = {
  label: string;
  order: number;
  className: string;
};

const ROOT_SUPERUSER_EMAILS = ['josueth.acevedo@gmail.com'];
const FUNCTIONAL_ADMIN_EMAILS = ['albis@labymed.com']; // Reemplazar por el correo real si varía

const USER_LEVEL_BADGE = {
  root_superuser: {
    label: 'Nivel 1: Superusuario Raíz',
    order: 1,
    className: 'bg-slate-900 text-white border-slate-900',
  },
  functional_admin: {
    label: 'Nivel 2: Administración Funcional / Gerencia',
    order: 2,
    className: 'bg-blue-600 text-white border-blue-600',
  },
  quality_auditor: {
    label: 'Nivel 3: Calidad / Aseguramiento / Auditor',
    order: 3,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  supervisor: {
    label: 'Nivel 4: Supervisor de Planta',
    order: 4,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  technician: {
    label: 'Nivel 5: Técnico Operativo',
    order: 5,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  temporal: {
    label: 'Nivel 6: Personal Temporal (Caducable)',
    order: 6,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
} satisfies Record<string, UserHierarchyLevel>;

function normalizeEmail(email: string) {
  return String(email ?? '').trim().toLowerCase();
}

function resolveUserLevel(usuario: UsuarioListado): UserHierarchyLevel {
  const email = normalizeEmail(usuario.user_email);

  if (ROOT_SUPERUSER_EMAILS.includes(email)) {
    return USER_LEVEL_BADGE.root_superuser;
  }

  if (FUNCTIONAL_ADMIN_EMAILS.includes(email)) {
    return USER_LEVEL_BADGE.functional_admin;
  }

  if (usuario.role === 'Temporal') {
    return USER_LEVEL_BADGE.temporal;
  }

  if (
    usuario.can_approve === true ||
    usuario.role === 'Calidad' ||
    usuario.role === 'Auditor'
  ) {
    return USER_LEVEL_BADGE.quality_auditor;
  }

  if (usuario.can_review === true && usuario.can_approve === false) {
    return USER_LEVEL_BADGE.supervisor;
  }

  if (usuario.can_execute_maintenance === true) {
    return USER_LEVEL_BADGE.technician;
  }

  return USER_LEVEL_BADGE.technician;
}

export default async function UsuariosAdminPage() {
  try {
    await assertRootAdminAccess();
  } catch (error) {
    console.error('[ALERTA AUDITORIA GxP] Acceso administrativo redirigido', {
      route: '/admin/usuarios',
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    redirect('/dashboard');
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('usuarios_roles')
    .select(
      'id, user_email, full_name, job_title, role, area, active, can_execute_maintenance, can_review, can_approve, can_manage_users',
    )
    .order('user_email', { ascending: true });

  const usuarios = ((data ?? []) as UsuarioListado[]).sort((left, right) => {
    const leftLevel = resolveUserLevel(left);
    const rightLevel = resolveUserLevel(right);

    if (leftLevel.order !== rightLevel.order) {
      return leftLevel.order - rightLevel.order;
    }

    return left.user_email.localeCompare(right.user_email);
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Administracion
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Usuarios y Roles</h1>
            <p className="mt-1 text-sm text-slate-600">
              Control centralizado de accesos bajo segregacion de funciones.
            </p>
          </div>
          <Link
            className="flex h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 active:bg-slate-950"
            href="/admin/usuarios/nuevo"
          >
            Nuevo Usuario
          </Link>
        </header>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            No fue posible cargar los usuarios autorizados.
          </div>
        ) : null}

        <div className="grid gap-3 lg:hidden">
          {usuarios.map((usuario) => {
            const level = resolveUserLevel(usuario);

            return (
              <article
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                key={usuario.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-slate-950">
                      {usuario.full_name}
                    </h2>
                    <p className="mt-1 truncate text-sm text-slate-600">{usuario.user_email}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${level.className}`}
                  >
                    {level.label}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm">
                  <div className="rounded-md bg-slate-100 px-3 py-2 text-slate-700">
                    {usuario.job_title} / {usuario.area}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2">
                    <span className="text-slate-600">Estado</span>
                    <span
                      className={`font-semibold ${
                        usuario.active ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {usuario.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                <Link
                  className="mt-4 flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  href={`/admin/usuarios/${usuario.id}`}
                >
                  Editar
                </Link>
              </article>
            );
          })}
        </div>

        <section className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Jerarquia</th>
                <th className="px-4 py-3">Rol / Area</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {usuarios.map((usuario) => {
                const level = resolveUserLevel(usuario);

                return (
                  <tr className="align-top" key={usuario.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{usuario.full_name}</p>
                      <p className="mt-1 text-slate-600">{usuario.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${level.className}`}
                      >
                        {level.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{usuario.role}</p>
                      <p className="mt-1 text-slate-600">
                        {usuario.job_title} / {usuario.area}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          usuario.active ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {usuario.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        href={`/admin/usuarios/${usuario.id}`}
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
