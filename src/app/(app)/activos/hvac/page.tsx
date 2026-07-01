import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Gauge,
  MapPin,
  ShieldCheck,
  Wrench,
  Wind,
} from 'lucide-react';
import { getHvacDashboard } from '@/modules/activos/actions/get-hvac-dashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type HvacDashboardData = Awaited<ReturnType<typeof getHvacDashboard>>;
type HvacDashboardAsset = HvacDashboardData['assets'][number];
type DisplayAsset = HvacDashboardAsset & {
  isPlaceholder?: boolean;
};

type CleanroomCard = {
  className: string;
  state: 'Normal' | 'Caution' | 'Alarm';
  pressure: string;
  ach: string;
  particles: string;
  tone: string;
};

type Notification = {
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  timestamp: string;
};

type HealthStatus = 'Healthy' | 'Attention' | 'Critical';

const MOCK_FALLBACK_ARRAY: DisplayAsset[] = [
  {
    uuid: 'd1c86fd0-7263-46f8-b9f9-5f62c85e10c9',
    asset_code: 'HVAC-01',
    asset_name: 'Air Handling Unit UMA-01',
    asset_type: 'Sistemas HVAC',
    area: 'hvac',
    site: 'Manufacturing Area',
    brand: 'Carrier',
    model: 'HEPA H14-F7',
    status: 'approved',
    location_detail: 'Manufacturing Plant 1',
    installation_date: '2026-01-15',
    last_maintenance_date: '2026-06-15',
    next_maintenance_date: '2026-07-15',
    healthStatus: 'Healthy',
    latestMaintenanceStatus: 'approved',
    latestMaintenanceDisplayLabel: 'Last Maintenance: Approved',
    latestMaintenanceTone: 'green',
    latestMaintenanceExecutedAt: '2026-06-15',
    latestMaintenanceScheduledDate: '2026-07-15',
    primaryFilterModel: 'HEPA H14-F7',
    deltaPStatus: 'Healthy',
    maintenanceCount: 4,
  },
  {
    uuid: 'f8d1026a-8998-4dfb-aecb-ac233edf1a63',
    asset_code: 'HVAC-02',
    asset_name: 'Air Handling Unit UMA-02',
    asset_type: 'Sistemas HVAC',
    area: 'hvac',
    site: 'Cleanroom Storage',
    brand: 'Trane',
    model: 'HEPA H14-F9',
    status: 'En revision',
    location_detail: 'Warehouse Cleanroom',
    installation_date: '2026-02-10',
    last_maintenance_date: '2026-06-10',
    next_maintenance_date: '2026-07-10',
    healthStatus: 'Attention',
    latestMaintenanceStatus: 'En revision',
    latestMaintenanceDisplayLabel: 'En Revisión',
    latestMaintenanceTone: 'amber',
    latestMaintenanceExecutedAt: '2026-06-10',
    latestMaintenanceScheduledDate: '2026-07-10',
    primaryFilterModel: 'HEPA H14-F9',
    deltaPStatus: 'Attention',
    maintenanceCount: 3,
  },
  {
    uuid: '9c5a4710-8168-4db8-a0bb-a3fd6771ce44',
    asset_code: 'HVAC-03',
    asset_name: 'Extractor e Inyector Ambiental',
    asset_type: 'Sistemas HVAC',
    area: 'hvac',
    site: 'Technical Roof',
    brand: 'York',
    model: 'Pre-Filtro G4',
    status: 'critical',
    location_detail: 'Techo Tecnico / Zona C',
    installation_date: '2026-03-04',
    last_maintenance_date: '2026-06-18',
    next_maintenance_date: '2026-07-18',
    healthStatus: 'Critical',
    latestMaintenanceStatus: 'critical',
    latestMaintenanceDisplayLabel: 'critical',
    latestMaintenanceTone: 'red',
    latestMaintenanceExecutedAt: '2026-06-18',
    latestMaintenanceScheduledDate: '2026-07-18',
    primaryFilterModel: 'Pre-Filtro G4',
    deltaPStatus: 'Critical',
    maintenanceCount: 2,
  },
  {
    uuid: '2b589979-6531-4eb6-8ba3-f705d61a9e41',
    asset_code: 'HVAC-04',
    asset_name: 'Unidad Manejadora de Aire UMA-04',
    asset_type: 'Sistemas HVAC',
    area: 'hvac',
    site: 'Sterile Filling',
    brand: 'Daikin',
    model: 'HEPA H14-F8',
    status: 'approved',
    location_detail: 'Llenado Esteril / Sala A',
    installation_date: '2026-01-22',
    last_maintenance_date: '2026-06-20',
    next_maintenance_date: '2026-07-20',
    healthStatus: 'Healthy',
    latestMaintenanceStatus: 'approved',
    latestMaintenanceDisplayLabel: 'Last Maintenance: Approved',
    latestMaintenanceTone: 'green',
    latestMaintenanceExecutedAt: '2026-06-20',
    latestMaintenanceScheduledDate: '2026-07-20',
    primaryFilterModel: 'HEPA H14-F8',
    deltaPStatus: 'Healthy',
    maintenanceCount: 5,
  },
  {
    uuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    asset_code: 'HVAC-05',
    asset_name: 'Air Handling Unit Solidos OSD-05',
    asset_type: 'Sistemas HVAC',
    area: 'hvac',
    site: 'OSD Production',
    brand: 'Lennox',
    model: 'HEPA H13-F7',
    status: 'approved',
    location_detail: 'Produccion Solidos / Granulacion',
    installation_date: '2026-02-04',
    last_maintenance_date: '2026-06-12',
    next_maintenance_date: '2026-07-12',
    healthStatus: 'Healthy',
    latestMaintenanceStatus: 'approved',
    latestMaintenanceDisplayLabel: 'Last Maintenance: Approved',
    latestMaintenanceTone: 'green',
    latestMaintenanceExecutedAt: '2026-06-12',
    latestMaintenanceScheduledDate: '2026-07-12',
    primaryFilterModel: 'HEPA H13-F7',
    deltaPStatus: 'Healthy',
    maintenanceCount: 4,
  },
  {
    uuid: '7a0a3fa0-09fa-4f9f-9da3-f1b0b3a71891',
    asset_code: 'HVAC-06',
    asset_name: 'Sistema de Extraccion Cabina Pesaje',
    asset_type: 'Sistemas HVAC',
    area: 'hvac',
    site: 'Dispensing',
    brand: 'Camfil',
    model: 'Bag Filter F9',
    status: 'En revision',
    location_detail: 'Pesaje Materia Prima / Cabina 2',
    installation_date: '2026-02-18',
    last_maintenance_date: '2026-06-16',
    next_maintenance_date: '2026-07-16',
    healthStatus: 'Attention',
    latestMaintenanceStatus: 'En revision',
    latestMaintenanceDisplayLabel: 'En Revisión',
    latestMaintenanceTone: 'amber',
    latestMaintenanceExecutedAt: '2026-06-16',
    latestMaintenanceScheduledDate: '2026-07-16',
    primaryFilterModel: 'Bag Filter F9',
    deltaPStatus: 'Attention',
    maintenanceCount: 3,
  },
  {
    uuid: '0f3d2e69-2fd2-4db2-bc8f-3a9f2602c101',
    asset_code: 'HVAC-07',
    asset_name: 'Chilled Water Air Handler CHW-07',
    asset_type: 'Sistemas HVAC',
    area: 'hvac',
    site: 'Utilities',
    brand: 'Johnson Controls',
    model: 'Coil Guard MERV 13',
    status: 'approved',
    location_detail: 'Cuarto de Utilidades / Chiller Loop',
    installation_date: '2026-03-01',
    last_maintenance_date: '2026-06-22',
    next_maintenance_date: '2026-07-22',
    healthStatus: 'Healthy',
    latestMaintenanceStatus: 'approved',
    latestMaintenanceDisplayLabel: 'Last Maintenance: Approved',
    latestMaintenanceTone: 'green',
    latestMaintenanceExecutedAt: '2026-06-22',
    latestMaintenanceScheduledDate: '2026-07-22',
    primaryFilterModel: 'Coil Guard MERV 13',
    deltaPStatus: 'Healthy',
    maintenanceCount: 4,
  },
  {
    uuid: '51b9e34b-9317-4322-a3f1-c91525d6b1a4',
    asset_code: 'HVAC-08',
    asset_name: 'Pressure Cascade Control Unit PCC-08',
    asset_type: 'Sistemas HVAC',
    area: 'hvac',
    site: 'Clean Corridor',
    brand: 'Siemens',
    model: 'DP Sensor Array',
    status: 'critical',
    location_detail: 'Corredor Clase B / Cascada Presion',
    installation_date: '2026-03-11',
    last_maintenance_date: '2026-06-19',
    next_maintenance_date: '2026-07-19',
    healthStatus: 'Critical',
    latestMaintenanceStatus: 'critical',
    latestMaintenanceDisplayLabel: 'critical',
    latestMaintenanceTone: 'red',
    latestMaintenanceExecutedAt: '2026-06-19',
    latestMaintenanceScheduledDate: '2026-07-19',
    primaryFilterModel: 'DP Sensor Array',
    deltaPStatus: 'Critical',
    maintenanceCount: 2,
  },
  {
    uuid: '8b6d49d7-96d2-4e0e-9698-69cc2a7f0615',
    asset_code: 'HVAC-09',
    asset_name: 'Return Air Filtration Module RAF-09',
    asset_type: 'Sistemas HVAC',
    area: 'hvac',
    site: 'Packaging',
    brand: 'AAF Flanders',
    model: 'HEPA H14 Return',
    status: 'approved',
    location_detail: 'Empaque Secundario / Retorno Aire',
    installation_date: '2026-03-20',
    last_maintenance_date: '2026-06-24',
    next_maintenance_date: '2026-07-24',
    healthStatus: 'Healthy',
    latestMaintenanceStatus: 'approved',
    latestMaintenanceDisplayLabel: 'Last Maintenance: Approved',
    latestMaintenanceTone: 'green',
    latestMaintenanceExecutedAt: '2026-06-24',
    latestMaintenanceScheduledDate: '2026-07-24',
    primaryFilterModel: 'HEPA H14 Return',
    deltaPStatus: 'Healthy',
    maintenanceCount: 4,
  },
];

