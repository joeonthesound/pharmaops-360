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
      <nav
        aria-label="Ruta de mantenimiento"
        className="border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 print:hidden md:text-sm"
      >
        <ol className="flex flex-wrap items-center gap-2">
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <li className="flex items-center gap-2" key={`${breadcrumb.href}-${breadcrumb.label}`}>
                {index > 0 ? <span className="text-slate-300">/</span> : null}
                {isLast ? (
                  <span className="text-slate-950">{breadcrumb.label}</span>
                ) : (
                  <Link className="transition hover:text-slate-950" href={breadcrumb.href}>
                    {breadcrumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {children}
    </div>
  );
}
