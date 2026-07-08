'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,
  FlaskConical,
  Search,
  Settings,
  ShieldCheck,
  Send,
  Users,
  Wind,
  Wrench,
} from 'lucide-react';
import {
  DEFAULT_SIDEBAR_THEME,
  NAVIGATION_TREE,
  ROLE_SIDEBAR_THEME,
} from './navigation.config';
import { signOutAction } from '@/modules/common/actions';
import type {
  NavigationCapabilities,
  NavigationNode,
  PharmaOpsRole,
  SidebarTheme,
} from './navigation.interface';
import { filterNavigationByRole } from './navigation.utils';

type SidebarProps = {
  capabilities?: NavigationCapabilities;
  isCollapsed?: boolean;
  currentRole: string;
  currentPath?: string;
  onToggleCollapsed?: () => void;
  showCollapseToggle?: boolean;
};

const MAINTENANCE_ACTIVE_CLASS =
  'bg-slate-800 border-l-4 border-emerald-500 text-white hover:bg-slate-800';

const iconMap = {
  Activity,
  AlertTriangle,
  ClipboardCheck,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,
  FlaskConical,
  Search,
  Settings,
  ShieldCheck,
  Send,
  Users,
  Wind,
  Wrench,
};

function isKnownRole(role: string): role is PharmaOpsRole {
  return role in ROLE_SIDEBAR_THEME;
}

function resolveTheme(role: string): SidebarTheme {
  return isKnownRole(role) ? ROLE_SIDEBAR_THEME[role] : DEFAULT_SIDEBAR_THEME;
}

function getHrefPath(href: string) {
  return href.split('?')[0] ?? href;
}

function resolveNavigationHref(href: string, currentPath: string) {
  if (!href.includes('[uuid]')) {
    return href;
  }

  const basePath = getHrefPath(href).replace('/[uuid]', '');

  return currentPath.startsWith(basePath) ? currentPath : null;
}

function isMaintenanceNode(node: NavigationNode): boolean {
  return Boolean(
    node.title === 'Mantenimientos' ||
      node.title === 'HVAC' ||
      (node.href && getHrefPath(node.href).startsWith('/mantenimiento')) ||
      node.children?.some((child) => isMaintenanceNode(child)),
  );
}

function isActivosNode(node: NavigationNode): boolean {
  return Boolean(
    node.title === 'Activos' ||
      (node.href && getHrefPath(node.href).startsWith('/activos')) ||
      node.children?.some((child) => isActivosNode(child)),
  );
}

function isDashboardNode(node: NavigationNode): boolean {
  return node.title === 'Panel General' && node.href === '/dashboard';
}

function isDashboardRouteCollision(node: NavigationNode): boolean {
  return Boolean(node.href && getHrefPath(node.href) === '/dashboard' && !isDashboardNode(node));
}

function NavigationIcon({ name, className }: { name?: string; className: string }) {
  if (!name || !(name in iconMap)) {
    return null;
  }

  const Icon = iconMap[name as keyof typeof iconMap];
  return <Icon aria-hidden="true" className={className} size={18} strokeWidth={2} />;
}

