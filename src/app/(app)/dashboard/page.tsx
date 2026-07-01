import Link from 'next/link';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';
import { DashboardTabErrorBoundary } from './DashboardTabErrorBoundary';
import {
  normalizeView,
  tabs,
  type DashboardSearchParams,
  type DashboardView,
} from './dashboardTypes';
import { PendingOrdersTab } from './PendingOrdersTab';
import { RejectedOrdersTab } from './RejectedOrdersTab';
import { SentOrdersTab } from './SentOrdersTab';
import { TechnicalHistoryTab } from './TechnicalHistoryTab';

type DashboardPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

function renderActiveTab(currentView: DashboardView, searchParams: DashboardSearchParams) {
  if (currentView === 'sent') {
    return (
      <DashboardTabErrorBoundary title="Ordenes enviadas" view="sent">
        <SentOrdersTab />
      </DashboardTabErrorBoundary>
    );
  }

  if (currentView === 'rejected') {
    return (
      <DashboardTabErrorBoundary title="Ordenes rechazadas" view="rejected">
        <RejectedOrdersTab />
      </DashboardTabErrorBoundary>
    );
  }

  if (currentView === 'history') {
    return (
      <DashboardTabErrorBoundary title="Historial tecnico" view="history">
        <TechnicalHistoryTab searchParams={searchParams} />
      </DashboardTabErrorBoundary>
    );
  }

  return (
    <DashboardTabErrorBoundary title="Ordenes pendientes" view="pending">
      <PendingOrdersTab />
    </DashboardTabErrorBoundary>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log('[TELEMETRIA FORENSE F5]', {
      hasUser: !!user,
      userEmail: user?.email,
      authError: authError?.message || null,
      cookiesPresent: typeof window === 'undefined' ? 'Server Context Execution' : 'Client Context Mismatch'
  });

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentView = normalizeView(resolvedSearchParams.view);
  const orderCreated = resolvedSearchParams.order_created === '1';
  const createdRecordUuid = String(resolvedSearchParams.record ?? '');

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Piloto HVAC
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">Activos</h1>
            <p className="mt-1 text-sm text-slate-600">
              Flota registrada para mantenimiento preventivo e inspeccion tecnica.
            </p>
          </div>
          <button
            aria-label="Escanear codigo QR"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-xl shadow-sm"
            type="button"
          >
            QR
          </button>
        </header>

        <nav className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-4">
          {tabs.map((tab) => {
            const isActive = currentView === tab.value;

            return (
              <Link
                className={`flex min-h-11 items-center justify-center rounded-md px-3 text-center text-sm font-semibold transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
                href={`/dashboard?view=${tab.value}`}
                key={tab.value}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {orderCreated ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
            Orden de mantenimiento generada correctamente en Fase 1: Tecnico.
            {createdRecordUuid ? (
              <span className="ml-1 font-mono text-xs text-emerald-800">
                {createdRecordUuid}
              </span>
            ) : null}
          </div>
        ) : null}

        {renderActiveTab(currentView, resolvedSearchParams)}
      </section>
    </main>
  );
}
