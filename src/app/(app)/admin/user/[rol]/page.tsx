import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/shared/lib/supabase-server';

type UserRolePageProps = {
  params: Promise<{
    rol: string;
  }>;
};

type RoleSlug = 'technician' | 'supervisor' | 'quality' | 'management';

type RoleDefinition = {
  department: string;
  metricLabels: string[];
  plantLocation: string;
  title: string;
};

type UserProfileRow = {
  area: string | null;
  full_name: string | null;
  job_title: string | null;
  role: string | null;
  user_email: string;
};

const roleDefinitions: Record<RoleSlug, RoleDefinition> = {
  technician: {
    department: 'Mantenimiento HVAC',
    metricLabels: ['Total RUI Ejecutados', 'Alertas Desviadas (NOK)', 'Eficiencia de Cierre (Dias)'],
    plantLocation: 'Planta Central / Cuartos HVAC',
    title: 'Tecnico de Ejecucion HVAC',
  },
  supervisor: {
    department: 'Supervision de Mantenimiento',
    metricLabels: ['Protocolos Auditados', 'Asignaciones Activas', 'Ordenes de Trabajo Rechazadas'],
    plantLocation: 'Planta Central / Taller de Mantenimiento',
    title: 'Supervisor de Mantenimiento',
  },
  quality: {
    department: 'Aseguramiento de Calidad',
    metricLabels: [
      'Firmas Electronicas Estampadas',
      'Liberaciones Concluidas',
      'Incidentes de Integridad Evitados',
    ],
    plantLocation: 'Planta Central / QA Documental',
    title: 'Aseguramiento de Calidad (QA)',
  },
  management: {
    department: 'Gerencia de Operaciones',
    metricLabels: ['KPI de Cumplimiento Global Planta', 'Riesgos de Parada de Planta Mitigados'],
    plantLocation: 'Planta Central / Direccion de Operaciones',
    title: 'Gerencia de Operaciones Planta',
  },
};

const metricValues: Record<RoleSlug, string[]> = {
  technician: ['128', '7', '2.4'],
  supervisor: ['96', '14', '5'],
  quality: ['214', '83', '12'],
  management: ['98.6%', '9'],
};

const recentActions: Record<
  RoleSlug,
  Array<{
    action: string;
    assetId: string;
    recordCode: string;
    result: string;
    timestamp: string;
  }>
> = {
  technician: [
    { recordCode: 'WO-HVAC-2026-020', assetId: 'HVAC-02', timestamp: '2026-07-03 08:14 UTC', action: 'Checklist tecnico completado', result: 'SIGNED' },
    { recordCode: 'WO-HVAC-2026-019', assetId: 'HVAC-01', timestamp: '2026-07-02 17:41 UTC', action: 'Evidencia fotografica adjunta', result: 'COMMENTED' },
    { recordCode: 'WO-HVAC-2026-018', assetId: 'HVAC-04', timestamp: '2026-07-02 10:28 UTC', action: 'Parametro fuera de rango reportado', result: 'NOK' },
    { recordCode: 'WO-HVAC-2026-017', assetId: 'HVAC-03', timestamp: '2026-07-01 14:06 UTC', action: 'Inspeccion preventiva registrada', result: 'SIGNED' },
    { recordCode: 'WO-HVAC-2026-016', assetId: 'HVAC-06', timestamp: '2026-07-01 09:33 UTC', action: 'Observacion tecnica documentada', result: 'COMMENTED' },
  ],
  supervisor: [
    { recordCode: 'WO-HVAC-2026-020', assetId: 'HVAC-02', timestamp: '2026-07-03 09:22 UTC', action: 'Revision operativa de protocolo', result: 'APPROVED' },
    { recordCode: 'WO-HVAC-2026-018', assetId: 'HVAC-04', timestamp: '2026-07-02 11:15 UTC', action: 'Orden devuelta a tecnico', result: 'REJECTED' },
    { recordCode: 'WO-HVAC-2026-015', assetId: 'HVAC-05', timestamp: '2026-06-30 16:07 UTC', action: 'Asignacion de cuadrilla validada', result: 'SIGNED' },
    { recordCode: 'WO-HVAC-2026-014', assetId: 'HVAC-01', timestamp: '2026-06-30 13:18 UTC', action: 'Comentario de desviacion agregado', result: 'COMMENTED' },
    { recordCode: 'WO-HVAC-2026-013', assetId: 'HVAC-03', timestamp: '2026-06-29 15:44 UTC', action: 'Revision documental inicial', result: 'APPROVED' },
  ],
  quality: [
    { recordCode: 'WO-HVAC-2026-020', assetId: 'HVAC-02', timestamp: '2026-07-03 10:03 UTC', action: 'Liberacion QA del registro', result: 'APPROVED' },
    { recordCode: 'WO-HVAC-2026-017', assetId: 'HVAC-03', timestamp: '2026-07-01 16:51 UTC', action: 'Firma electronica estampada', result: 'SIGNED' },
    { recordCode: 'WO-HVAC-2026-014', assetId: 'HVAC-01', timestamp: '2026-06-30 14:22 UTC', action: 'Integridad ALCOA+ verificada', result: 'APPROVED' },
    { recordCode: 'WO-HVAC-2026-012', assetId: 'HVAC-07', timestamp: '2026-06-29 12:10 UTC', action: 'Comentario de calidad documentado', result: 'COMMENTED' },
    { recordCode: 'WO-HVAC-2026-011', assetId: 'HVAC-05', timestamp: '2026-06-28 11:19 UTC', action: 'Anomalia de firma prevenida', result: 'SIGNED' },
  ],
  management: [
    { recordCode: 'WO-HVAC-2026-020', assetId: 'HVAC-02', timestamp: '2026-07-03 11:42 UTC', action: 'Cierre gerencial de RUI', result: 'APPROVED' },
    { recordCode: 'WO-HVAC-2026-017', assetId: 'HVAC-03', timestamp: '2026-07-01 17:28 UTC', action: 'Riesgo de parada mitigado', result: 'SIGNED' },
    { recordCode: 'WO-HVAC-2026-010', assetId: 'HVAC-06', timestamp: '2026-06-27 15:52 UTC', action: 'KPI semanal revisado', result: 'COMMENTED' },
    { recordCode: 'WO-HVAC-2026-009', assetId: 'HVAC-04', timestamp: '2026-06-26 10:36 UTC', action: 'Cierre administrativo autorizado', result: 'APPROVED' },
    { recordCode: 'WO-HVAC-2026-008', assetId: 'HVAC-01', timestamp: '2026-06-25 13:49 UTC', action: 'Plan preventivo escalado', result: 'SIGNED' },
  ],
};

