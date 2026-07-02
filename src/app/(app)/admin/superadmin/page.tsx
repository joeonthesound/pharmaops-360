'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileArchive,
  ImagePlus,
  KeyRound,
  Lock,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';

type PreFlightStatus = 'active' | 'matched' | 'warning' | 'checking';

type PreFlightCheck = {
  id: string;
  title: string;
  detail: string;
  status: PreFlightStatus;
};

type DatabaseTool = {
  title: string;
  description: string;
  helperText?: string;
  severity: 'danger' | 'neutral';
  icon: typeof Database;
};

type ConfirmationDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  severity: 'danger' | 'neutral';
} | null;

const preFlightChecks: PreFlightCheck[] = [
  {
    id: 'rls',
    title: 'Politicas de Seguridad a Nivel de Fila (RLS)',
    detail: 'Activas en tablas operativas y perfiles con segregacion de funciones.',
    status: 'active',
  },
  {
    id: 'enums',
    title: 'Esquema de Restricciones del Flujo (Enums Check)',
    detail: "Coincide con 'mantenimientos_registros_status_check'.",
    status: 'matched',
  },
  {
    id: 'historical-signatures',
    title: 'Integridad de Firmas Historicas',
    detail:
      'Advertencia: si un RUI cerrado no posee fila de auditoria, requiere reconciliacion hibrida.',
    status: 'warning',
  },
  {
    id: 'evidence-storage',
    title: 'Conexion de Almacenamiento de Evidencias',
    detail: 'Verificando conectividad con Supabase Buckets para evidencia regulada.',
    status: 'checking',
  },
];

const databaseTools: DatabaseTool[] = [
  {
    title: 'Resetear Esquemas de Base de Datos',
    description: 'Operacion destructiva bloqueada por confirmacion explicita.',
    severity: 'danger',
    icon: RotateCcw,
  },
  {
    title: 'Exportar Respaldo Estructurado',
    description: 'Genera un paquete trazable para custodia tecnica.',
    severity: 'neutral',
    icon: FileArchive,
  },
  {
    title: 'Importar Backup GxP',
    description: 'Restaura datos con control de procedencia y validacion previa.',
    severity: 'neutral',
    icon: Upload,
  },
  {
    title: '📥 Descargar Plantilla de Migracion de Datos Cualificada',
    description: 'Layout calificado para transferencia regulada de datos maestros.',
    helperText:
      'Descarga el layout estandarizado internacionalmente para la carga masiva y estructurada de registros, activos y comentarios GxP listos para migracion.',
    severity: 'neutral',
    icon: Download,
  },
];

const serverLogStream = [
  {
    level: 'WARN',
    message: 'Supabase bucket evidencias-gxp respondio con latencia elevada: 842 ms.',
    time: '18:42:10',
  },
  {
    level: 'ERROR',
    message: 'Timeout transitorio en action validar-firma-historica. Reintento seguro aplicado.',
    time: '18:39:04',
  },
  {
    level: 'INFO',
    message: 'public.audit_trail listo para muestreo forense de cambios de identidad.',
    time: '18:35:27',
  },
];

function getCheckStyles(status: PreFlightStatus) {
  if (status === 'warning') {
    return {
      card: 'border-amber-200 bg-amber-50',
      icon: 'bg-amber-100 text-amber-700',
      label: 'Advertencia',
      labelClass: 'text-amber-800',
    };
  }

  if (status === 'checking') {
    return {
      card: 'border-slate-200 bg-white',
      icon: 'bg-slate-100 text-slate-700',
      label: 'Verificando',
      labelClass: 'text-slate-700',
    };
  }

  return {
    card: 'border-emerald-200 bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-700',
    label: status === 'matched' ? 'Coincide' : 'Activo',
    labelClass: 'text-emerald-800',
  };
}

