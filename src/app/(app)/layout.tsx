import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/modules/common/components';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

type AppLayoutProps = {
  children: React.ReactNode;
};

type UsuarioRolRow = {
  can_approve: boolean | null;
  can_create_assets: boolean | null;
  full_name: string | null;
  role: string | null;
  notes: string | null;
};

type CurrentUserContext = {
  canApprove: boolean;
  canCreateAssets: boolean;
  email: string;
  fullName: string;
  role: string;
};

function normalizeRole(role: string | null | undefined) {
  const normalizedRole = String(role ?? '').trim();

  if (!normalizedRole) {
    return null;
  }

  const roleAliases: Record<string, string> = {
    tecnico: 'Técnico',
    técnico: 'Técnico',
    calidad: 'Calidad',
    produccion: 'Producción',
    producción: 'Producción',
    administrativo: 'Administrativo',
    administrador: 'Administrador',
    auditor: 'Auditor',
    supervisor: 'Supervisor',
    temporal: 'Temporal',
    'propietario / gerencia': 'Propietario / Gerencia',
    'propietario/gerencia': 'Propietario / Gerencia',
    'propietario gerencia': 'Propietario / Gerencia',
    'gerente general': 'Gerente General',
    'gerencia general': 'Gerente General',
  };

  return roleAliases[normalizedRole.toLowerCase()] ?? normalizedRole;
}

function getTemporalExpiration(notes: string | null | undefined) {
  const match = String(notes ?? '').match(/Expira:\s*([0-9T:\-.Z]+)/i);

  if (!match?.[1]) {
    return null;
  }

  const expiresAt = new Date(match[1]);

  return Number.isNaN(expiresAt.getTime()) ? null : expiresAt;
}

function isTemporalProfileExpired(role: string | null, notes: string | null) {
  if (role !== 'Temporal') {
    return false;
  }

  const expiresAt = getTemporalExpiration(notes);

  if (!expiresAt) {
    return true;
  }

  return expiresAt.getTime() <= Date.now();
}

async function resolveCurrentUserContext(): Promise<CurrentUserContext | null> {
  await cookies();
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email?.trim().toLowerCase();

  if (!email) {
    console.error(
      `[ALERTA AUDITORÍA GxP] Intento de acceso no autorizado o sin rol asignado: ${email}`,
    );
    return null;
  }

  const { data, error } = await supabase
    .from('usuarios_roles')
    .select('full_name, role, notes, can_approve, can_create_assets')
    .eq('user_email', email)
    .eq('active', true)
    .order('id', { ascending: true });

  if (error) {
    console.error('[ALERTA AUDITORÍA GxP] Error resolviendo rol de usuario', {
      email,
      code: error.code,
      message: error.message,
    });

    return null;
  }

  if (!data || data.length === 0) {
    console.error(
      `[ALERTA AUDITORÍA GxP] Intento de acceso no autorizado o sin rol asignado: ${email}`,
    );
    return null;
  }

  const profiles = data as UsuarioRolRow[];
  const profile = profiles[0];
  const normalizedRole = normalizeRole(profile.role);

  if (isTemporalProfileExpired(normalizedRole, profile.notes)) {
    console.error('[ALERTA AUDITORÍA GxP] Perfil temporal caducado o sin expiración válida', {
      email,
      role: normalizedRole,
    });
    return null;
  }

  if (!normalizedRole) {
    return null;
  }

  return {
    canApprove: profiles.some((item) => item.can_approve === true),
    canCreateAssets: profiles.some((item) => item.can_create_assets === true),
    email,
    fullName: profile.full_name?.trim() || email,
    role: normalizedRole,
  };
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const currentUser = await resolveCurrentUserContext();

  if (!currentUser) {
    redirect('/?error=unauthorized');
  }

  return (
    <AppShell
      currentCapabilities={{
        can_approve: currentUser.canApprove,
        can_create_assets: currentUser.canCreateAssets,
      }}
      currentRole={currentUser.role}
      currentUserEmail={currentUser.email}
      currentUserName={currentUser.fullName}
    >
      {children}
    </AppShell>
  );
}
