import Link from 'next/link';
import { FlaskConical, ShieldAlert } from 'lucide-react';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { OrderCreationForm, type AssetOption } from './order-creation-form';

type UsuarioRolRow = {
  can_approve: boolean | null;
  can_create_assets: boolean | null;
  role: string | null;
};

type AssetRow = {
  uuid: string | null;
  asset_code: string | null;
  asset_name: string | null;
  asset_type: string | null;
};

const TARGET_URL = '/mantenimiento/crear-ordenes';

async function resolveSecurityContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email?.trim().toLowerCase() ?? '';

  const { data } = userEmail
    ? await supabase
        .from('usuarios_roles')
        .select('role, can_approve, can_create_assets')
        .eq('user_email', userEmail)
        .eq('active', true)
        .order('id', { ascending: true })
    : { data: null };

  const profiles = (data ?? []) as UsuarioRolRow[];
  const hasOrderCreationAccess = profiles.some(
    (profile) => profile.can_approve === true || profile.can_create_assets === true,
  );

  return {
    userId: user?.id ?? null,
    userRole: profiles[0]?.role ?? 'Sin rol activo',
    hasOrderCreationAccess,
  };
}

async function registerDeniedAccess({
  userId,
  userRole,
}: {
  userId: string | null;
  userRole: string;
}) {
  const supabase = await createSupabaseServerClient();
  const serverUtcTimestamp = new Date().toISOString();

  const { error: insertError } = await supabase.from('access_denied_logs').insert({
    user_id: userId,
    user_role: userRole,
    target_url: TARGET_URL,
    server_utc_timestamp: serverUtcTimestamp,
  });

  if (insertError) {
    console.error('[GxP SECURITY PERIMETER] access_denied_logs insert failed', {
      code: insertError.code,
      message: insertError.message,
      target_url: TARGET_URL,
      user_role: userRole,
    });
  }

  const { count, error: countError } = await supabase
    .from('access_denied_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_role', userRole)
    .eq('target_url', TARGET_URL);

  if (countError) {
    console.error('[GxP SECURITY PERIMETER] access_denied_logs count failed', {
      code: countError.code,
      message: countError.message,
      target_url: TARGET_URL,
      user_role: userRole,
    });
  }

  return count ?? (insertError ? 0 : 1);
}

async function getAvailableAssets(): Promise<AssetOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('activos')
    .select('uuid, asset_code, asset_name, asset_type')
    .order('asset_code', { ascending: true });

  if (error) {
    console.error('[CREAR ORDENES] Error cargando activos', {
      code: error.code,
      message: error.message,
    });

    return [];
  }

  return ((data ?? []) as AssetRow[])
    .filter((asset) => asset.uuid && asset.asset_code && asset.asset_name && asset.asset_type)
    .map((asset) => ({
      uuid: String(asset.uuid),
      asset_code: String(asset.asset_code),
      asset_name: String(asset.asset_name),
      asset_type: String(asset.asset_type),
    }));
}

function AccessDeniedScreen({ counterValue }: { counterValue: number }) {
  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto flex max-w-3xl flex-col items-center rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700">
          <ShieldAlert aria-hidden="true" className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Acceso Restringido
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
          Estimado usuario, su perfil actual no cuenta con las credenciales de validacion
          necesarias para interactuar con el entorno de creacion de ordenes de mantenimiento. Esta
          accion ha sido notificada para mantener la trazabilidad del sistema conforme a la norma
          21 CFR Part 11.
        </p>
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          Intentos de acceso no autorizados registrados historicamente para este perfil:{' '}
          {counterValue}
        </div>
        <Link
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
          href="/dashboard"
        >
          Volver al dashboard
        </Link>
      </section>
    </main>
  );
}

export default async function CrearOrdenesPage() {
  const { userId, userRole, hasOrderCreationAccess } = await resolveSecurityContext();

  if (!hasOrderCreationAccess) {
    const counterValue = await registerDeniedAccess({
      userId,
      userRole,
    });

    return <AccessDeniedScreen counterValue={counterValue} />;
  }

  const assets = await getAvailableAssets();

  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
            <FlaskConical aria-hidden="true" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Entorno restringido Superadmin
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">Crear Órdenes</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Modulo reservado para creacion controlada de ordenes de mantenimiento en ambientes
              de validacion.
            </p>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-5xl">
        <OrderCreationForm assets={assets} />
      </div>
    </main>
  );
}