const cleanroomClasses: CleanroomCard[] = [
  {
    className: 'Class A',
    state: 'Normal',
    pressure: '+18 Pa',
    ach: '72 ACH',
    particles: '214 / m3',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  {
    className: 'Class B',
    state: 'Caution',
    pressure: '+11 Pa',
    ach: '44 ACH',
    particles: '1,882 / m3',
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  {
    className: 'Class C',
    state: 'Alarm',
    pressure: '+4 Pa',
    ach: '18 ACH',
    particles: '18,420 / m3',
    tone: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  {
    className: 'Class D',
    state: 'Normal',
    pressure: '+9 Pa',
    ach: '22 ACH',
    particles: '52,110 / m3',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
];

const notifications: Notification[] = [
  {
    title: 'UMA-01 Filter Pressure Drop',
    description: 'Delta P trending above validated range in final HEPA stage.',
    severity: 'CRITICAL',
    timestamp: '8 min ago',
  },
  {
    title: 'AHU-07 Differential Pressure Deviation',
    description: 'Class B corridor below minimum cascade threshold.',
    severity: 'HIGH',
    timestamp: '22 min ago',
  },
  {
    title: 'HVAC-03 Coil Temperature Drift',
    description: 'Supply air temperature approaching upper warning limit.',
    severity: 'MEDIUM',
    timestamp: '41 min ago',
  },
  {
    title: 'UMA-04 Maintenance Window Due',
    description: 'Preventive maintenance due within next validated cycle.',
    severity: 'HIGH',
    timestamp: '1 h ago',
  },
];

const severityClasses: Record<Notification['severity'], string> = {
  CRITICAL: 'border-rose-200 bg-rose-50 text-rose-700',
  HIGH: 'border-orange-200 bg-orange-50 text-[#C76E00]',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
};

const healthStatusClasses: Record<HealthStatus, string> = {
  Healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Attention: 'bg-amber-50 text-amber-700 border-amber-200',
  Critical: 'bg-rose-50 text-rose-700 border-rose-200',
};

const deltaPClasses: Record<HealthStatus, string> = {
  Healthy: 'text-emerald-700',
  Attention: 'text-amber-700',
  Critical: 'text-rose-700',
};

const maintenanceToneClasses: Record<DisplayAsset['latestMaintenanceTone'], string> = {
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red: 'text-rose-700',
  slate: 'text-slate-600',
};

const gaugeRadius = 48;
const gaugeCircumference = 2 * Math.PI * gaugeRadius;

function MetricRow({ label, value, limit }: { label: string; value: string; limit: string }) {
  return (
    <div className="rounded-md border border-white/70 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="text-sm font-black text-slate-950">{value}</span>
      </div>
      <p className="mt-1 text-[11px] font-semibold text-slate-500">Limit: {limit}</p>
    </div>
  );
}

function EquipmentMetaRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[18px_1fr] gap-2 border-b border-slate-100 py-2.5 last:border-b-0">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
        <div className="mt-0.5 text-[13px] font-semibold leading-5 text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'No registrada';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatLocation({
  location_detail,
}: {
  location_detail: string | null;
}) {
  return location_detail || 'Sin ubicacion registrada';
}

function getOperationalStatusBadge(status: string | null) {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();

  if (normalizedStatus.includes('mantenimiento') || normalizedStatus.includes('revision')) {
    return {
      label: 'MANTENIMIENTO',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (
    normalizedStatus.includes('operativo') ||
    normalizedStatus.includes('active') ||
    normalizedStatus.includes('approved')
  ) {
    return {
      label: 'OPERATIVO',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }

  return {
    label: status?.trim().toUpperCase() || 'SIN ESTADO',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  };
}

function getDeltaPLabel(status: HealthStatus) {
  if (status === 'Healthy') {
    return 'Normal';
  }

  if (status === 'Attention') {
    return 'Attention';
  }

  return 'Critical';
}

function getMaintenanceStatusIcon(tone: DisplayAsset['latestMaintenanceTone']) {
  if (tone === 'green') {
    return '●';
  }

  if (tone === 'amber') {
    return '▲';
  }

  if (tone === 'red') {
    return '●';
  }

  return '○';
}

function getDisplayCounters(displayAssets: DisplayAsset[]) {
  return displayAssets.reduce(
    (acc, asset) => {
      acc.total += 1;

      if (asset.healthStatus === 'Healthy') {
        acc.healthy += 1;
      }

      if (asset.healthStatus === 'Attention') {
        acc.attention += 1;
      }

      if (asset.healthStatus === 'Critical') {
        acc.critical += 1;
      }

      return acc;
    },
    {
      total: 0,
      healthy: 0,
      attention: 0,
      critical: 0,
    },
  );
}

export default async function HvacFleetDashboardPage() {
  let dashboardData: HvacDashboardData | null = null;

  try {
    dashboardData = await getHvacDashboard();
  } catch (error) {
    console.error('[HVAC DASHBOARD] Error cargando datos productivos', error);
  }

  const data = dashboardData
    ? {
        ...dashboardData,
        activosRaw: dashboardData.assets,
      }
    : null;
  const realAssets: DisplayAsset[] = data?.activosRaw || [];
  const displayAssets = realAssets;
  const counters = getDisplayCounters(displayAssets);
  const healthScore = counters.total > 0 ? (counters.healthy / counters.total) * 100 : 0;
  const normalizedHealthScore = Math.min(Math.max(healthScore, 0), 100);
  const gaugeDashOffset =
    gaugeCircumference * (1 - normalizedHealthScore / 100);
  const dashboardCounters = [
    ['Total Assets', counters.total, 'bg-slate-100 text-slate-700 border-slate-200'],
    ['Healthy', counters.healthy, 'bg-emerald-50 text-emerald-700 border-emerald-200'],
    ['Attention', counters.attention, 'bg-amber-50 text-amber-700 border-amber-200'],
    ['Critical', counters.critical, 'bg-rose-50 text-rose-700 border-rose-200'],
  ] as const;

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 text-slate-950">
      <div className="mx-auto grid w-full max-w-7xl gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              PharmaOps 360 / HVAC Fleet
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-normal text-slate-950">
              Dashboard Operacion HVAC
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Estado ambiental, salud operativa y activos criticos bajo control GxP.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
            <ShieldCheck aria-hidden="true" size={16} />
            Sistema Validado
          </span>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cleanroomClasses.map((item) => (
            <article
              className={`rounded-lg border p-4 shadow-sm ${item.tone}`}
              key={item.className}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide opacity-80">
                    {item.className}
                  </p>
                  <h2 className="mt-1 text-lg font-black">{item.state}</h2>
                </div>
                <Wind aria-hidden="true" size={22} />
              </div>
              <div className="mt-4 grid gap-2">
                <MetricRow label="Differential Pressure" limit=">= +10 Pa" value={item.pressure} />
                <MetricRow label="ACH" limit=">= 20 changes/hour" value={item.ach} />
                <MetricRow label="HEPA >= 0.5 um" limit="ISO class target" value={item.particles} />
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <Gauge aria-hidden="true" className="text-slate-700" size={20} />
              <h2 className="text-base font-black text-slate-950">
                HVAC Fleet Health Score
              </h2>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
              <div className="relative mx-auto h-52 w-52">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    fill="none"
                    r={gaugeRadius}
                    stroke="#E2E8F0"
                    strokeWidth="12"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    fill="none"
                    r={gaugeRadius}
                    stroke="#10B981"
                    strokeDasharray={`${gaugeCircumference}`}
                    strokeDashoffset={`${gaugeDashOffset}`}
                    strokeLinecap="round"
                    strokeWidth="12"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-950">
                    {normalizedHealthScore.toFixed(1)}%
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Efficiency
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {dashboardCounters.map(([label, value, className]) => (
                  <div className={`rounded-lg border p-4 ${className}`} key={label}>
                    <p className="text-[11px] font-black uppercase tracking-wide">{label}</p>
                    <p className="mt-2 text-3xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <AlertTriangle aria-hidden="true" className="text-[#C76E00]" size={20} />
              <h2 className="text-base font-black text-slate-950">
                Active Critical Notifications
              </h2>
            </div>
            <div className="mt-4 grid gap-3">
              {notifications.map((notification) => (
                <div
                  className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                  key={notification.title}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">{notification.title}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                        {notification.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${severityClasses[notification.severity]}`}
                    >
                      {notification.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {notification.timestamp}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
          {displayAssets.length === 0 ? (
            <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 md:col-span-3">
              No hay activos HVAC registrados en la base de datos.
            </div>
          ) : null}

          {displayAssets.map((asset) => {
            const operationalStatus = getOperationalStatusBadge(asset.status);
            const deltaPLabel = getDeltaPLabel(asset.deltaPStatus);

            return (
              <article
                className="flex min-h-full flex-col rounded-lg border border-slate-100 bg-white px-4 py-3.5 shadow-sm"
                key={asset.uuid}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                      {asset.asset_code}
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-[15px] font-black leading-5 text-slate-950">
                      {asset.asset_name}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black tracking-wide ${operationalStatus.className}`}
                  >
                    {operationalStatus.label}
                  </span>
                </div>

                <div className="grid flex-1 py-2">
                  <EquipmentMetaRow
                    icon={<MapPin aria-hidden="true" size={14} />}
                    label="Location"
                    value={formatLocation(asset)}
                  />
                  <EquipmentMetaRow
                    icon={<CalendarDays aria-hidden="true" size={14} />}
                    label="Next Maintenance"
                    value={formatDate(asset.next_maintenance_date)}
                  />
                  <EquipmentMetaRow
                    icon={<Wrench aria-hidden="true" size={14} />}
                    label="Last Maintenance"
                    value={
                      <span
                        className={`inline-flex items-center gap-1.5 font-black ${maintenanceToneClasses[asset.latestMaintenanceTone]}`}
                      >
                        <span aria-hidden="true">
                          {getMaintenanceStatusIcon(asset.latestMaintenanceTone)}
                        </span>
                        {asset.latestMaintenanceDisplayLabel}
                      </span>
                    }
                  />
                  <EquipmentMetaRow
                    icon={<Wind aria-hidden="true" size={14} />}
                    label="Primary Filter Model & Delta P"
                    value={
                      <span>
                        {asset.primaryFilterModel || 'Filtro primario no registrado'}
                        <span className="px-1.5 text-slate-300">/</span>
                        Delta P:{' '}
                        <span className={`font-black ${deltaPClasses[asset.deltaPStatus]}`}>
                          {deltaPLabel}
                        </span>
                      </span>
                    }
                  />
                </div>

                <div className="mt-1 flex justify-end border-t border-slate-100 pt-3">
                  <Link
                    href={`/activos/hvac/ver/${asset.uuid}`}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
                  >
                    <Activity aria-hidden="true" size={15} />
                    Consultar
                    <ArrowRight aria-hidden="true" size={14} />
                  </Link>
                </div>
              </article>
            );
          })}

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 md:col-span-3">
            <button
              className="min-h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              type="button"
            >
              Anterior
            </button>
            <button
              className="min-h-8 rounded-md border border-slate-900 bg-slate-900 px-3 text-xs font-black text-white"
              type="button"
            >
              1
            </button>
            <button
              className="min-h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              type="button"
            >
              2
            </button>
            <button
              className="min-h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              type="button"
            >
              Siguiente
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
