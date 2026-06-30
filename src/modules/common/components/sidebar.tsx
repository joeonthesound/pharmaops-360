'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
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
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
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
    const paddingClass = depth === 0 ? 'px-3' : 'pl-8 pr-3';
    const itemClass = `${paddingClass} flex min-h-11 w-full items-center justify-between rounded-md py-2 text-left text-sm font-semibold transition ${theme.text} ${
      isActive ? theme.itemActive : theme.item
    }`;

    if (hasChildren) {
      return (
        <div key={node.title}>
          <button className={itemClass} onClick={() => toggleMenu(node.title)} type="button">
            <span className="flex items-center gap-3">
              <NavigationIcon className={theme.mutedText} name={node.icon} />
              {node.title}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`transition ${theme.mutedText} ${isOpen ? 'rotate-180' : ''}`}
              size={16}
            />
          </button>
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
