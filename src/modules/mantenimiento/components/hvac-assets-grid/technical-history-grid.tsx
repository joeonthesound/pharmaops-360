'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Activo } from '@/modules/activos/activos.interface';
import { EmptyTabState } from './empty-tab-state';

type ActivoConUuid = Activo & {
  uuid: string;
};

type HistoryStatus =
  | 'draft'
  | 'pending_technician'
  | 'pending_supervisor'
  | 'pending_quality'
  | 'pending_management'
  | 'rejected'
  | 'approved'
  | 'DRAFT'
  | 'PENDING_TECHNICIAN'
  | 'PENDING_SUPERVISOR'
  | 'PENDING_QUALITY'
  | 'PENDING_MANAGEMENT'
  | 'RECHAZADO_TECNICO'
  | 'APPROVED'
  | 'CLOSED'
  | 'VALIDATED'
  | 'closed'
  | 'validated';

type HistoryOrder = {
  uuid: string;
  record_code?: string | null;
  asset_code: string | null;
  status: HistoryStatus;
  created_at?: string | null;
  executed_at: string | null;
  scheduled_date: string | null;
  quality_signed_at: string | null;
  management_signed_at?: string | null;
  rejection_comments?: string | null;
  activos: ActivoConUuid | ActivoConUuid[] | null;
};

type TechnicalHistoryGridProps = {
  initialSearchTerm: string;
  orders: HistoryOrder[];
  roleScope?: 'management' | 'quality' | 'supervisor' | 'technician';
};

const PAGE_SIZE = 10;

const TERMINAL_STATUSES = [
  'APPROVED',
  'CLOSED',
  'VALIDATED',
  'approved',
  'closed',
  'validated',
] as const satisfies ReadonlyArray<HistoryStatus>;

const orderStatusClasses: Record<HistoryStatus, string> = {
  draft: 'border-slate-200 bg-slate-100 text-slate-700',
  pending_technician: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  pending_supervisor: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_quality: 'border-sky-200 bg-sky-50 text-sky-800',
  pending_management: 'border-purple-200 bg-purple-50 text-purple-800',
  rejected: 'border-red-200 bg-red-50 text-red-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  DRAFT: 'border-slate-200 bg-slate-100 text-slate-700',
  PENDING_TECHNICIAN: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  PENDING_SUPERVISOR: 'border-amber-200 bg-amber-50 text-amber-800',
  PENDING_QUALITY: 'border-sky-200 bg-sky-50 text-sky-800',
  PENDING_MANAGEMENT: 'border-purple-200 bg-purple-50 text-purple-800',
  RECHAZADO_TECNICO: 'border-red-200 bg-red-50 text-red-800',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CLOSED: 'border-emerald-900/30 bg-emerald-950 text-white',
  VALIDATED: 'border-emerald-900/30 bg-emerald-950 text-white',
  closed: 'border-emerald-900/30 bg-emerald-950 text-white',
  validated: 'border-emerald-900/30 bg-emerald-950 text-white',
};

const orderStatusLabel: Record<HistoryStatus, string> = {
  draft: 'Borrador',
  pending_technician: 'Pendiente Tecnico',
  pending_supervisor: 'Pendiente Supervisor',
  pending_quality: 'Pendiente Calidad',
  pending_management: 'Pendiente Gerencia',
  rejected: 'Rechazado',
  approved: 'Cerrado',
  DRAFT: 'Borrador',
  PENDING_TECHNICIAN: 'Pendiente Tecnico',
  PENDING_SUPERVISOR: 'Pendiente Supervisor',
  PENDING_QUALITY: 'Pendiente Calidad',
  PENDING_MANAGEMENT: 'Pendiente Gerencia',
  RECHAZADO_TECNICO: 'Rechazado',
  APPROVED: 'Cerrado',
  CLOSED: 'REGISTRO CERRADO',
  VALIDATED: 'REGISTRO VALIDADO',
  closed: 'REGISTRO CERRADO',
  validated: 'REGISTRO VALIDADO',
};

function resolveRelatedAsset(registro: HistoryOrder) {
  if (Array.isArray(registro.activos)) {
    return registro.activos[0];
  }

  return registro.activos ?? undefined;
}

function formatLocation(activo?: ActivoConUuid) {
  if (!activo) {
    return 'Ubicacion no disponible';
  }

  return [activo.location_detail, activo.area].filter(Boolean).join(' / ');
}

