'use client';

import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  ShieldCheck,
  Wind,
} from 'lucide-react';

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

type Equipment = {
  code: string;
  name: string;
  status: 'OPERATIVO' | 'MANTENIMIENTO';
  location: string;
  calibration: string;
  maintenance: string;
  filter: string;
};

const assetProfileUuid = 'd1c86fd0-7263-46f8-b9f9-5f62c85e10c9';

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

const equipmentList: Equipment[] = [
  {
    code: 'HVAC-01',
    name: 'Air Handling Unit UMA-01',
    status: 'OPERATIVO',
    location: 'Area Blanca / Produccion',
    calibration: 'Last: 2026-06-15 / Due: 2026-09-15',
    maintenance: 'Last: 2026-06-15 / Next: 2026-07-15',
    filter: 'HEPA H14-F7 / Delta P: Normal',
  },
  {
    code: 'HVAC-02',
    name: 'Air Handling Unit UMA-02',
    status: 'MANTENIMIENTO',
    location: 'Produccion Solidos / Zona B',
    calibration: 'Last: 2026-05-28 / Due: 2026-08-28',
    maintenance: 'Last: 2026-06-10 / Next: 2026-07-10',
    filter: 'HEPA H14-F9 / Delta P: Attention',
  },
  {
    code: 'HVAC-03',
    name: 'Extractor e Inyector Ambiental',
    status: 'OPERATIVO',
    location: 'Techo Tecnico / Zona C',
    calibration: 'Last: 2026-06-02 / Due: 2026-09-02',
    maintenance: 'Last: 2026-06-18 / Next: 2026-07-18',
    filter: 'Pre-Filtro G4 / Delta P: Normal',
  },
];

const severityClasses: Record<Notification['severity'], string> = {
  CRITICAL: 'border-rose-200 bg-rose-50 text-rose-700',
  HIGH: 'border-orange-200 bg-orange-50 text-[#C76E00]',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
};

const statusClasses: Record<Equipment['status'], string> = {
  OPERATIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MANTENIMIENTO: 'bg-amber-50 text-amber-700 border-amber-200',
};

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

export default function HvacFleetDashboardPage() {
  const router = useRouter();

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
                    r="48"
                    stroke="#E2E8F0"
                    strokeWidth="12"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    fill="none"
                    r="48"
                    stroke="#10B981"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    strokeDashoffset={`${2 * Math.PI * 48 * (1 - 0.941)}`}
                    strokeLinecap="round"
                    strokeWidth="12"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-950">94.1%</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Efficiency
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Total Assets', '28', 'bg-slate-100 text-slate-700 border-slate-200'],
                  ['Healthy', '21', 'bg-emerald-50 text-emerald-700 border-emerald-200'],
                  ['Attention', '5', 'bg-amber-50 text-amber-700 border-amber-200'],
                  ['Critical', '2', 'bg-rose-50 text-rose-700 border-rose-200'],
                ].map(([label, value, className]) => (
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
          {equipmentList.map((equipment) => (
            <article
              className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm"
              key={equipment.code}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                    {equipment.code}
                  </p>
                  <h2 className="mt-1 text-lg font-black leading-6 text-slate-950">
                    {equipment.name}
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClasses[equipment.status]}`}
                >
                  {equipment.status}
                </span>
              </div>

              <div className="py-3">
                <EquipmentMetaRow label="Location" value={equipment.location} />
                <EquipmentMetaRow label="Last Calibration / Due Date" value={equipment.calibration} />
                <EquipmentMetaRow label="Last Maintenance / Next Maintenance" value={equipment.maintenance} />
                <EquipmentMetaRow label="Primary Filter Model & Delta P" value={equipment.filter} />
              </div>

              <button
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-black text-slate-900 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                onClick={() => router.push(`/activos/hvac/ver/${assetProfileUuid}`)}
                type="button"
              >
                <Activity aria-hidden="true" size={17} />
                Consultar
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
