import { assertRootAdminAccess } from '@/modules/usuarios-roles/user-admin.actions';
import { UserForm } from '../user-form';

export default async function NuevoUsuarioPage() {
  await assertRootAdminAccess();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Administracion
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Nuevo Usuario</h1>
          <p className="mt-1 text-sm text-slate-600">
            Alta controlada de perfiles con permisos GxP y segregacion de funciones.
          </p>
        </header>

        <UserForm
          initialValues={{
            user_email: '',
            full_name: '',
            job_title: '',
            role: 'Técnico',
            user_type: 'Interno',
            site: null,
            area: '',
            active: true,
            can_create_assets: false,
            can_execute_maintenance: false,
            can_review: false,
            can_approve: false,
            can_view_audit: false,
            can_manage_users: false,
            requires_2fa: false,
            notes: null,
          }}
          lockedBySod={false}
          mode="create"
        />
      </section>
    </main>
  );
}
