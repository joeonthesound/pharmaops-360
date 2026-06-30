'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Menu } from 'lucide-react';
import { Sidebar } from './sidebar';

type AppShellProps = {
  children: React.ReactNode;
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

export function AppShell({ children, currentRole, currentUserName }: AppShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const initials = getInitials(currentUserName || 'P360') || 'P';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden print:hidden md:fixed md:inset-y-0 md:left-0 md:block md:w-72">
        <Sidebar currentRole={currentRole} currentPath={pathname} />
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
            <Sidebar currentRole={currentRole} currentPath={pathname} />
          </div>
        </div>
      ) : null}

      <div className="min-h-screen md:pl-72 print:pl-0">
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
              <div className="flex h-11 max-w-xl items-center rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600">
                Planta Central / Labymed / Operación HVAC
              </div>
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

            <div className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-slate-950">{currentUserName}</p>
                <p className="truncate text-xs text-slate-500">{currentRole}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
