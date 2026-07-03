import Link from 'next/link';

type AuditMetric = {
  label: string;
  value: string;
  detail: string;
  tone: string;
};

type AdminShortcut = {
  description: string;
  href: string;
  label: string;
};

type SecurityEvent = {
  id: string;
  message: string;
  severity: 'info' | 'success' | 'warning';
  timestamp: string;
};

const auditMetrics: AuditMetric[] = [
  {
    label: 'Sesiones firmadas activas',
    value: '42',
    detail: 'Usuarios con contexto Part 11 validado',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  },
  {
    label: 'Salud de backup GxP',
    value: '99.8%',
    detail: 'Uptime operativo de replicacion y respaldo',
    tone: 'border-indigo-200 bg-indigo-50 text-indigo-950',
  },
  {
    label: 'Logs pendientes de validacion',
    value: '18',
    detail: 'Eventos esperando revision administrativa',
    tone: 'border-amber-200 bg-amber-50 text-amber-950',
  },
];

const adminShortcuts: AdminShortcut[] = [
  {
    label: 'User Configuration',
    href: '/admin/usuarios',
    description: 'Gestion de perfiles, roles, capacidades y estado activo.',
  },
  {
    label: 'Security Key Signatures',
    href: '/admin/user',
    description: 'Hub de perfiles regulados y licencias de firma electronica.',
  },
  {
    label: 'Storage Buckets',
    href: '/auditoria',
    description: 'Revision de evidencia, copias controladas y anexos regulados.',
  },
  {
    label: 'Calibration Standards',
    href: '/mantenimiento/plantillas',
    description: 'Plantillas, criterios y parametros maestros de ejecucion.',
  },
];

const securityEvents: SecurityEvent[] = [
  {
    id: 'SEC-2026-0714-001',
    timestamp: '02:14 UTC',
    message: 'Backup verificado automaticamente en replica regulada.',
    severity: 'success',
  },
  {
    id: 'SEC-2026-0714-002',
    timestamp: '01:45 UTC',
    message: 'Intento de doble firma mitigado exitosamente.',
    severity: 'warning',
  },
  {
    id: 'SEC-2026-0714-003',
    timestamp: '01:12 UTC',
    message: 'Token de sesion renovado con contexto de rol administrativo.',
    severity: 'info',
  },
  {
    id: 'SEC-2026-0714-004',
    timestamp: '00:37 UTC',
    message: 'Politica de evidencia fotografica validada contra bucket activo.',
    severity: 'success',
  },
];

function resolveEventClass(severity: SecurityEvent['severity']) {
  if (severity === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-950';
  }

  if (severity === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-950';
  }

  return 'border-slate-200 bg-slate-50 text-slate-950';
}

export default function AdminPortalPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto grid w-full max-w-7xl gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Administracion y Seguridad
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-normal">
            Operational Governance Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700">
            Vista maestra para auditoria de plataforma, rutas administrativas y senales de
            seguridad operacional en PharmaOps 360.
          </p>
        </header>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
              Platform Auditing Status
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {auditMetrics.map((metric) => (
                <article className={`rounded-lg border p-4 ${metric.tone}`} key={metric.label}>
                  <p className="text-xs font-black uppercase tracking-wide opacity-75">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-3xl font-black tracking-normal">{metric.value}</p>
                  <p className="mt-2 text-sm font-semibold leading-5 opacity-80">{metric.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
              Cross-Module Shortcuts
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {adminShortcuts.map((shortcut) => (
                <Link
                  className="min-h-32 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  href={shortcut.href}
                  key={shortcut.label}
                >
                  <p className="text-sm font-black text-slate-950">{shortcut.label}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                    {shortcut.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
            Global Security Incident Feed
          </h2>
          <div className="mt-4 grid gap-3">
            {securityEvents.map((event) => (
              <article
                className={`grid gap-2 rounded-lg border p-4 md:grid-cols-[140px_1fr_auto] md:items-center ${resolveEventClass(
                  event.severity,
                )}`}
                key={event.id}
              >
                <p className="font-mono text-sm font-black">{event.timestamp}</p>
                <p className="text-sm font-semibold leading-6">{event.message}</p>
                <p className="font-mono text-xs font-bold uppercase opacity-70">{event.id}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
