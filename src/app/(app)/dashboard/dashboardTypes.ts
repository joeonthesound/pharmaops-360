import type { Activo, ActivoEstado } from '@/modules/activos/activos.interface';

export type DashboardView = 'pending' | 'sent' | 'rejected' | 'history';

export type DashboardSearchParams = {
  asset?: string;
  aging?: string;
  deviations?: string;
  q?: string;
  risk?: string;
  order_created?: string;
  record?: string;
  view?: string;
};

export type ActivoConUuid = Activo & {
  uuid: string;
};

export type MaintenanceStatus =
  | 'DRAFT'
  | 'PENDING_TECHNICIAN'
  | 'PENDING_SUPERVISOR'
  | 'PENDING_QUALITY'
  | 'PENDING_MANAGEMENT'
  | 'RECHAZADO_TECNICO'
  | 'APPROVED'
  | 'approved'
  | 'Approved'
  | 'Completed'
  | 'Cerrado';

export type MantenimientoRegistro = {
  uuid: string;
  asset_code: string | null;
  status: MaintenanceStatus;
  executed_at: string | null;
  scheduled_date: string | null;
  quality_signed_at: string | null;
  rejection_comments?: string | null;
};

export type DashboardOrder = MantenimientoRegistro & {
  activos: ActivoConUuid | ActivoConUuid[] | null;
};

export const tabs: Array<{ label: string; value: DashboardView }> = [
  { label: 'Activos / Ordenes Pendientes', value: 'pending' },
  { label: 'Activos / Ordenes Enviados', value: 'sent' },
  { label: 'Activos / Ordenes Rechazados', value: 'rejected' },
  { label: 'Historial Tecnico', value: 'history' },
];

export const PENDING_STATUSES = ['DRAFT', 'PENDING_TECHNICIAN'] as const;

export const SENT_STATUSES = [
  'PENDING_SUPERVISOR',
  'PENDING_QUALITY',
  'PENDING_MANAGEMENT',
] as const;

export const REJECTED_STATUSES = ['RECHAZADO_TECNICO'] as const;

export const CLOSED_WORKFLOW_STATUSES = ['APPROVED'] as const;

export const estadoClasses: Record<ActivoEstado, string> = {
  Operativo: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'En mantenimiento': 'border-amber-200 bg-amber-50 text-amber-800',
  'Fuera de servicio': 'border-red-200 bg-red-50 text-red-800',
};

export const orderStatusClasses: Record<MaintenanceStatus, string> = {
  DRAFT: 'border-slate-200 bg-slate-100 text-slate-700',
  PENDING_TECHNICIAN: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  PENDING_SUPERVISOR: 'border-amber-200 bg-amber-50 text-amber-800',
  PENDING_QUALITY: 'border-sky-200 bg-sky-50 text-sky-800',
  PENDING_MANAGEMENT: 'border-purple-200 bg-purple-50 text-purple-800',
  RECHAZADO_TECNICO: 'border-red-200 bg-red-50 text-red-800',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Cerrado: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

export const orderStatusLabel: Record<MaintenanceStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_TECHNICIAN: 'Pendiente Tecnico',
  PENDING_SUPERVISOR: 'Pendiente Supervisor',
  PENDING_QUALITY: 'Pendiente Calidad',
  PENDING_MANAGEMENT: 'Pendiente Gerencia',
  RECHAZADO_TECNICO: 'Rechazado Tecnico',
  APPROVED: 'Aprobado',
  approved: 'Aprobado',
  Approved: 'Aprobado',
  Completed: 'Completado',
  Cerrado: 'Cerrado',
};

export function normalizeView(value: string | undefined): DashboardView {
  if (value === 'sent' || value === 'rejected' || value === 'history') {
    return value;
  }

  return 'pending';
}

export function formatLocation(activo: Activo | null | undefined) {
  if (!activo) {
    return 'Ubicacion no disponible';
  }

  return [activo.location_detail, activo.area].filter(Boolean).join(' / ') || activo.area;
}

export function calculateDaysRemaining(targetDate: string | null | undefined) {
  if (!targetDate) {
    return null;
  }

  const target = new Date(`${targetDate}T00:00:00`);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.ceil((target.getTime() - todayStart.getTime()) / millisecondsPerDay);
}

export function resolveRelatedAsset(registro: DashboardOrder) {
  if (Array.isArray(registro.activos)) {
    return registro.activos[0];
  }

  return registro.activos ?? undefined;
}

export function getOrderHref(registro: MantenimientoRegistro, activo?: ActivoConUuid) {
  if (CLOSED_WORKFLOW_STATUSES.includes(registro.status as (typeof CLOSED_WORKFLOW_STATUSES)[number])) {
    return `/mantenimiento/hvac/rui/ht/${registro.uuid}`;
  }

  if (SENT_STATUSES.includes(registro.status as (typeof SENT_STATUSES)[number])) {
    return `/mantenimiento/hvac/rui/enviado/${registro.uuid}`;
  }

  if (REJECTED_STATUSES.includes(registro.status as (typeof REJECTED_STATUSES)[number])) {
    return `/mantenimiento/hvac/rui/rechazado/${registro.uuid}`;
  }

  if (PENDING_STATUSES.includes(registro.status as (typeof PENDING_STATUSES)[number])) {
    return `/mantenimiento/hvac/rui/activo/${registro.uuid}`;
  }

  if (activo?.uuid) {
    return `/mantenimiento/hvac/rui/activo/${activo.uuid}`;
  }

  return '/dashboard';
}

export function getOrderActionLabel(status: MaintenanceStatus) {
  if (PENDING_STATUSES.includes(status as (typeof PENDING_STATUSES)[number])) {
    return 'Continuar Inspeccion';
  }

  if (SENT_STATUSES.includes(status as (typeof SENT_STATUSES)[number])) {
    return 'Consultar';
  }

  if (REJECTED_STATUSES.includes(status as (typeof REJECTED_STATUSES)[number])) {
    return 'Consultar';
  }

  if (CLOSED_WORKFLOW_STATUSES.includes(status as (typeof CLOSED_WORKFLOW_STATUSES)[number])) {
    return 'Ver Reporte';
  }

  return 'Revisar y Firmar';
}
