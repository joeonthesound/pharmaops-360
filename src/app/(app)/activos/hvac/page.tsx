import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  ShieldCheck,
  Wind,
} from 'lucide-react';
import { getHvacDashboard } from '@/modules/activos/actions/get-hvac-dashboard';

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

function EquipmentMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-2 last:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold leading-5 text-slate-900">{value}</p>
    </div>
  );
}

export default async function HvacFleetDashboardPage() {
  const { assets, counters, healthScore } = await getHvacDashboard();
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

        <section className="grid gap-4 lg:grid-cols-3">
          {assets.map((asset) => (
            <article
              className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm"
              key={asset.uuid}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    {asset.asset_code}
                  </p>
                  <h2 className="mt-1 text-lg font-black leading-6 text-slate-950">
                    {asset.asset_name}
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${healthStatusClasses[asset.healthStatus]}`}
                >
                  {asset.healthStatus}
                </span>
              </div>

              <div className="py-3">
                <EquipmentMetaRow
                  label="Location"
                  value={asset.location_detail || 'Sin ubicacion registrada'}
                />
                <EquipmentMetaRow
                  label="Operational Asset Status"
                  value={asset.status || 'Sin estado registrado'}
                />
                <EquipmentMetaRow
                  label="Latest Maintenance Status"
                  value={asset.latestMaintenanceStatus || 'Sin registros'}
                />
                <EquipmentMetaRow
                  label="Maintenance Records"
                  value={String(asset.maintenanceCount)}
                />
              </div>

              <Link
                href={`/activos/hvac/ver/${asset.uuid}`}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
              >
                <Activity aria-hidden="true" size={17} />
                Consultar
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