function ConfirmationDialog({
  dialog,
  onClose,
}: {
  dialog: ConfirmationDialogState;
  onClose: () => void;
}) {
  if (!dialog) {
    return null;
  }

  const confirmClass =
    dialog.severity === 'danger'
      ? 'bg-red-700 text-white hover:bg-red-800 focus:ring-red-200'
      : 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <section
        aria-modal="true"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Confirmacion requerida
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{dialog.title}</h2>
          </div>
          <button
            aria-label="Cerrar dialogo"
            className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{dialog.description}</p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className={`h-10 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 ${confirmClass}`}
            onClick={onClose}
            type="button"
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const [debugLogsEnabled, setDebugLogsEnabled] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [gxpJustification, setGxpJustification] = useState('');
  const [dialog, setDialog] = useState<ConfirmationDialogState>(null);

  const justificationReady = gxpJustification.trim().length >= 12;

  const telemetryState = useMemo(
    () =>
      debugLogsEnabled
        ? 'Telemetria tecnica habilitada para diagnostico supervisado.'
        : 'Telemetria silenciada: servidor y browser devtools quedan sin emision operativa.',
    [debugLogsEnabled],
  );

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setLogoPreview(null);
      return;
    }

    setLogoPreview(URL.createObjectURL(file));
  }

  function openDatabaseToolDialog(tool: DatabaseTool) {
    setDialog({
      title: tool.title,
      description:
        'Esta accion queda retenida por control D10S. Debe ejecutarse bajo ventana aprobada, evidencia de cambio y revision posterior en public.audit_trail.',
      confirmLabel: tool.severity === 'danger' ? 'Confirmar bajo supervision' : 'Autorizar ejecucion',
      severity: tool.severity,
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Nivel 1 - SuperAdmin D10S
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal">
                Centro de Control SuperAdmin
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Panel de pre-vuelo, interruptores maestros e identidad supervisada para operaciones
                GxP de alta integridad bajo FDA 21 CFR Part 11 y ALCOA+.
              </p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              public.audit_trail activo
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-5">
          <section className="grid gap-5 xl:col-span-3">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pre-flight automatizado
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Checklist SuperAdmin</h2>
                </div>
                <ShieldCheck aria-hidden="true" className="text-emerald-700" size={24} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {preFlightChecks.map((check) => {
                  const styles = getCheckStyles(check.status);

                  return (
                    <article
                      className={`rounded-lg border p-4 ${styles.card}`}
                      key={check.id}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${styles.icon}`}
                        >
                          {check.status === 'warning' ? (
                            <AlertTriangle aria-hidden="true" size={20} />
                          ) : (
                            <CheckCircle2 aria-hidden="true" size={20} />
                          )}
                        </span>
                        <div>
                          <p className={`text-xs font-bold uppercase ${styles.labelClass}`}>
                            {styles.label}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold text-slate-950">
                            {check.title}
                          </h3>
                          <p className="mt-2 text-sm leading-5 text-slate-600">{check.detail}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cabin infrastructure
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Interruptores Maestros</h2>
                  <p className="mt-1 text-sm text-slate-600">{telemetryState}</p>
                </div>
                <button
                  aria-pressed={debugLogsEnabled}
                  className={`flex h-11 min-w-44 items-center justify-between gap-3 rounded-full border px-2 pl-4 text-sm font-semibold transition ${
                    debugLogsEnabled
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-300 bg-slate-100 text-slate-700'
                  }`}
                  onClick={() => setDebugLogsEnabled((current) => !current)}
                  type="button"
                >
                  <span>Debug {debugLogsEnabled ? 'ON' : 'OFF'}</span>
                  <span
                    className={`h-8 w-8 rounded-full transition ${
                      debugLogsEnabled ? 'bg-emerald-600' : 'bg-slate-400'
                    }`}
                  />
                </button>
              </div>
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Flag vinculado: <span className="font-mono text-slate-950">ENABLE_SUPERADMIN_DEBUG_LOGS</span>.
                Al apagarlo, los logs del servidor y la telemetria visible en devtools quedan en
                silencio operativo.
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Herramientas de base de datos
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">Acciones retenidas</h2>
                  </div>
                  <Database aria-hidden="true" className="text-slate-700" size={22} />
                </div>
                <div className="mt-4 grid gap-3">
                  {databaseTools.map((tool) => {
                    const Icon = tool.icon;

                    return (
                      <button
                        className={`flex items-start gap-3 rounded-md border p-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 ${
                          tool.severity === 'danger'
                            ? 'border-red-200 focus:ring-red-100'
                            : 'border-slate-200 focus:ring-slate-200'
                        }`}
                        key={tool.title}
                        onClick={() => openDatabaseToolDialog(tool)}
                        type="button"
                      >
                        <Icon
                          aria-hidden="true"
                          className={tool.severity === 'danger' ? 'text-red-700' : 'text-slate-700'}
                          size={20}
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-950">
                            {tool.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-600">
                            {tool.description}
                          </span>
                          {tool.helperText ? (
                            <span className="mt-2 block rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-xs leading-5 text-emerald-900">
                              {tool.helperText}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  White-label
                </p>
                <h2 className="mt-1 text-lg font-semibold">Logotipo Corporativo de la Planta</h2>
                <label className="mt-4 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:bg-slate-100">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="Vista previa del logotipo corporativo"
                      className="max-h-24 max-w-full rounded-md object-contain"
                      src={logoPreview}
                    />
                  ) : (
                    <>
                      <ImagePlus aria-hidden="true" className="text-slate-500" size={28} />
                      <span className="mt-2 text-sm font-semibold text-slate-900">
                        Subir identidad visual
                      </span>
                    </>
                  )}
                  <span className="mt-2 text-xs leading-5 text-slate-600">
                    Actualiza la previsualizacion y prepara meta-tags institucionales del cliente.
                  </span>
                  <input
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleLogoChange}
                    type="file"
                  />
                </label>
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                  <p className="font-semibold text-slate-900">
                    Formatos aceptados: .png, .jpg, .webp (Fondo transparente recomendado para el
                    Sidebar)
                  </p>
                  <p className="mt-1">
                    Tamano requerido: Maximo de 2MB. Dimensiones optimizadas de 240px x 60px para
                    preservar la simetria del menu corporativo.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Error log viewer
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Stream de excepciones</h2>
                </div>
                <Lock aria-hidden="true" className="text-slate-500" size={20} />
              </div>
              <div className="mt-4 grid gap-2">
                {serverLogStream.map((entry) => (
                  <div
                    className="grid gap-2 rounded-md border border-slate-200 bg-slate-950 px-3 py-2 text-xs text-slate-100 md:grid-cols-[72px_64px_1fr]"
                    key={`${entry.time}-${entry.message}`}
                  >
                    <span className="font-mono text-slate-400">{entry.time}</span>
                    <span
                      className={
                        entry.level === 'ERROR'
                          ? 'font-bold text-red-300'
                          : entry.level === 'WARN'
                            ? 'font-bold text-amber-300'
                            : 'font-bold text-emerald-300'
                      }
                    >
                      {entry.level}
                    </span>
                    <span>{entry.message}</span>
                  </div>
                ))}
              </div>
            </section>
          </section>

          <aside className="xl:col-span-2">
            <section className="sticky top-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                    Identidad estrictamente supervisada
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">Perfil SuperAdmin D10S</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Los campos de identidad estan bloqueados contra edicion silenciosa. Email y
                    password solo cambian mediante justificacion GxP, MFA y parche controlado en
                    Supabase Auth.
                  </p>
                </div>
                <KeyRound aria-hidden="true" className="text-red-700" size={24} />
              </div>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Email
                  <input
                    className="h-11 rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-normal text-slate-700"
                    readOnly
                    type="email"
                    value="josueth.acevedo@gmail.com"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Nombre completo
                  <input
                    className="h-11 rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-normal text-slate-700"
                    readOnly
                    type="text"
                    value="Josueth Acevedo"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  Rol de perfil
                  <input
                    className="h-11 rounded-md border border-slate-300 bg-slate-100 px-3 text-sm font-normal text-slate-700"
                    readOnly
                    type="text"
                    value="Nivel 1: SuperAdmin (D10S)"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-900">
                  Cambio de email o password requiere flujo supervisado
                </p>
                <label className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
                  Justificacion GxP del Cambio
                  <textarea
                    className="min-h-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                    onChange={(event) => setGxpJustification(event.target.value)}
                    placeholder="Describa la razon regulatoria, alcance, evidencia esperada y aprobador MFA."
                    value={gxpJustification}
                  />
                </label>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-emerald-800">
                    <CheckCircle2 aria-hidden="true" size={16} />
                    Solicitud preparada para public.audit_trail
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700">
                    <Lock aria-hidden="true" size={16} />
                    MFA obligatorio antes de parchear Supabase Auth
                  </div>
                </div>
                <button
                  className="mt-4 h-11 w-full rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:bg-slate-300 disabled:text-slate-600"
                  disabled={!justificationReady}
                  onClick={() =>
                    setDialog({
                      title: 'Solicitud de identidad supervisada',
                      description:
                        'La solicitud queda registrada como intencion de cambio. El parche real queda retenido hasta completar MFA y aprobacion multifactorial.',
                      confirmLabel: 'Registrar solicitud',
                      severity: 'neutral',
                    })
                  }
                  type="button"
                >
                  Solicitar verificacion supervisada
                </button>
                {!justificationReady ? (
                  <p className="mt-2 text-xs font-medium text-red-800">
                    Ingrese una justificacion GxP suficiente para habilitar la solicitud.
                  </p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
      <ConfirmationDialog dialog={dialog} onClose={() => setDialog(null)} />
    </main>
  );
}
