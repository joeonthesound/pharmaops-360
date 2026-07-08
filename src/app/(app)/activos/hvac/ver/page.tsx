'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Info, Search, ShieldCheck } from 'lucide-react';
import { APP_ROUTES } from '@/modules/common/routes';
import { supabase } from '@/shared/lib/supabase';

const VALID_ASSET_TAG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,31}$/;

type AssetLookupRow = {
  asset_code: string;
  uuid: string;
};

function normalizeAssetTag(value: string) {
  return value.trim().toUpperCase();
}

function isValidAssetTag(value: string) {
  return VALID_ASSET_TAG_PATTERN.test(value);
}

export default function ActivoHvacVerSearchPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const normalizedAssetTag = useMemo(() => normalizeAssetTag(identifier), [identifier]);
  const isValidIdentifier = isValidAssetTag(normalizedAssetTag);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setLookupError(null);

    if (!isValidIdentifier) {
      return;
    }

    setIsResolving(true);

    const { data, error } = await supabase
      .from('activos')
      .select('uuid, asset_code')
      .eq('asset_code', normalizedAssetTag)
      .maybeSingle();

    setIsResolving(false);

    if (error) {
      setLookupError('No fue posible consultar el expediente en Supabase.');
      return;
    }

    const asset = (data ?? null) as AssetLookupRow | null;

    if (!asset?.uuid) {
      setLookupError(`No existe un expediente PDAC activo para ${normalizedAssetTag}.`);
      return;
    }

    router.push(APP_ROUTES.activos.hvacProfile(asset.uuid));
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950">
      <section className="mx-auto grid w-full max-w-5xl gap-5">
        <div className="flex flex-wrap justify-end gap-2">
          <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md border border-slate-200 shadow-sm whitespace-nowrap">
            SCREEN_CODE: SCREEN-ACT-SRCH-01
          </span>
          <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md border border-slate-200 shadow-sm whitespace-nowrap">
            FORM_CODE: FOR-PDAC-SRCH
          </span>
        </div>

        <header className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                SCREEN-ACT-SRCH-01 / FOR-PDAC-SRCH
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950 md:text-3xl">
                Buscador de Perfiles Dinámicos de Activos Críticos{' '}
                <span className="relative inline-flex align-baseline">
                  <span
                    aria-describedby="pdac-tooltip"
                    className="group inline-flex cursor-help items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-slate-900 focus-within:ring-2 focus-within:ring-slate-400"
                    tabIndex={0}
                  >
                    <span>PDAC</span>
                    <Info aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span
                      className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-[min(520px,calc(100vw-3rem))] rounded-md border border-slate-700 bg-slate-950 p-4 text-left text-sm font-semibold leading-6 text-white shadow-xl group-hover:block group-focus:block group-focus-within:block"
                      id="pdac-tooltip"
                      role="tooltip"
                    >
                      Un PDAC (Perfil Dinámico de Activo Crítico) es el expediente digital
                      unificado que consolida la calibración, el estado de calificación GxP e
                      historial técnico de un activo. Para más información consulte el manual de
                      procedimientos.{' '}
                      <a
                        className="pointer-events-auto font-black text-emerald-300 underline decoration-emerald-300 underline-offset-4"
                        href="/docs/protocolos/pdac"
                      >
                        /docs/protocolos/pdac
                      </a>
                    </span>
                  </span>
                </span>
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                Terminal regulado para localizar perfiles dinamicos de activos criticos HVAC por
                codigo humano de activo, etiqueta fisica o lectura QR emulada.
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
                placeholder="HVAC-01"
                spellCheck={false}
                type="text"
                value={identifier}
              />
            </span>
          </label>

          {hasSubmitted && !isValidIdentifier ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              Codigo no valido. Use el Asset Tag fisico del equipo, por ejemplo HVAC-01.
            </div>
          ) : null}

          {lookupError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-900">
              {lookupError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
              LOOKUP:PUBLIC.ACTIVOS.ASSET_CODE -&gt; RUTA INTERNA
            </p>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-900 px-5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!normalizedAssetTag || isResolving}
              type="submit"
            >
              {isResolving ? 'Resolviendo expediente...' : 'Abrir expediente PDAC'}
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
