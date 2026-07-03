import type { NavigationNode, PharmaOpsRole, SidebarTheme } from './navigation.interface';

const slateTheme: SidebarTheme = {
  shell: 'bg-slate-900',
  item: 'hover:bg-slate-800',
  itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  text: 'text-white',
  mutedText: 'text-slate-300',
  border: 'border-slate-800',
};

export const ROLE_SIDEBAR_THEME: Record<PharmaOpsRole, SidebarTheme> = {
  Técnico: {
    ...slateTheme,
    mutedText: 'text-slate-300',
    itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  },
  Calidad: {
    ...slateTheme,
    mutedText: 'text-emerald-200',
    itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  },
  Producción: {
    ...slateTheme,
    mutedText: 'text-red-200',
    itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  },
  Administrativo: slateTheme,
  Administrador: slateTheme,
  Auditor: {
    ...slateTheme,
    mutedText: 'text-emerald-200',
    itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  },
  Supervisor: {
    ...slateTheme,
    mutedText: 'text-slate-300',
    itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  },
  Temporal: {
    ...slateTheme,
    mutedText: 'text-amber-200',
    itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  },
  'Propietario / Gerencia': slateTheme,
};

export const DEFAULT_SIDEBAR_THEME = ROLE_SIDEBAR_THEME.Administrativo;

export const ALL_NAVIGATION_ROLES = [
  'Superadmin',
  'Aseguramiento de Calidad',
  'Técnico',
  'Administrador',
  'Propietario / Gerencia',
  'Gerente General',
  'Auditor',
  'auditor',
  'Calidad',
  'Supervisor',
  'TÃ©cnico',
  'Administrativo',
  'ProducciÃ³n',
  'Temporal',
];

export const NAVIGATION_TREE: NavigationNode[] = [
  {
    title: 'Panel General',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['*'],
  },
  {
    title: 'Auditoría',
    href: '/auditoria',
    icon: 'ShieldCheck',
    rolesAllowed: ['Auditor', 'auditor'],
  },
  {
    title: 'Activos',
    href: '/activos',
    icon: 'Layers',
    roles: ALL_NAVIGATION_ROLES,
    children: [
      {
        title: 'Sistemas HVAC',
        href: '/activos/hvac',
        icon: 'Wind',
        roles: ALL_NAVIGATION_ROLES,
        children: [
          {
            title: 'Documento Único de Inspección',
            href: '/activos/hvac/ver/[uuid]',
            icon: 'Activity',
            roles: ALL_NAVIGATION_ROLES,
          },
        ],
      },
      {
        title: 'Gestión de Activos',
        href: '/activos/gestion?action=create',
        icon: 'PlusCircle',
        roles: ['Administrador', 'Administrativo'],
      },
    ],
  },
  {
    title: 'Mantenimientos',
    href: '/mantenimiento',
    icon: 'LayoutDashboard',
    requiredCapabilities: ['can_approve'],
    rolesAllowed: [
      'Superadmin',
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
            href: '/mantenimiento/hvac/rui/activo',
            icon: 'Package',
            rolesAllowed: ['Administrador', 'Supervisor', 'Técnico', 'Calidad', 'Administrativo', 'Temporal'],
          },
          {
            title: 'Enviados',
            href: '/mantenimiento/hvac/rui/enviado',
            icon: 'Send',
            rolesAllowed: ['Administrador', 'Supervisor', 'Técnico', 'Calidad', 'Administrativo'],
          },
          {
            title: 'Rechazados',
            href: '/mantenimiento/hvac/rui/rechazado',
            icon: 'AlertTriangle',
            rolesAllowed: ['Administrador', 'Supervisor', 'Técnico', 'Calidad', 'Administrativo'],
          },
          {
            title: 'Historial',
            href: '/mantenimiento/hvac/rui/ht',
            icon: 'History',
            rolesAllowed: ['Administrador', 'Supervisor', 'Técnico', 'Calidad', 'Administrativo'],
          },
        ],
      },
      {
        title: 'Crear Órdenes',
        href: '/mantenimiento/crear-ordenes',
        icon: 'FlaskConical',
        requiredCapabilities: ['can_approve'],
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
  {
    title: 'Administracion y Seguridad',
    icon: 'Settings',
    children: [
      {
        title: 'Panel Analitico Admin',
        href: '/admin',
        icon: 'LayoutDashboard',
      },
      {
        title: 'Hub de Perfiles Regulados',
        href: '/admin/user',
        icon: 'Users',
      },
    ],
  },
];
