'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ChevronDown,
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
  currentRole: string;
  currentPath?: string;
};

const MAINTENANCE_ACTIVE_CLASS =
  'bg-[#C76E00] border-l-2 border-[#C76E00] text-blue-900 hover:bg-[#C76E00]';

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

function NavigationIcon({ name, className }: { name?: string; className: string }) {
  if (!name || !(name in iconMap)) {
    return null;
  }

  const Icon = iconMap[name as keyof typeof iconMap];
  return <Icon aria-hidden="true" className={className} size={18} strokeWidth={2} />;
}

export function Sidebar({ capabilities = {}, currentRole, currentPath = '' }: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const theme = resolveTheme(currentRole);
  const navigation = useMemo(
    () => filterNavigationByRole(NAVIGATION_TREE, currentRole, capabilities),
    [capabilities, currentRole],
  );

  function toggleMenu(title: string) {
    setOpenMenus((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  function isNodeActive(node: NavigationNode) {
    if (!node.href) {
      return false;
    }

    const hrefPath = getHrefPath(node.href);

    if (hrefPath === '/mantenimiento') {
      return currentPath.startsWith('/mantenimiento');
    }

    if (hrefPath === '/activos') {
      return currentPath.startsWith('/activos');
    }

    if (hrefPath.includes('[uuid]')) {
      const basePath = hrefPath.replace('/[uuid]', '');
      return currentPath.startsWith(basePath);
    }

    return !node.href.includes('?') && currentPath === hrefPath;
  }

  function isNodeRouteOpen(node: NavigationNode) {
    if (node.href && getHrefPath(node.href) === '/mantenimiento') {
      return currentPath.startsWith('/mantenimiento');
    }

    if (node.title === 'HVAC') {
      return currentPath.startsWith('/mantenimiento/hvac');
    }

    if (node.href && getHrefPath(node.href) === '/activos') {
      return currentPath.startsWith('/activos');
    }

    if (node.href && getHrefPath(node.href) === '/activos/hvac') {
      return currentPath.startsWith('/activos/hvac');
    }

    if (node.href && getHrefPath(node.href).includes('[uuid]')) {
      return currentPath.startsWith(getHrefPath(node.href).replace('/[uuid]', ''));
    }

    return Boolean(node.href && currentPath === getHrefPath(node.href));
  }

  function hasActiveDescendant(node: NavigationNode): boolean {
    return Boolean(
      node.children?.some((child) => isNodeRouteOpen(child) || hasActiveDescendant(child)),
    );
  }

  function renderNode(node: NavigationNode, depth = 0) {
    const hasChildren = Boolean(node.children?.length);
    const hasActiveChild = hasActiveDescendant(node);
    const isOpen = Boolean(openMenus[node.title]) || isNodeRouteOpen(node) || hasActiveChild;
    const isActive = isNodeActive(node);
    const isMaintenanceRoute = currentPath.startsWith('/mantenimiento');
    const isMaintenanceTreeNode = isMaintenanceRoute && isMaintenanceNode(node);
    const isActivosRoute = currentPath.startsWith('/activos');
    const isActivosTreeNode = isActivosRoute && isActivosNode(node);
    const isMaintenanceActive =
      isMaintenanceTreeNode && (isActive || isOpen || hasActiveChild || depth > 0);
    const isActivosActive =
      isActivosTreeNode && (isActive || isOpen || hasActiveChild || depth > 0);
    const activeClass =
      isMaintenanceActive || isActivosActive ? MAINTENANCE_ACTIVE_CLASS : theme.itemActive;
    const activeTextClass = isMaintenanceActive || isActivosActive ? 'text-blue-900' : theme.text;
    const iconClass = isMaintenanceActive || isActivosActive ? 'text-blue-900' : theme.mutedText;
    const paddingClass = depth === 0 ? 'px-3' : depth === 1 ? 'pl-4 pr-3' : 'pl-8 pr-3';
    const itemClass = `${paddingClass} flex min-h-11 w-full items-center justify-between rounded-md py-2 text-left text-sm font-semibold transition ${activeTextClass} ${
      isActive || isMaintenanceActive || isActivosActive ? activeClass : theme.item
    }`;

    if (hasChildren) {
      return (
        <div key={node.title}>
          <div className={itemClass}>
            {node.href ? (
              <Link className="flex min-w-0 flex-1 items-center gap-3" href={node.href}>
                <NavigationIcon className={iconClass} name={node.icon} />
                <span className="truncate">{node.title}</span>
              </Link>
            ) : (
              <button
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => toggleMenu(node.title)}
                type="button"
              >
                <NavigationIcon className={iconClass} name={node.icon} />
                <span className="truncate">{node.title}</span>
              </button>
            )}
            <button
              aria-label={`Alternar ${node.title}`}
              className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
              onClick={() => toggleMenu(node.title)}
              type="button"
            >
              <ChevronDown
                aria-hidden="true"
                className={`transition ${iconClass} ${isOpen ? 'rotate-180' : ''}`}
                size={16}
              />
            </button>
          </div>
          {isOpen ? (
            <div className="mt-1 grid gap-1">
              {node.children?.map((child) => renderNode(child, depth + 1))}
            </div>
          ) : null}
        </div>
      );
    }

    if (!node.href) {
      return null;
    }

    const resolvedHref = resolveNavigationHref(node.href, currentPath);

    if (!resolvedHref) {
      return (
        <div className={`${itemClass} cursor-not-allowed opacity-60`} key={node.title}>
          <span className="flex items-center gap-3">
            <NavigationIcon className={iconClass} name={node.icon} />
            {node.title}
          </span>
        </div>
      );
    }

    return (
      <Link className={itemClass} href={resolvedHref} key={node.title}>
        <span className="flex items-center gap-3">
          <NavigationIcon className={iconClass} name={node.icon} />
          {node.title}
        </span>
      </Link>
    );
  }

  return (
    <aside className={`flex min-h-screen w-72 flex-col border-r ${theme.border} ${theme.shell}`}>
      <div className="border-b border-white/10 p-4">
        <p className={`text-xs font-semibold uppercase tracking-wide ${theme.mutedText}`}>
          PharmaOps 360
        </p>
        <h2 className={`mt-1 text-lg font-semibold ${theme.text}`}>{currentRole}</h2>
      </div>

      <div className="border-b border-white/10 p-3">
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

      <nav className="grid gap-2 p-3">{navigation.map((node) => renderNode(node))}</nav>

      <form action={signOutAction} className="mt-auto border-t border-white/10 p-3">
        <button
          className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${theme.text} ${theme.item}`}
          type="submit"
        >
          <LogOut aria-hidden="true" className={theme.mutedText} size={18} />
          Cerrar Sesión
        </button>
      </form>
    </aside>
  );
}
