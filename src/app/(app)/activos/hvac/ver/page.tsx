'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, ShieldCheck } from 'lucide-react';
import { APP_ROUTES } from '@/modules/common/routes';

const VALID_ASSET_IDENTIFIER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3,4}-[0-9a-f]{3,4}-[0-9a-f]{12}$/i;

function normalizeIdentifier(value: string) {
  return value.trim();
}

function isValidAssetIdentifier(value: string) {
  return UUID_PATTERN.test(value) || VALID_ASSET_IDENTIFIER_PATTERN.test(value);
}

export default function ActivoHvacVerSearchPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const normalizedIdentifier = useMemo(() => normalizeIdentifier(identifier), [identifier]);
  const isValidIdentifier = isValidAssetIdentifier(normalizedIdentifier);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    if (!isValidIdentifier) {
      return;
    }

    router.push(APP_ROUTES.activos.hvacProfile(normalizedIdentifier));
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950">
      <section className="mx-auto grid w-full max-w-5xl gap-5">
        <header className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                SCREEN-ACT-PDAC-SEARCH-01
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950 md:text-3xl">
                Buscador de Expedientes PDAC
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Terminal regulado para localizar perfiles dinamicos de activos criticos HVAC por
                UUID, codigo de activo o lectura QR emulada.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-800">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0" />
              Ruta validada
            </span>
          </div>
        </header>

        <form
          className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Identificador de expediente PDAC
            </span>
            <span className="flex min-h-16 items-center gap-3 rounded-md border-2 border-slate-300 bg-slate-50 px-4 transition focus-within:border-slate-900 focus-within:bg-white">
              <Search aria-hidden="true" className="h-6 w-6 shrink-0 text-slate-500" />
              <input
                autoComplete="off"
                autoFocus
                className="min-h-14 w-full bg-transparent font-mono text-xl font-black uppercase tracking-wide text-slate-950 outline-none placeholder:text-slate-400"
                inputMode="text"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="D1C86FD0-7263-46F8-B9F9-5F62C85E10C9"
                spellCheck={false}
                type="text"
                value={identifier}
              />
            </span>
          </label>

          {hasSubmitted && !isValidIdentifier ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              Identificador no valido. Use un UUID completo o un codigo alfanumerico de activo.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
              TARGET_ROUTE:{APP_ROUTES.activos.hvacProfileSearch}/[id]
            </p>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-900 px-5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!normalizedIdentifier}
              type="submit"
            >
              Abrir expediente PDAC
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
