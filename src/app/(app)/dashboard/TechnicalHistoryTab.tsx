import { LocalReloadCard } from './DashboardTabErrorBoundary';
import { fetchTechnicalHistoryOrders } from './dashboardData';
import {
  resolveRelatedAsset,
  type DashboardSearchParams,
} from './dashboardTypes';
import { EmptyTabState } from './EmptyTabState';
import { HistoryOrderCard } from './HistoryOrderCard';

type TechnicalHistoryTabProps = {
  searchParams: DashboardSearchParams;
};

export async function TechnicalHistoryTab({ searchParams }: TechnicalHistoryTabProps) {
  try {
    const historySearchTerm = String(searchParams.q ?? '');
    const selectedHistoryAsset = String(searchParams.asset ?? '');
    const showOnlyDeviations = searchParams.deviations === 'true';
    const showAgingSignatures = searchParams.aging === '72h';
    const selectedRiskLevel = searchParams.risk === 'high' ? 'high' : 'all';
    const { data: records, error, currentTechId } = await fetchTechnicalHistoryOrders();

    console.log('[TELEMETRIA HISTORIAL GxP] Fetch Execution:', {
        userId: currentTechId,
        recordsCount: records?.length || 0,
        foundStatuses: records?.map((r: any) => r.status) || [],
        timestamp: new Date().toISOString()
    });

    if (error) {
      return <LocalReloadCard title="Historial tecnico" view="history" />;
    }

    const historyOrders = records;
    const normalizedHistorySearchTerm = historySearchTerm.trim().toLowerCase();
    const filteredHistoryOrders = historyOrders.filter((registro) => {
      const activo = resolveRelatedAsset(registro);
      const matchesSearch =
        !normalizedHistorySearchTerm ||
        registro.uuid.toLowerCase() === normalizedHistorySearchTerm ||
        String(registro.uuid).toLowerCase().includes(normalizedHistorySearchTerm) ||
        String(registro.asset_code ?? '').toLowerCase().includes(normalizedHistorySearchTerm) ||
        String(activo?.asset_code ?? '').toLowerCase().includes(normalizedHistorySearchTerm);
      const matchesAsset =
        !selectedHistoryAsset ||
        (activo?.asset_code ?? registro.asset_code ?? '') === selectedHistoryAsset;

      return matchesSearch && matchesAsset;
    });
    const historyAssetOptions = Array.from(
      new Set(
        historyOrders
          .map((registro) => resolveRelatedAsset(registro)?.asset_code ?? registro.asset_code)
          .filter((assetCode): assetCode is string => Boolean(assetCode)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return (
      <div className="grid gap-4">
        <section
          aria-label="Filtros de historial tecnico"
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm"
        >
          <form className="grid gap-4" method="get">
            <input name="view" type="hidden" value="history" />
            <div className="grid gap-3 md:grid-cols-[1fr_190px_190px_auto]">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                <span>Codigo de Reporte / UUID</span>
                <input
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  defaultValue={historySearchTerm}
                  name="q"
                  placeholder="Buscar por Codigo de Reporte o UUID"
                  type="search"
                />
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                <span>Filtrar por Activo</span>
                <select
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  defaultValue={selectedHistoryAsset}
                  name="asset"
                >
                  <option value="">Todos los activos</option>
                  {historyAssetOptions.map((assetCode) => (
                    <option key={assetCode} value={assetCode}>
                      {assetCode}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                <span>Riesgo</span>
                <select
                  className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  defaultValue={selectedRiskLevel}
                  name="risk"
                >
                  <option value="all">Todos</option>
                  <option value="high">Alta Criticidad</option>
                </select>
              </label>

              <button
                className="flex h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 md:self-end"
                type="submit"
              >
                Aplicar
              </button>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-wrap gap-2">
                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${
                    showOnlyDeviations
                      ? 'border-transparent bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    className="sr-only"
                    defaultChecked={showOnlyDeviations}
                    name="deviations"
                    type="checkbox"
                    value="true"
                  />
                  <span aria-hidden="true">!</span>
                  <span>Ver solo Desviaciones (Fuera de Rango)</span>
                </label>

                <label
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${
                    showAgingSignatures
                      ? 'border-transparent bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <input
                    className="sr-only"
                    defaultChecked={showAgingSignatures}
                    name="aging"
                    type="checkbox"
                    value="72h"
                  />
                  <span aria-hidden="true">72h</span>
                  <span>Firmas Pendientes &gt; 72h</span>
                </label>
              </div>
            </div>
          </form>
        </section>

        {filteredHistoryOrders.length === 0 ? (
          <EmptyTabState />
        ) : (
          <section aria-label="Historial tecnico aprobado" className="grid gap-3">
            {filteredHistoryOrders.map((registro) => (
              <HistoryOrderCard key={registro.uuid} registro={registro} />
            ))}
          </section>
        )}
      </div>
    );
  } catch {
    return <LocalReloadCard title="Historial tecnico" view="history" />;
  }
}
