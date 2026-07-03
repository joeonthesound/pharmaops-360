import Link from 'next/link';

type ProfileState = {
  certificationId: string;
  clearanceLevel: string;
  fullName: string;
  href: string;
  roleLabel: string;
  shift: 'Manana' | 'Tarde' | 'Noche';
};

const profileStates: ProfileState[] = [
  {
    fullName: 'Marcos Rivera',
    certificationId: 'CERT-HVAC-TECH-2026-014',
    clearanceLevel: 'Nivel II - Ejecucion RUI',
    href: '/admin/user/technician',
    roleLabel: 'Tecnico de Ejecucion HVAC',
    shift: 'Manana',
  },
  {
    fullName: 'Laura Chen',
    certificationId: 'CERT-HVAC-SUP-2026-006',
    clearanceLevel: 'Nivel III - Revision Operativa',
    href: '/admin/user/supervisor',
    roleLabel: 'Supervisor de Mantenimiento',
    shift: 'Tarde',
  },
  {
    fullName: 'Isabel Gomez',
    certificationId: 'CERT-QA-GXP-2026-022',
    clearanceLevel: 'Nivel IV - Liberacion QA',
    href: '/admin/user/quality',
    roleLabel: 'Aseguramiento de Calidad (QA)',
    shift: 'Manana',
  },
  {
    fullName: 'Rafael Castillo',
    certificationId: 'CERT-MGMT-PLANT-2026-003',
    clearanceLevel: 'Nivel V - Cierre Administrativo',
    href: '/admin/user/management',
    roleLabel: 'Gerencia de Operaciones Planta',
    shift: 'Noche',
  },
];

function resolveShiftClass(shift: ProfileState['shift']) {
  if (shift === 'Manana') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }

  if (shift === 'Tarde') {
    return 'border-indigo-200 bg-indigo-50 text-indigo-900';
  }

  return 'border-slate-300 bg-slate-900 text-white';
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function AdminUserHubPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <section className="mx-auto grid w-full max-w-6xl gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Hub de perfiles regulados
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-normal">
            Dynamic Profile Selector
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-700">
            Acceso maestro a simulaciones funcionales por rol, preparado para mapearse a perfiles
            relacionales, documentos NoSQL o directorios IAM externos.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {profileStates.map((profile) => (
            <Link
              className="grid min-h-72 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              href={profile.href}
              key={profile.href}
            >
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-base font-black text-white">
                  {getInitials(profile.fullName)}
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-950">{profile.fullName}</h2>
                <p className="mt-1 text-sm font-bold text-slate-600">{profile.roleLabel}</p>
              </div>

              <div className="mt-5 grid gap-2 text-sm">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Active Certification Id
                  </p>
                  <p className="mt-1 break-words font-mono font-bold text-slate-950">
                    {profile.certificationId}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${resolveShiftClass(
                      profile.shift,
                    )}`}
                  >
                    Turno {profile.shift}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase text-slate-700">
                    {profile.clearanceLevel}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}
