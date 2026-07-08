import { APP_ROUTES } from '@/modules/common/routes';
import type { NavigationNode, PharmaOpsRole, SidebarTheme } from './navigation.interface';

const ROLE_TECNICO = 'T\u00e9cnico';
const ROLE_PRODUCCION = 'Producci\u00f3n';
const ROLE_TECNICO_DOUBLE_ENCODED = 'T\u00c3\u0192\u00c2\u00a9cnico';
const ROLE_PRODUCCION_DOUBLE_ENCODED = 'Producci\u00c3\u0192\u00c2\u00b3n';

const slateTheme: SidebarTheme = {
  shell: 'bg-slate-900',
  item: 'hover:bg-slate-800',
  itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  text: 'text-white',
  mutedText: 'text-slate-300',
  border: 'border-slate-800',
};

export const ROLE_SIDEBAR_THEME = {
  [ROLE_TECNICO]: {
    ...slateTheme,
    mutedText: 'text-slate-300',
    itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  },
  Calidad: {
    ...slateTheme,
    mutedText: 'text-emerald-200',
    itemActive: 'bg-slate-800 border-l-4 border-emerald-500 text-white',
  },
  [ROLE_PRODUCCION]: {
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
} as Record<PharmaOpsRole, SidebarTheme>;

export const DEFAULT_SIDEBAR_THEME = ROLE_SIDEBAR_THEME.Administrativo;

export const ALL_NAVIGATION_ROLES = [
  'Superadmin',
  'Aseguramiento de Calidad',
  ROLE_TECNICO,
  'Administrador',
  'Propietario / Gerencia',
  'Gerente General',
  'Auditor',
  'auditor',
  'Calidad',
  'Supervisor',
  ROLE_TECNICO_DOUBLE_ENCODED,
  'Administrativo',
  ROLE_PRODUCCION_DOUBLE_ENCODED,
  'Temporal',
];

const HVAC_MAINTENANCE_ROLES = [
  'Administrador',
  'Supervisor',
  ROLE_TECNICO,
  'Calidad',
  'Administrativo',
  'Temporal',
];

const HVAC_REVIEW_ROLES = ['Administrador', 'Supervisor', ROLE_TECNICO, 'Calidad', 'Administrativo'];

export const NAVIGATION_TREE: NavigationNode[] = [
  {
    title: 'Panel General',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['*'],
  },
  {
    title: 'Auditor\u00eda',
    href: '/auditoria',
    icon: 'ShieldCheck',
    rolesAllowed: ['Auditor', 'auditor'],
  },
  {
    title: 'Activos',
    href: APP_ROUTES.activos.master,
    icon: 'Layers',
    roles: ALL_NAVIGATION_ROLES,
    children: [
      {
        title: 'Sistemas HVAC',
        href: APP_ROUTES.activos.hvac,
        icon: 'Wind',
        roles: ALL_NAVIGATION_ROLES,
      },
      {
        title: 'Buscador de Expedientes PDAC',
        href: APP_ROUTES.activos.hvacProfileSearch,
        icon: 'Activity',
        roles: ALL_NAVIGATION_ROLES,
      },
      {
        title: 'Gesti\u00f3n de Activos',
        href: '/activos/gestion?action=create',
        icon: 'PlusCircle',
        roles: ['Administrador', 'Administrativo'],
      },
    ],
  },
  {
    title: 'Mantenimientos',
    href: APP_ROUTES.mantenimiento.root,
    icon: 'LayoutDashboard',
    requiredCapabilities: ['can_approve'],
    rolesAllowed: [
      'Superadmin',
      'Administrador',
      'Propietario / Gerencia',
      'Calidad',
      'Supervisor',
      ROLE_TECNICO,
      'Administrativo',
      ROLE_PRODUCCION,
      'Temporal',
    ],
    children: [
      {
        title: 'HVAC',
        icon: 'Wrench',
        rolesAllowed: HVAC_MAINTENANCE_ROLES,
        children: [
          {
            title: 'Activos',
            href: APP_ROUTES.mantenimiento.rui.activo,
            icon: 'Package',
            rolesAllowed: HVAC_MAINTENANCE_ROLES,
          },
          {
            title: 'Enviados',
            href: APP_ROUTES.mantenimiento.rui.enviado,
            icon: 'Send',
            rolesAllowed: HVAC_REVIEW_ROLES,
          },
          {
            title: 'Rechazados',
            href: APP_ROUTES.mantenimiento.rui.rechazado,
            icon: 'AlertTriangle',
            rolesAllowed: HVAC_REVIEW_ROLES,
          },
          {
            title: 'Historial',
            href: APP_ROUTES.mantenimiento.rui.historial,
            icon: 'History',
            rolesAllowed: HVAC_REVIEW_ROLES,
          },
        ],
      },
      {
        title: 'Crear \u00d3rdenes',
        href: APP_ROUTES.mantenimiento.crearOrdenes,
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
        title: 'Auditor\u00eda',
        href: '/dashboard',
        icon: 'Settings',
        rolesAllowed: ['Administrador', 'Propietario / Gerencia', 'Calidad', 'Administrativo'],
      },
    ],
  },
  {
    title: 'Administraci\u00f3n',
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
