'use client';

import { useActionState } from 'react';

type LoginState = {
  ok: boolean;
  message: string;
};

type LoginFormProps = {
  action: (previousState: LoginState, formData: FormData) => Promise<LoginState>;
  initialState: LoginState;
};

export function LoginForm({ action, initialState }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {state.message}
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          required
          autoComplete="email"
          className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          id="email"
          name="email"
          placeholder="usuario@empresa.com"
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <input
          required
          autoComplete="current-password"
          className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          id="password"
          name="password"
          placeholder="********"
          type="password"
        />
      </div>

      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-base font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-200 active:bg-sky-900 disabled:bg-slate-400"
        disabled={isPending}
        type="submit"
      >
        {isPending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : null}
        {isPending ? 'Validando...' : 'Ingresar'}
      </button>
    </form>
  );
}
