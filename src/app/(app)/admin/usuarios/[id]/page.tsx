import { notFound } from 'next/navigation';
import {
  assertRootAdminAccess,
  type UpsertUserInput,
} from '@/modules/usuarios-roles/user-admin.actions';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { UserForm } from '../user-form';

type EditarUsuarioPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type UsuarioEditable = UpsertUserInput & {
  id: number;
};

const ROOT_SUPERUSER_EMAILS = ['josueth.acevedo@gmail.com'];

function normalizeEmail(email: string) {
  return String(email ?? '').trim().toLowerCase();
}

export default async function EditarUsuarioPage({ params }: EditarUsuarioPageProps) {
  const actor = await assertRootAdminAccess();
  const resolvedParams = await params;
  const userId = Number(resolvedParams.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('usuarios_roles')
    .select(
      'id, user_email, full_name, job_title, role, user_type, site, area, active, can_create_assets, can_execute_maintenance, can_review, can_approve, can_view_audit, can_access_forensic_sheet, can_export_controlled_copies, can_manage_users, requires_2fa, notes',
    )
    .eq('id', userId)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const usuario = data as UsuarioEditable;
  const isRootTarget = ROOT_SUPERUSER_EMAILS.includes(normalizeEmail(usuario.user_email));
  const lockedBySod = isRootTarget && actor.scope !== 'root_superuser';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Administracion
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal">Editar Usuario</h1>
          <p className="mt-1 text-sm text-slate-600">
            Modificacion controlada de perfiles y permisos con proteccion SoD.
          </p>
        </header>

        <UserForm initialValues={usuario} lockedBySod={lockedBySod} mode="edit" />
      </section>
    </main>
  );
}
