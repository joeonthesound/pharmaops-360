import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Download, Dna, Search, ShieldCheck } from 'lucide-react';
import { AuditLifecycleSheet } from '@/modules/mantenimiento/components/audit-lifecycle-sheet';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

type AuditoriaPageProps = {
  searchParams?: Promise<{
    id?: string;
    from?: string;
    to?: string;
  }>;
};

type UsuarioAuditor = {
  role: string | null;
  user_email: string | null;
};

type ActivoResumen = {
  asset_code: string | null;
  asset_name: string | null;
  area: string | null;
  location_detail: string | null;
};

type RuiAuditable = {
  id: number;
  uuid: string;
  record_code: string | null;
  asset_code: string | null;
  status: string | null;
  created_at: string | null;
  assigned_technician: string | null;
  executed_at: string | null;
  notes: string | null;
  supervisor_signed_by: string | null;
  supervisor_signed_at: string | null;
  quality_signed_by: string | null;
  quality_signed_at: string | null;
  management_signed_by: string | null;
  management_signed_at: string | null;
  activos?: ActivoResumen | ActivoResumen[] | null;
};

const CLOSED_STATUSES = ['approved', 'closed', 'APPROVED', 'CLOSED', 'PENDING_MANAGEMENT'];

function normalizeRole(role: string | null | undefined) {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isAuditorRole(role: string | null | undefined) {
  return normalizeRole(role) === 'auditor';
}

function normalizeSearchValue(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function resolveAsset(record: RuiAuditable) {
  if (Array.isArray(record.activos)) {
    return record.activos[0] ?? null;
  }

  return record.activos ?? null;
}

function formatUtcDate(value: string | null | undefined) {
  if (!value) {
    return 'Pendiente';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function resolveLastSignature(record: RuiAuditable) {
  if (record.management_signed_at || record.management_signed_by) {
    return 'Gerencia';
  }

  if (record.quality_signed_at || record.quality_signed_by) {
    return 'Calidad';
  }

  if (record.supervisor_signed_at || record.supervisor_signed_by) {
    return 'Supervisor';
  }

  return 'Tecnico';
}

function resolveStatusBadge(record: RuiAuditable) {
  const normalizedStatus = normalizeRole(record.status);
  const isClosed = Boolean(record.management_signed_at) || ['approved', 'closed'].includes(normalizedStatus);

  if (isClosed) {
    return {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      label: '🔐 REGISTRO CERRADO',
    };
  }

  return {
    className: 'border-slate-200 bg-slate-100 text-slate-700',
    label: record.status ?? 'PENDING_MANAGEMENT',
  };
}

function resolveCloseDate(record: RuiAuditable) {
  return record.management_signed_at ?? record.quality_signed_at ?? record.executed_at;
}

export default async function AuditoriaPage({ searchParams }: AuditoriaPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedUuid = normalizeSearchValue(resolvedSearchParams.id);
  const dateFrom = normalizeSearchValue(resolvedSearchParams.from);
  const dateTo = normalizeSearchValue(resolvedSearchParams.to);
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email?.trim().toLowerCase() ?? '';

  const { data: profileData } = userEmail
    ? await supabase
        .from('usuarios_roles')
        .select('user_email, role')
        .eq('user_email', userEmail)
        .eq('active', true)
        .maybeSingle()
    : { data: null };

  const auditorProfile = profileData as UsuarioAuditor | null;

  if (!auditorProfile || !isAuditorRole(auditorProfile.role)) {
    redirect('/dashboard');
  }

  let query = supabase
    .from('mantenimientos_registros')
    .select(
      'id, uuid, record_code, asset_code, status, created_at, assigned_technician, executed_at, notes, supervisor_signed_by, supervisor_signed_at, quality_signed_by, quality_signed_at, management_signed_by, management_signed_at, activos(asset_code, asset_name, area, location_detail)',
    )
    .in('status', CLOSED_STATUSES)
    .order('executed_at', { ascending: false })
    .limit(25);

  if (requestedUuid) {
    query = query.eq('uuid', requestedUuid);
  }

  if (dateFrom) {
    query = query.gte('executed_at', `${dateFrom}T00:00:00.000Z`);
  }

  if (dateTo) {
    query = query.lte('executed_at', `${dateTo}T23:59:59.999Z`);
  }

  const { data, error } = await query;
  const records = (data ?? []) as RuiAuditable[];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Nivel 5 - Rol Externo Auditor
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                Portal de Inspección y Muestreo Regulatorio GxP
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Interfaz read-only para muestreo de expedientes cerrados, ficha forense y copias
                controladas con marca de agua de auditoria.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              <ShieldCheck aria-hidden="true" size={18} />
              Solo lectura
            </span>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <form className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]" method="get">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              UUID del Registro Único e Inmutable (RUI)
              <span className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm font-normal text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  defaultValue={requestedUuid}
                  name="id"
                  placeholder="UUID del RUI"
                  type="text"
                />
              </span>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Desde ejecución
              <input
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                defaultValue={dateFrom}
                name="from"
                type="date"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Hasta ejecución
              <input
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                defaultValue={dateTo}
                name="to"
                type="date"
              />
            </label>

            <button
              className="mt-auto inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              type="submit"
            >
              🔍 Buscar Expediente Validado
            </button>
          </form>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            No fue posible consultar los expedientes cerrados para muestreo.
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Tabla de Expedientes Cerrados
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Código de Acta</th>
                  <th className="px-4 py-3">Activo Fijo</th>
                  <th className="px-4 py-3">Última Firma</th>
                  <th className="px-4 py-3">Fecha de Cierre (UTC)</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((record) => {
                  const asset = resolveAsset(record);
                  const badge = resolveStatusBadge(record);

                  return (
                    <tr className="align-top hover:bg-slate-50" key={record.uuid}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-950">
                          {record.record_code ?? 'Sin código'}
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-slate-500">
                          {record.uuid}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {record.asset_code ?? asset?.asset_code ?? 'N/A'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {asset?.asset_name ?? 'Activo no disponible'}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {resolveLastSignature(record)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {formatUtcDate(resolveCloseDate(record))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <AuditLifecycleSheet
                            assetMetadata={{
                              assetCode: record.asset_code ?? asset?.asset_code ?? null,
                              assetName: asset?.asset_name ?? 'Expediente HVAC',
                              locationArea: [asset?.location_detail, asset?.area]
                                .filter(Boolean)
                                .join(' / ') || null,
                            }}
                            currentStatus={record.status ?? ''}
                            fallbackRecord={record}
                            recordCode={record.record_code}
                            recordUuid={record.uuid}
                          />
                          <Link
                            aria-label="Descargar PDF Controlado"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                            href={`/api/mantenimiento/exportar-pdf?id=${record.uuid}`}
                            title="📥 Descargar PDF Controlado"
                          >
                            <Download aria-hidden="true" size={18} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <Dna aria-hidden="true" className="text-slate-400" size={34} />
              <p className="text-sm font-semibold text-slate-700">
                No hay expedientes cerrados que coincidan con el muestreo solicitado.
              </p>
              <p className="max-w-xl text-xs leading-5 text-slate-500">
                Ajuste el UUID o el rango de ejecución. Esta vista no permite crear, editar,
                eliminar ni reasignar registros.
              </p>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
