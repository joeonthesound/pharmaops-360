import type { NavigationNode, PharmaOpsRole, SidebarTheme } from './navigation.interface';

const slateTheme: SidebarTheme = {
  shell: 'bg-slate-900',
  item: 'hover:bg-slate-800',
  itemActive: 'bg-slate-950 border-l-2 border-orange-500',
  text: 'text-white',
  mutedText: 'text-slate-300',
  border: 'border-slate-800',
};

export const ROLE_SIDEBAR_THEME: Record<PharmaOpsRole, SidebarTheme> = {
  Técnico: {
    ...slateTheme,
    mutedText: 'text-orange-200',
    itemActive: 'bg-slate-950 border-l-2 border-orange-500 text-white',
  },
  Calidad: {
    ...slateTheme,
    mutedText: 'text-emerald-200',
    itemActive: 'bg-slate-950 border-l-2 border-emerald-500 text-white',
  },
  Producción: {
    ...slateTheme,
    mutedText: 'text-red-200',
    itemActive: 'bg-slate-950 border-l-2 border-red-500 text-white',
  },
  Administrativo: slateTheme,
  Administrador: slateTheme,
  Supervisor: {
    ...slateTheme,
    mutedText: 'text-orange-200',
    itemActive: 'bg-slate-950 border-l-2 border-orange-500 text-white',
  },
  Temporal: {
    ...slateTheme,
    mutedText: 'text-amber-200',
    itemActive: 'bg-slate-950 border-l-2 border-amber-500 text-white',
  },
  'Propietario / Gerencia': slateTheme,
};

export const DEFAULT_SIDEBAR_THEME = ROLE_SIDEBAR_THEME.Administrativo;

export const NAVIGATION_TREE: NavigationNode[] = [
  {
    title: 'Mantenimientos',
    href: '/mantenimiento',
    icon: 'LayoutDashboard',
    rolesAllowed: [
      'Administrador',
      'Propietario / Gerencia',
      'Calidad',
      'Supervisor',
      'Técnico',
      'Administrativo',
      'Producción',
      'Temporal',
    ],
    children: [
      {
        title: 'HVAC',
        icon: 'Wrench',
        rolesAllowed: ['Administrador', 'Supervisor', 'Técnico', 'Calidad', 'Administrativo', 'Temporal'],
        children: [
          {
            title: 'Activos',
            href: '/mantenimiento/hvac/activos?view=pending',
            icon: 'Package',
            rolesAllowed: ['Administrador', 'Supervisor', 'Técnico', 'Calidad', 'Administrativo', 'Temporal'],
          },
          {
            title: 'Enviados',
            href: '/mantenimiento/hvac/activos?view=sent',
            icon: 'Send',
            rolesAllowed: ['Administrador', 'Supervisor', 'Técnico', 'Calidad', 'Administrativo'],
          },
          {
            title: 'Rechazados',
            href: '/mantenimiento/hvac/activos?view=rejected',
            icon: 'AlertTriangle',
            rolesAllowed: ['Administrador', 'Supervisor', 'Técnico', 'Calidad', 'Administrativo'],
          },
          {
            title: 'Historial',
            href: '/mantenimiento/hvac/activos?view=history',
            icon: 'History',
            rolesAllowed: ['Administrador', 'Supervisor', 'Técnico', 'Calidad', 'Administrativo'],
          },
        ],
      },
    ],
  },
  {
    title: 'Calidad',
    icon: 'ShieldCheck',
    rolesAllowed: ['Administrador', 'Propietario / Gerencia', 'Calidad', 'Administrativo'],
    children: [
      {
        title: 'Aprobaciones',
        href: '/dashboard?view=sent',
        icon: 'ClipboardCheck',
        rolesAllowed: ['Administrador', 'Propietario / Gerencia', 'Calidad', 'Administrativo'],
      },
      {
        title: 'Auditoría',
        href: '/dashboard',
        icon: 'Settings',
        rolesAllowed: ['Administrador', 'Propietario / Gerencia', 'Calidad', 'Administrativo'],
      },
    ],
  },
  {
    title: 'Administración',
    icon: 'Settings',
    rolesAllowed: ['Administrador', 'Administrativo', 'Propietario / Gerencia'],
    children: [
      {
        title: 'Usuarios y Roles',
        href: '/admin/usuarios',
        icon: 'Users',
        rolesAllowed: ['Administrador', 'Administrativo'],
      },
    ],
  },
];
