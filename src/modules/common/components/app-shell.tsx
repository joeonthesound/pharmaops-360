'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight, LayoutDashboard, Menu, UserCircle } from 'lucide-react';
import {
  NotificationsBell,
  type NotificationItem,
} from '@/components/ui/notifications-bell';
import { registerNotificationsServiceWorker } from '@/lib/notifications/register-sw';
import type { NotificationRoleContext } from '@/types/database.types';
import { Sidebar } from './sidebar';
import { supabase } from '@/shared/lib/supabase';
import { APP_ROUTES } from '@/modules/common/routes';
import { resolveInterfaceIdentifier } from '@/modules/common/screen-governance';

type AppShellProps = {
  children: React.ReactNode;
  currentCapabilities?: {
    can_approve?: boolean;
    can_audit?: boolean;
    can_create_assets?: boolean;
  };
  currentNotifications?: NotificationItem[];
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

function resolveNotificationRoleContext(role: string): NotificationRoleContext {
  const normalizedRole = role
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizedRole.includes('tecnico') || normalizedRole.includes('technician')) {
    return 'technician';
  }

  if (normalizedRole.includes('supervisor')) {
    return 'supervisor';
  }

  if (
    normalizedRole.includes('calidad') ||
    normalizedRole.includes('quality') ||
    normalizedRole.includes('qa')
  ) {
    return 'quality';
  }

  return 'management';
}

function resolveProfileRoleSlug(role: string) {
  const normalizedRole = role
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizedRole.includes('tecnico') || normalizedRole.includes('technician')) {
    return 'technician';
  }

  if (normalizedRole.includes('supervisor')) {
    return 'supervisor';
  }

  if (
    normalizedRole.includes('calidad') ||
    normalizedRole.includes('quality') ||
    normalizedRole.includes('qa')
  ) {
    return 'quality';
  }

  return 'management';
}

function hashToken(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function getPathUuid(pathname: string) {
  return pathname.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3,4}-[0-9a-f]{3,4}-[0-9a-f]{12}/i,
  )?.[0] ?? null;
}

function resolveScreenId(pathname: string) {
  return resolveInterfaceIdentifier(pathname);
}

function resolveAuditHash(pathname: string) {
  const uuid = getPathUuid(pathname);

  if (uuid) {
    return uuid.slice(0, 8).toUpperCase();
  }

  return hashToken(pathname || 'pharmaops-360').slice(0, 8);
}

function GxpMetadataStamp({
  currentUserEmail,
  pathname,
}: {
  currentUserEmail: string;
  pathname: string;
}) {
  const isOperationalPath =
    Boolean(resolveScreenId(pathname));

  if (!isOperationalPath) {
    return null;
  }

  const interfaceIdentifier = resolveScreenId(pathname);

  if (!interfaceIdentifier) {
    return null;
  }

  const tokenClass =
    'cursor-text select-text font-mono text-xs text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded border border-slate-200';

  return (
    <aside
      aria-label="GxP metadata stamp"
      className="pointer-events-auto fixed right-4 top-[92px] z-40 flex w-full max-w-[98vw] select-text flex-wrap justify-end gap-1.5 px-2 md:right-6 md:top-[88px] md:w-auto md:max-w-[calc(100vw-2rem)] md:px-0"
    >
      <span className={tokenClass}>
        {interfaceIdentifier.kind}:{interfaceIdentifier.value}
      </span>
      <span className={tokenClass}>OPERATOR_ID:OP-{hashToken(currentUserEmail)}</span>
      <span className={tokenClass}>AUDIT_HASH:{resolveAuditHash(pathname)}</span>
    </aside>
  );
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
  currentNotifications = [],
  currentRole,
  currentUserEmail,
  currentUserName,
}: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const initials = getInitials(currentUserName || 'P360') || 'P';
  const isTechnicianProfile = isTechnicianRole(currentRole);
  const notificationRoleContext = resolveNotificationRoleContext(currentRole);
  const profileHref = `/admin/user/${resolveProfileRoleSlug(currentRole)}`;
  const hasGxpMetadataStamp = Boolean(resolveInterfaceIdentifier(pathname));
  const profileContainerClass = isTechnicianProfile
    ? 'flex min-h-11 items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-blue-900 shadow-sm transition hover:border-blue-400 hover:bg-blue-100'
    : 'flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm transition hover:border-slate-300 hover:bg-slate-50';
  const avatarClass = isTechnicianProfile
    ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-semibold text-white'
    : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white';

  useEffect(() => {
    window.setTimeout(() => {
      void registerNotificationsServiceWorker();
    }, 0);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <div
        className={`hidden shrink-0 print:hidden md:fixed md:inset-y-0 md:left-0 md:block transition-[width] duration-300 ${
          isSidebarCollapsed ? 'md:w-16 md:min-w-16' : 'md:w-[296px] md:min-w-[296px]'
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
        <div className="fixed inset-0 z-[60] md:hidden print:hidden">
          <button
            aria-label="Cerrar navegación"
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
            type="button"
          />
          <div className="absolute inset-y-0 left-0 w-[296px] max-w-[calc(100vw-2rem)] shadow-2xl">
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
        className={`min-h-screen min-w-0 overflow-x-hidden transition-[padding] duration-300 print:pl-0 ${
          isSidebarCollapsed ? 'md:pl-16' : 'md:pl-[296px]'
        }`}
      >
        <GxpMetadataStamp currentUserEmail={currentUserEmail} pathname={pathname} />

        <header
          className={`fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md transition-[left] duration-300 print:hidden ${
            isSidebarCollapsed ? 'md:left-16' : 'md:left-[296px]'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
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

            <NotificationsBell
              activeRoleContext={notificationRoleContext}
              items={currentNotifications}
            />

            <div className={`${profileContainerClass} shrink-0`}>
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
              <div className="ml-1 flex items-center gap-1 border-l border-current/10 pl-2">
                <Link
                  aria-label="Ir al Panel General"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  href="/dashboard"
                  title="Panel General"
                >
                  <LayoutDashboard aria-hidden="true" size={17} />
                </Link>
                <Link
                  aria-label="Mi Perfil"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  href={profileHref}
                  title="Mi Perfil"
                >
                  <UserCircle aria-hidden="true" size={18} />
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main
          className={`min-w-0 flex-1 overflow-x-hidden print:pt-0 ${
            hasGxpMetadataStamp ? 'pt-32 md:pt-32' : 'pt-20'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