function isRoleSlug(value: string): value is RoleSlug {
  return value === 'technician' || value === 'supervisor' || value === 'quality' || value === 'management';
}

function buildLicenseCode(role: RoleSlug, email: string) {
  const emailSeed = email
    .split('@')[0]
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 8)
    .toUpperCase();

  return `P360-${role.toUpperCase()}-${emailSeed || 'USER'}-21CFR11`;
}

function resolveMetricTone(index: number) {
  return index === 0
    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
    : index === 1
      ? 'border-indigo-200 bg-indigo-50 text-indigo-950'
      : 'border-slate-200 bg-white text-slate-950';
}

function resolveResultClass(result: string) {
  if (result === 'APPROVED' || result === 'SIGNED') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (result === 'REJECTED' || result === 'NOK') {
    return 'border-red-200 bg-red-50 text-red-800';
  }

  return 'border-slate-200 bg-slate-100 text-slate-800';
}

export default async function UserRoleDashboardPage({ params }: UserRolePageProps) {
  const { rol } = await params;

  if (!isRoleSlug(rol)) {
    notFound();
  }

  const roleDefinition = roleDefinitions[rol];
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase() ?? '';
  const { data: profileData } = email
    ? await supabase
        .from('usuarios_roles')
        .select('user_email, full_name, job_title, role, area')
        .eq('user_email', email)
        .eq('active', true)
        .maybeSingle()
    : { data: null };
  const profile = profileData as UserProfileRow | null;
  const displayEmail = profile?.user_email ?? email;
  const displayName = profile?.full_name?.trim() || displayEmail || 'Usuario PharmaOps 360';
  const department = profile?.area || profile?.job_title || roleDefinition.department;
  const plantLocation = profile?.area ? `Planta Central / ${profile.area}` : roleDefinition.plantLocation;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto grid w-full max-w-6xl gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Perfil operativo validado
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-normal">{roleDefinition.title}</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700">
            Panel unificado para indicadores de intervencion, acciones recientes y licencia de
            firma electronica bajo trazabilidad GxP.
          </p>
        </header>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-950 text-base font-black text-white">
                {displayName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part.charAt(0).toUpperCase())
                  .join('') || 'P3'}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-slate-950">{displayName}</h2>
                <p className="break-all text-sm font-semibold text-slate-600">{displayEmail}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[560px]">
            {[
              ['Departamento', department],
              ['Ubicacion fisica', plantLocation],
              ['Licencia de firma', buildLicenseCode(rol, displayEmail)],
            ].map(([label, value]) => (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2" key={label}>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 break-words font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roleDefinition.metricLabels.map((label, index) => (
            <article
              className={`rounded-lg border p-4 shadow-sm ${resolveMetricTone(index)}`}
              key={label}
            >
              <p className="text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
              <p className="mt-3 text-3xl font-black tracking-normal">{metricValues[rol][index]}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">
              Acciones recientes del rol
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">Record Code</th>
                  <th className="px-4 py-3">Asset ID</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Accion</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentActions[rol].map((action) => (
                  <tr className="bg-white" key={`${action.recordCode}-${action.timestamp}`}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-950">{action.recordCode}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{action.assetId}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{action.timestamp}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{action.action}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-black uppercase ${resolveResultClass(action.result)}`}
                      >
                        {action.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
