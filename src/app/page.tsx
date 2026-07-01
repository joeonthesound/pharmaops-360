import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

const ENABLE_INFRA_CHECKLIST = false;

type LoginState = {
  ok: boolean;
  message: string;
};

type InfraChecklistState = {
  env: {
    ok: boolean;
    message: string;
  };
  backend: {
    ok: boolean;
    message: string;
  };
  audit: {
    ok: boolean;
    warning: boolean;
    message: string;
  };
};

type AuthUserRow = {
  id: number;
  user_email: string | null;
  active: boolean | null;
};

const initialLoginState: LoginState = {
  ok: false,
  message: '',
};

function normalizeEmailForLookup(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
}

function getSupabaseProjectRef(supabaseUrl: string | undefined) {
  if (!supabaseUrl) {
    return 'undefined';
  }

  try {
    return new URL(supabaseUrl).hostname.split('.')[0] || 'unknown';
  } catch {
    return 'invalid-url';
  }
}

async function getInfraChecklistState(): Promise<InfraChecklistState> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envOk = Boolean(supabaseUrl?.length && supabaseAnonKey?.length);

  const state: InfraChecklistState = {
    env: {
      ok: envOk,
      message: envOk ? 'OK' : 'Faltan variables',
    },
    backend: {
      ok: false,
      message: 'Error de Red',
    },
    audit: {
      ok: false,
      warning: true,
      message: 'Tabla Vacia / RLS Bloqueado',
    },
  };

  if (!envOk) {
    return state;
  }

  try {
    const { supabase } = await import('@/shared/lib/supabase');

    const { error: pingError } = await supabase
      .from('usuarios_roles')
      .select('id')
      .limit(1);

    state.backend = {
      ok: !pingError,
      message: pingError ? 'Error de Red' : 'Conectado',
    };

    const { count, error: countError } = await supabase
      .from('usuarios_roles')
      .select('id', { count: 'exact', head: true });

    const totalUsuarios = count ?? 0;

    state.audit = {
      ok: !countError && totalUsuarios > 0,
      warning: Boolean(countError || totalUsuarios === 0),
      message:
        !countError && totalUsuarios > 0
          ? `${totalUsuarios} usuario(s)`
          : 'Tabla Vacia / RLS Bloqueado',
    };
  } catch (error) {
    console.log('[DIAGNOSTICO P360] INFRA CHECKLIST [Exception]', {
      error,
    });
  }

  return state;
}

async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  'use server';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = normalizeEmailForLookup(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');

  console.log('[DIAGNOSTICO P360] ETAPA 1 [Variables de Entorno]', {
    NEXT_PUBLIC_SUPABASE_URL: {
      defined: Boolean(supabaseUrl),
      length: supabaseUrl?.length ?? 0,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      defined: Boolean(supabaseAnonKey),
      length: supabaseAnonKey?.length ?? 0,
    },
  });

  console.log('[DIAGNOSTICO P360] ETAPA 2 [Payload Recibido]', {
    email,
    emailLength: email.length,
    passwordReceived: Boolean(password),
  });

  if (!email || !password) {
    console.log('[DIAGNOSTICO P360] ETAPA 4 [Resultado / Error]', {
      result: 'payload_incompleto',
    });

    return {
      ok: false,
      message: 'Ingrese correo institucional y contrasena.',
    };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('[DIAGNOSTICO P360] ETAPA 4 [Resultado / Error]', {
      result: 'variables_entorno_faltantes',
    });

    return {
      ok: false,
      message: 'Configuracion local de Supabase incompleta.',
    };
  }

  try {
    console.log('[DIAGNOSTICO P360] ETAPA 3 [Llamada a Supabase]', {
      supabaseProjectRef: getSupabaseProjectRef(supabaseUrl),
      authMode: 'anon_key_before_signInWithPassword',
      table: 'usuarios_roles',
      select: 'id, user_email, active',
      filter: { user_email_ilike: `%${email}%` },
    });

    const { supabase } = await import('@/shared/lib/supabase');
    const { data, error } = await supabase
      .from('usuarios_roles')
      .select('id, user_email, active')
      .ilike('user_email', `%${email}%`)
      .limit(10);

    if (error) {
      console.log('[DIAGNOSTICO P360] ETAPA 4 [Resultado / Error]', {
        result: 'supabase_error',
        error,
      });

      return {
        ok: false,
        message: 'No fue posible validar el usuario autorizado.',
      };
    }

    const matchedUser = ((data ?? []) as AuthUserRow[]).find(
      (user) => normalizeEmailForLookup(user.user_email) === email,
    );

    console.log('[DIAGNOSTICO P360] ETAPA 4 [Resultado / Error]', {
      result: 'supabase_success',
      recordsReturned: data?.length ?? 0,
      recordFound: Boolean(matchedUser),
      active: matchedUser?.active ?? null,
    });

    if (!matchedUser || matchedUser.active !== true) {
      return {
        ok: false,
        message: 'Usuario no autorizado o inactivo para el piloto HVAC.',
      };
    }

    const supabaseServer = await createSupabaseServerClient();
    const { error: authError } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.log('[DIAGNOSTICO P360] ETAPA 4 [Resultado / Error]', {
        result: 'auth_error',
        code: authError.code,
        message: authError.message,
      });

      return {
        ok: false,
        message: 'Credenciales de autenticacion invalidas.',
      };
    }
  } catch (error) {
    console.log('[DIAGNOSTICO P360] ETAPA 4 [Resultado / Error]', {
      result: 'exception',
      error,
    });

    return {
      ok: false,
      message: 'Fallo inesperado durante la validacion del servidor.',
    };
  }

  console.log('[DIAGNOSTICO P360] ETAPA 5 [Flujo de Redireccion]', {
    redirectTo: '/dashboard',
    willRedirect: true,
  });

  redirect('/dashboard');
}

function StatusBadge({
  tone,
  children,
}: {
  tone: 'green' | 'red' | 'yellow';
  children: ReactNode;
}) {
  const toneClasses = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    yellow: 'border-amber-200 bg-amber-50 text-amber-800',
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

function InfraChecklist({ state }: { state: InfraChecklistState }) {
  return (
    <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Pre-check de infraestructura
        </p>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="text-sm font-medium text-slate-700">
            Variables de Entorno
          </span>
          <StatusBadge tone={state.env.ok ? 'green' : 'red'}>
            {state.env.message}
          </StatusBadge>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="text-sm font-medium text-slate-700">
            Conexion al Backend
          </span>
          <StatusBadge tone={state.backend.ok ? 'green' : 'red'}>
            {state.backend.message}
          </StatusBadge>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="text-sm font-medium text-slate-700">
            Auditoria de Datos
          </span>
          <StatusBadge tone={state.audit.ok ? 'green' : 'yellow'}>
            {state.audit.message}
          </StatusBadge>
        </div>
      </div>
    </div>
  );
}

export default async function LoginPage() {
  const infraChecklistState = ENABLE_INFRA_CHECKLIST
    ? await getInfraChecklistState()
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-950">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700">
            P360
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">PharmaOps 360</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Acceso institucional al piloto HVAC
          </p>
        </div>

        {ENABLE_INFRA_CHECKLIST && infraChecklistState ? (
          <InfraChecklist state={infraChecklistState} />
        ) : null}

        <LoginForm action={loginAction} initialState={initialLoginState} />
      </section>
    </main>
  );
}