function resolveSortableDate(registro: HistoryOrder) {
  const dateValue = registro.created_at ?? registro.executed_at ?? registro.scheduled_date;
  const timestamp = dateValue ? new Date(dateValue).getTime() : 0;

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isTerminalStatus(status: HistoryStatus) {
  return TERMINAL_STATUSES.includes(status as (typeof TERMINAL_STATUSES)[number]);
}

function isManagementSigned(registro: HistoryOrder) {
  return Boolean(registro.management_signed_at) || isTerminalStatus(registro.status);
}

function resolveDisplayStatusClass(registro: HistoryOrder) {
  if (isManagementSigned(registro)) {
    return 'border-emerald-700 bg-emerald-600 text-white shadow-sm';
  }

  return orderStatusClasses[registro.status];
}

function resolveDisplayStatusLabel(registro: HistoryOrder) {
  if (isManagementSigned(registro)) {
    return 'REGISTRO CERRADO';
  }

  return orderStatusLabel[registro.status];
}

export function TechnicalHistoryGrid({
  initialSearchTerm,
  orders,
  roleScope = 'management',
}: TechnicalHistoryGridProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [sortMode, setSortMode] = useState<'date_desc' | 'asset_asc'>('date_desc');
  const [page, setPage] = useState(1);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders
      .filter((registro) => {
        const activo = resolveRelatedAsset(registro);
        const recordCode = registro.record_code || 'SIN_CODIGO';
        const searchableValues = [
          recordCode,
          registro.uuid,
          registro.asset_code,
          activo?.asset_code,
          activo?.asset_name,
        ];

        return (
          !normalizedSearch ||
          searchableValues.some((value) =>
            String(value ?? '').toLowerCase().includes(normalizedSearch),
          )
        );
      })
      .sort((left, right) => {
        if (sortMode === 'asset_asc') {
          const leftAsset = resolveRelatedAsset(left)?.asset_code ?? left.asset_code ?? '';
          const rightAsset = resolveRelatedAsset(right)?.asset_code ?? right.asset_code ?? '';

          return leftAsset.localeCompare(rightAsset);
        }

        return resolveSortableDate(right) - resolveSortableDate(left);
      });
  }, [orders, searchTerm, sortMode]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);
  const displayStart = filteredOrders.length === 0 ? 0 : startIndex + 1;
  const displayEnd = Math.min(startIndex + paginatedOrders.length, filteredOrders.length);

  return (
    <section className="grid gap-4" aria-label="Historial tecnico aprobado">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
            <span>Busqueda integral GxP</span>
            <input
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por Codigo de Reporte, UUID o Nombre de Activo..."
              type="search"
              value={searchTerm}
            />
          </label>

          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-600">
            <span>Ordenamiento</span>
            <select
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              onChange={(event) => setSortMode(event.target.value as 'date_desc' | 'asset_asc')}
              value={sortMode}
            >
              <option value="date_desc">Ordenar por Fecha (mas recientes primero)</option>
              <option value="asset_asc">Ordenar por Nombre de Activo (A-Z)</option>
            </select>
          </label>
        </div>
      </div>

      {paginatedOrders.length === 0 ? (
        <EmptyTabState
          description={
            roleScope === 'technician' && orders.length === 0
              ? 'No hay registros de mantenimiento asignados o creados bajo este perfil operativo.'
              : 'Ajusta la busqueda integral GxP o el ordenamiento para revisar otros registros aprobados.'
          }
          title={
            roleScope === 'technician' && orders.length === 0
              ? 'No hay historial tecnico asignado'
              : 'No hay registros que coincidan con los filtros aplicados'
          }
        />
      ) : (
        <div className="grid gap-3">
          {paginatedOrders.map((registro) => {
            const activo = resolveRelatedAsset(registro);
            const displayAssetCode =
              activo?.asset_code ?? registro.asset_code ?? 'Activo no disponible';
            const displayAssetName = activo?.asset_name ?? 'Orden de mantenimiento aprobada';
            const displayLocation = formatLocation(activo);
            const actionHref = `/mantenimiento/hvac/rui/ht/${registro.uuid}`;

            return (
              <article
                className="grid gap-3 rounded-lg border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-4 shadow-sm md:grid-cols-[1.1fr_1fr_auto] md:items-center"
                key={registro.uuid}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold tracking-normal text-slate-950">
                      {displayAssetCode}
                    </p>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${resolveDisplayStatusClass(registro)}`}
                    >
                      {resolveDisplayStatusLabel(registro)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                    {displayAssetName}
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">
                    Record Code: {registro.record_code || 'SIN_CODIGO'}
                  </p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">
                    UUID: {registro.uuid}
                  </p>
                </div>

                <div className="grid gap-1 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{displayLocation}</span>
                  <span className="text-xs font-medium text-slate-500">
                    Fecha de ejecucion: {registro.executed_at ?? 'No registrada'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Firma Calidad: {registro.quality_signed_at ?? 'No registrada'}
                  </span>
                </div>

                <Link
                  className="flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  href={actionHref}
                >
                  Ver Reporte Inmutable
                </Link>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          Mostrando {displayStart}-{displayEnd} de {filteredOrders.length} registros
        </span>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={safePage === 1}
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            type="button"
          >
            Anterior
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={safePage >= totalPages}
            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  );
}
