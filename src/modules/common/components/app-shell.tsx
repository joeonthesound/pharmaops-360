'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, ChevronRight, Menu } from 'lucide-react';
import { Sidebar } from './sidebar';
import { supabase } from '@/shared/lib/supabase';

type AppShellProps = {
  children: React.ReactNode;
  currentCapabilities?: {
    can_approve?: boolean;
    can_create_assets?: boolean;
  };
  currentUserEmail: string;
  currentRole: string;
  currentUserName: string;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function isTechnicianRole(role: string) {
  const normalizedRole = role.toLowerCase();

  return normalizedRole.includes('tecnico') || normalizedRole.includes('técnico');
}

function getStaticBreadcrumbLabel(segment: string) {
  const labels: Record<string, string> = {
    activos: 'Activos',
    hvac: 'HVAC',
    ver: 'Ver Registro',
    mantenimiento: 'Mantenimiento',
    rui: 'RUI',
    admin: 'Administración',
    usuarios: 'Usuarios',
    dashboard: 'Dashboard',
  };

  return labels[segment] ?? segment.replace(/-/g, ' ');
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3,4}-[0-9a-f]{3,4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function DynamicBreadcrumbs({ pathname }: { pathname: string }) {
  const [assetCode, setAssetCode] = useState<string | null>(null);
  const [isLoadingAssetCode, setIsLoadingAssetCode] = useState(false);
  const segments = useMemo(() => pathname.split('/').filter(Boolean), [pathname]);
  const assetUuid =
    segments[0] === 'activos' && segments[1] === 'hvac' && segments[2] === 'ver'
      ? segments[3] ?? null
      : null;

  useEffect(() => {
    let isMounted = true;

    async function fetchAssetCode(uuid: string) {
      setIsLoadingAssetCode(true);
      setAssetCode(null);

      const { data } = await supabase
        .from('activos')
        .select('asset_code')
        .eq('uuid', uuid)
        .maybeSingle();

      if (isMounted) {
        setAssetCode(
          typeof data?.asset_code === 'string' && data.asset_code.trim()
            ? data.asset_code
            : null,
        );
        setIsLoadingAssetCode(false);
      }
    }

    if (assetUuid && isUuidLike(assetUuid)) {
      void fetchAssetCode(assetUuid);
    } else {
      setAssetCode(null);
      setIsLoadingAssetCode(false);
    }

    return () => {
      isMounted = false;
    };
  }, [assetUuid]);

  if (segments.length === 0) {
    return null;
  }

  let hrefAccumulator = '';
  const crumbs = segments.map((segment, index) => {
    hrefAccumulator += `/${segment}`;
    const isLast = index === segments.length - 1;
    const isDynamicAssetLeaf = assetUuid === segment;

    return {
      href: hrefAccumulator,
      isLast,
      isDynamicAssetLeaf,
      label: isDynamicAssetLeaf ? assetCode ?? '' : getStaticBreadcrumbLabel(segment),
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-xs font-bold">
      {crumbs.map((crumb, index) => (
        <span className="flex min-w-0 items-center gap-1" key={crumb.href}>
          {index > 0 ? (
            <ChevronRight aria-hidden="true" className="shrink-0 text-slate-300" size={14} />
          ) : null}

          {crumb.isDynamicAssetLeaf && isLoadingAssetCode ? (
            <span className="h-4 w-16 animate-pulse rounded bg-slate-200" />
          ) : crumb.isLast ? (
            <span className="max-w-[180px] truncate rounded-md bg-slate-100 px-2 py-1 text-slate-900">
              {crumb.label || 'Registro'}
            </span>
          ) : (
            <Link
              className="max-w-[160px] truncate rounded-md px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              href={crumb.href}
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AppShell({
  children,
  currentCapabilities = {},
  currentRole,
  currentUserEmail,
  currentUserName,
}: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const initials = getInitials(currentUserName || 'P360') || 'P';
  const isTechnicianProfile = isTechnicianRole(currentRole);
  const profileContainerClass = isTechnicianProfile
    ? 'flex min-h-11 items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-blue-900 shadow-sm'
    : 'flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm';
  const avatarClass = isTechnicianProfile
    ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-semibold text-white'
    : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white';

  return (
    <div className="min-h-screen bg-slate-50">
      <div
        className={`hidden print:hidden md:fixed md:inset-y-0 md:left-0 md:block transition-[width] duration-300 ${
          isSidebarCollapsed ? 'md:w-16' : 'md:w-64'
        }`}
      >
        <Sidebar
          capabilities={currentCapabilities}
          currentRole={currentRole}
          currentPath={pathname}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
          showCollapseToggle
        />
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden print:hidden">
          <button
            aria-label="Cerrar navegación"
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
            type="button"
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-2xl">
            <Sidebar
              capabilities={currentCapabilities}
              currentRole={currentRole}
              currentPath={pathname}
              isCollapsed={false}
            />
          </div>
        </div>
      ) : null}

      <div
        className={`min-h-screen transition-[padding] duration-300 print:pl-0 ${
          isSidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 print:hidden">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir navegación"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-900 shadow-sm md:hidden"
              onClick={() => setIsMobileOpen(true)}
              type="button"
            >
              <Menu aria-hidden="true" size={20} />
            </button>

            <div className="hidden min-w-0 flex-1 md:block">
              <DynamicBreadcrumbs pathname={pathname} />
            </div>

            <div className="min-w-0 flex-1 md:hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                PharmaOps 360
              </p>
              <p className="truncate text-sm font-semibold text-slate-950">{currentRole}</p>
            </div>

            <button
              aria-label="Alertas pendientes"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm"
              type="button"
            >
              <Bell aria-hidden="true" size={19} />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-600" />
            </button>

            <div className={profileContainerClass}>
              <div className={avatarClass}>
                {initials}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className={`truncate text-sm font-semibold ${isTechnicianProfile ? 'text-blue-900' : 'text-slate-950'}`}>
                  {currentUserName}
                </p>
                <p className={`truncate text-xs ${isTechnicianProfile ? 'text-blue-700' : 'text-slate-500'}`}>
                  {currentRole}
                </p>
                <p className={`truncate text-[11px] ${isTechnicianProfile ? 'text-blue-600' : 'text-slate-400'}`}>
                  {currentUserEmail}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
