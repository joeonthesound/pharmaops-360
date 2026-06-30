'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Send,
  Users,
  Wrench,
} from 'lucide-react';
import {
  DEFAULT_SIDEBAR_THEME,
  NAVIGATION_TREE,
  ROLE_SIDEBAR_THEME,
} from './navigation.config';
import { signOutAction } from '@/modules/common/actions';
import type { NavigationNode, PharmaOpsRole, SidebarTheme } from './navigation.interface';
import { filterNavigationByRole } from './navigation.utils';

type SidebarProps = {
  currentRole: string;
  currentPath?: string;
};

const iconMap = {
  AlertTriangle,
  ClipboardCheck,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Send,
  Users,
  Wrench,
};

function isKnownRole(role: string): role is PharmaOpsRole {
  return role in ROLE_SIDEBAR_THEME;
}

function resolveTheme(role: string): SidebarTheme {
  return isKnownRole(role) ? ROLE_SIDEBAR_THEME[role] : DEFAULT_SIDEBAR_THEME;
}

function NavigationIcon({ name, className }: { name?: string; className: string }) {
  if (!name || !(name in iconMap)) {
    return null;
  }

  const Icon = iconMap[name as keyof typeof iconMap];
  return <Icon aria-hidden="true" className={className} size={18} strokeWidth={2} />;
}

export function Sidebar({ currentRole, currentPath = '' }: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const theme = resolveTheme(currentRole);
  const navigation = useMemo(
    () => filterNavigationByRole(NAVIGATION_TREE, currentRole),
    [currentRole],
  );

  function toggleMenu(title: string) {
    setOpenMenus((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  function renderNode(node: NavigationNode, depth = 0) {
    const hasChildren = Boolean(node.children?.length);
    const isOpen = Boolean(openMenus[node.title]);
    const isActive = Boolean(node.href && currentPath === node.href);
    const paddingClass = depth === 0 ? 'px-3' : depth === 1 ? 'pl-4 pr-3' : 'pl-8 pr-3';
    const itemClass = `${paddingClass} flex min-h-11 w-full items-center justify-between rounded-md py-2 text-left text-sm font-semibold transition ${theme.text} ${
      isActive ? theme.itemActive : theme.item
    }`;

    if (hasChildren) {
      return (
        <div key={node.title}>
          <div className={itemClass}>
            {node.href ? (
              <Link className="flex min-w-0 flex-1 items-center gap-3" href={node.href}>
                <NavigationIcon className={theme.mutedText} name={node.icon} />
                <span className="truncate">{node.title}</span>
              </Link>
            ) : (
              <button
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => toggleMenu(node.title)}
                type="button"
              >
                <NavigationIcon className={theme.mutedText} name={node.icon} />
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
                className={`transition ${theme.mutedText} ${isOpen ? 'rotate-180' : ''}`}
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

    return (
      <Link className={itemClass} href={node.href} key={node.title}>
        <span className="flex items-center gap-3">
          <NavigationIcon className={theme.mutedText} name={node.icon} />
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
