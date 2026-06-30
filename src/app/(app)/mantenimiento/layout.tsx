'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type MantenimientoLayoutProps = {
  children: React.ReactNode;
};

const segmentLabels: Record<string, string> = {
  mantenimiento: 'MANTENIMIENTO',
  hvac: 'HVAC',
  activos: 'ACTIVOS',
  rui: 'RUI',
  ht: 'HISTORIAL TECNICO (HT)',
  activo: 'DOCUMENTO ACTIVO',
  enviado: 'REPORTE ENVIADO',
  rechazado: 'REPORTE RECHAZADO',
  aprobar: 'APROBACION',
};

function formatSegment(segment: string) {
  return segmentLabels[segment] ?? segment.replaceAll('-', ' ').toUpperCase();
}

export default function MantenimientoLayout({ children }: MantenimientoLayoutProps) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const mantenimientoIndex = segments.indexOf('mantenimiento');
  const activeSegments =
    mantenimientoIndex >= 0 ? segments.slice(mantenimientoIndex) : ['mantenimiento'];

  const breadcrumbs = [
    { href: '/mantenimiento', label: 'Planta Central' },
    ...activeSegments.map((segment, index) => ({
      href: `/${segments.slice(0, mantenimientoIndex + index + 1).join('/')}`,
      label: formatSegment(segment),
    })),
  ];

  return (
    <div className="bg-slate-50">
      <div className="px-4 py-3 print:hidden">
        <div className="flex h-11 max-w-xl items-center rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
          <nav aria-label="Ruta de mantenimiento" className="min-w-0">
            <ol className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold md:text-sm">
              {breadcrumbs.map((breadcrumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <li
                    className="flex min-w-0 items-center gap-2"
                    key={`${breadcrumb.href}-${breadcrumb.label}`}
                  >
                    {index > 0 ? <span className="text-slate-300">/</span> : null}
                    {isLast ? (
                      <span className="max-w-48 truncate text-slate-950">
                        {breadcrumb.label}
                      </span>
                    ) : (
                      <Link
                        className="max-w-40 truncate transition hover:text-slate-950"
                        href={breadcrumb.href}
                      >
                        {breadcrumb.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>

      {children}
    </div>
  );
}