export function Sidebar({
  capabilities = {},
  currentRole,
  currentPath = '',
  isCollapsed = false,
  onToggleCollapsed,
  showCollapseToggle = false,
}: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean | undefined>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const activePath = pathname || currentPath;
  const isDashboardActive = activePath === '/dashboard';
  const theme = resolveTheme(currentRole);
  const navigation = useMemo(
    () => filterNavigationByRole(NAVIGATION_TREE, currentRole, capabilities),
    [capabilities, currentRole],
  );

  function toggleMenu(menuKey: string, fallbackOpen: boolean) {
    setOpenMenus((current) => ({
      ...current,
      [menuKey]: !(current[menuKey] ?? fallbackOpen),
    }));
  }

  function isNodeActive(node: NavigationNode) {
    if (!node.href) {
      return false;
    }

    const hrefPath = getHrefPath(node.href);

    if (isDashboardActive) {
      return isDashboardNode(node);
    }

    if (isDashboardRouteCollision(node)) {
      return false;
    }

    if (hrefPath === '/mantenimiento') {
      return activePath.startsWith('/mantenimiento');
    }

    if (hrefPath === '/activos') {
      return activePath.startsWith('/activos');
    }

    if (hrefPath.includes('[uuid]')) {
      const basePath = hrefPath.replace('/[uuid]', '');
      return activePath.startsWith(basePath);
    }

    return !node.href.includes('?') && activePath === hrefPath;
  }

  function isNodeRouteOpen(node: NavigationNode) {
    if (isDashboardActive) {
      return isDashboardNode(node);
    }

    if (isDashboardRouteCollision(node)) {
      return false;
    }

    if (node.href && getHrefPath(node.href) === '/mantenimiento') {
      return activePath.startsWith('/mantenimiento');
    }

    if (node.title === 'HVAC') {
      return activePath.startsWith('/mantenimiento/hvac');
    }

    if (node.href && getHrefPath(node.href) === '/activos') {
      return activePath.startsWith('/activos');
    }

    if (node.href && getHrefPath(node.href) === '/activos/hvac') {
      return activePath.startsWith('/activos/hvac');
    }

    if (node.href && getHrefPath(node.href).includes('[uuid]')) {
      return activePath.startsWith(getHrefPath(node.href).replace('/[uuid]', ''));
    }

    return Boolean(node.href && activePath === getHrefPath(node.href));
  }

  function hasActiveDescendant(node: NavigationNode): boolean {
    return Boolean(
      node.children?.some((child) => isNodeRouteOpen(child) || hasActiveDescendant(child)),
    );
  }

  function renderNode(node: NavigationNode, depth = 0, parentKey = 'root') {
    const nodeKey = `${parentKey}/${node.title}:${node.href ?? 'section'}`;
    const childrenId = `sidebar-children-${nodeKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const hasChildren = Boolean(node.children?.length);
    const hasActiveChild = hasActiveDescendant(node);
    const shouldOpenFromRoute = !isDashboardActive && (isNodeRouteOpen(node) || hasActiveChild);
    const isOpen = openMenus[nodeKey] ?? shouldOpenFromRoute;
    const isActive = isNodeActive(node);
    const isMaintenanceRoute = activePath.startsWith('/mantenimiento');
    const isMaintenanceTreeNode = isMaintenanceRoute && isMaintenanceNode(node);
    const isActivosRoute = activePath.startsWith('/activos');
    const isActivosTreeNode = isActivosRoute && isActivosNode(node);
    const isMaintenanceActive =
      isMaintenanceTreeNode && (isActive || isOpen || hasActiveChild || depth > 0);
    const isActivosActive =
      isActivosTreeNode && (isActive || isOpen || hasActiveChild || depth > 0);
    const activeClass =
      isMaintenanceActive || isActivosActive ? MAINTENANCE_ACTIVE_CLASS : theme.itemActive;
    const activeTextClass = isMaintenanceActive || isActivosActive ? 'text-white' : theme.text;
    const iconClass = isMaintenanceActive || isActivosActive ? 'text-white' : theme.mutedText;
    const paddingClass = isCollapsed ? 'px-2' : 'px-4';
    const justifyClass = isCollapsed ? 'justify-center' : 'justify-between';
    const itemClass = `${paddingClass} flex min-h-12 w-full items-center ${justifyClass} rounded-md py-3 text-left text-sm font-semibold transition ${activeTextClass} ${
      isActive || isMaintenanceActive || isActivosActive ? activeClass : theme.item
    }`;
    const contentClass = `flex min-w-0 flex-1 items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`;
    const labelClass = isCollapsed ? 'hidden' : 'truncate';

    if (hasChildren) {
      return (
        <div key={nodeKey} title={isCollapsed ? node.title : undefined}>
          <button
            aria-controls={childrenId}
            aria-expanded={isOpen}
            aria-label={`Alternar ${node.title}`}
            className={itemClass}
            onClick={() => toggleMenu(nodeKey, shouldOpenFromRoute)}
            type="button"
          >
            <span className={contentClass}>
              <NavigationIcon className={iconClass} name={node.icon} />
              <span className={labelClass}>{node.title}</span>
            </span>
            {!isCollapsed ? (
              <span className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition hover:bg-white/10">
                <ChevronDown
                  aria-hidden="true"
                  className={`transition-transform ${iconClass} ${isOpen ? 'rotate-180' : ''}`}
                  size={18}
                />
              </span>
            ) : null}
          </button>
          {isOpen ? (
            <div
              className={`mt-1.5 grid gap-1.5 ${
                isCollapsed ? '' : 'ml-5 border-l border-slate-700/50 pl-3'
              }`}
              id={childrenId}
            >
              {node.children?.map((child) => renderNode(child, depth + 1, nodeKey))}
            </div>
          ) : null}
        </div>
      );
    }

    if (!node.href) {
      return null;
    }

    const resolvedHref = resolveNavigationHref(node.href, activePath);

    if (!resolvedHref) {
      return (
        <div
          className={`${itemClass} cursor-not-allowed opacity-60`}
          key={nodeKey}
          title={isCollapsed ? node.title : undefined}
        >
          <span className={contentClass}>
            <NavigationIcon className={iconClass} name={node.icon} />
            <span className={labelClass}>{node.title}</span>
          </span>
        </div>
      );
    }

    return (
      <Link
        className={itemClass}
        href={resolvedHref}
        key={nodeKey}
        title={isCollapsed ? node.title : undefined}
      >
        <span className={contentClass}>
          <NavigationIcon className={iconClass} name={node.icon} />
          <span className={labelClass}>{node.title}</span>
        </span>
      </Link>
    );
  }

  return (
    <aside
      className={`flex min-h-screen w-full shrink-0 flex-col overflow-x-hidden border-r ${
        isCollapsed ? 'min-w-16' : 'min-w-[280px]'
      } ${theme.border} ${theme.shell}`}
    >
      <div className={`border-b border-white/10 ${isCollapsed ? 'p-3' : 'p-4'}`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${theme.mutedText} ${isCollapsed ? 'hidden' : ''}`}>
          PharmaOps 360
        </p>
        <h2 className={`mt-1 text-lg font-semibold ${theme.text} ${isCollapsed ? 'hidden' : ''}`}>
          {currentRole}
        </h2>
        {isCollapsed ? (
          <div className="flex h-10 items-center justify-center rounded-md bg-white/10 text-sm font-black text-white">
            P360
          </div>
        ) : null}
      </div>

      <div className={`border-b border-white/10 p-3 ${isCollapsed ? 'hidden' : ''}`}>
        <label className="relative block">
          <Search
            aria-hidden="true"
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${theme.mutedText}`}
            size={16}
          />
          <input
            aria-label="Buscar seccion"
            className="h-11 w-full rounded-md border border-white/10 bg-white/10 pl-10 pr-3 text-sm font-semibold text-white outline-none placeholder:text-slate-300 transition focus:border-white/30 focus:bg-white/15 focus:ring-2 focus:ring-white/10"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar seccion..."
            type="search"
            value={searchTerm}
          />
        </label>
      </div>

      <nav className={`grid gap-2 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {navigation.map((node) => renderNode(node))}
      </nav>

      <form action={signOutAction} className="mt-auto border-t border-white/10 p-3">
        <button
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition ${theme.text} ${theme.item}`}
          title={isCollapsed ? 'Cerrar Sesión' : undefined}
          type="submit"
        >
          <LogOut aria-hidden="true" className={theme.mutedText} size={18} />
          <span className={isCollapsed ? 'hidden' : ''}>Cerrar Sesión</span>
        </button>
      </form>

      {showCollapseToggle ? (
        <div className="hidden border-t border-white/10 p-3 md:block">
          <button
            aria-label={isCollapsed ? 'Expandir navegación' : 'Colapsar navegación'}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            onClick={onToggleCollapsed}
            type="button"
          >
            <ChevronLeft
              aria-hidden="true"
              className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            />
            <span className={isCollapsed ? 'hidden' : ''}>Colapsar</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
