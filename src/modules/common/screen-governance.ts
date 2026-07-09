export type InterfaceIdentifierKind = 'FORM_ID' | 'SCREEN_ID';

export type InterfaceIdentifier = {
  kind: InterfaceIdentifierKind;
  value: string;
};

export type RuiRouteGovernanceMetadata = {
  path: string;
  title: string;
  tooltip: string;
  documentationHref: string;
};

const STATIC_INTERFACE_IDENTIFIERS: Record<string, InterfaceIdentifier> = {
  '/login': { kind: 'FORM_ID', value: 'FOR-AUTH-LOGIN' },
  '/dashboard': { kind: 'SCREEN_ID', value: 'SCREEN-GLOBAL-DASH' },
  '/auditoria': { kind: 'SCREEN_ID', value: 'SCREEN-AUDIT-TRAIL' },
  '/activos': { kind: 'SCREEN_ID', value: 'SCREEN-ASSET-HUB' },
  '/activos/gestion': { kind: 'FORM_ID', value: 'FOR-MNT-HVAC-CREATE' },
  '/activos/hvac': { kind: 'FORM_ID', value: 'FOR-MNT-HVAC-DASH' },
  '/activos/hvac/ver': { kind: 'SCREEN_ID', value: 'SCREEN-HVAC-ASSET-PROFILE' },
  '/mantenimiento': { kind: 'SCREEN_ID', value: 'SCREEN-MNT-MASTER' },
  '/mantenimiento/crear-ordenes': { kind: 'FORM_ID', value: 'FOR-MNT-ORDER-GENERATOR' },
  '/mantenimiento/hvac/rui/activo': { kind: 'SCREEN_ID', value: 'SCREEN-MNT-RUI-ACTIVE' },
  '/mantenimiento/hvac/rui/ht': { kind: 'SCREEN_ID', value: 'SCREEN-MNT-RUI-LIST' },
  '/mantenimiento/hvac/rui/enviado': { kind: 'SCREEN_ID', value: 'SCREEN-SIGN-SUCCESS' },
  '/mantenimiento/hvac/rui/rechazado': { kind: 'SCREEN_ID', value: 'SCREEN-SIGN-REJECTED' },
  '/admin/hub-firmas': { kind: 'SCREEN_ID', value: 'SCREEN-ADM-SIGN-HUB' },
  '/admin/usuarios': { kind: 'SCREEN_ID', value: 'SCREEN-ADM-USERS-LIST' },
  '/admin/usuarios/nuevo': { kind: 'FORM_ID', value: 'FOR-ADM-USER-MUTATE' },
  '/admin/mantenimiento/reset': { kind: 'FORM_ID', value: 'FOR-ADM-RESET-WIZARD' },
  '/admin/user': { kind: 'SCREEN_ID', value: 'SCREEN-ADM-ROLE-PREVIEW' },
  '/admin/user/technician': { kind: 'SCREEN_ID', value: 'SCREEN-ADM-ROLE-PREVIEW' },
};

export const RUI_ROUTE_GOVERNANCE_METADATA = {
  pending: {
    path: '/mantenimiento/hvac/rui/activo',
    title: 'Monitoreo GxP de Ordenes HVAC Activas',
    tooltip:
      'Bandeja controlada para activos HVAC con ordenes RUI pendientes de ejecucion, firma tecnica o avance de ciclo bajo trazabilidad GxP.',
    documentationHref: '/docs/sop/hvac-active-monitoring',
  },
  sent: {
    path: '/mantenimiento/hvac/rui/enviado',
    title: 'Control GxP de Ordenes HVAC Enviadas',
    tooltip:
      'Vista de seguimiento para ordenes RUI ya remitidas a revision, con foco en firmas pendientes, tiempos de aprobacion y continuidad documental.',
    documentationHref: '/docs/sop/hvac-sent-signature-review',
  },
  rejected: {
    path: '/mantenimiento/hvac/rui/rechazado',
    title: 'Gestion GxP de Ordenes HVAC Rechazadas',
    tooltip:
      'Registro operacional de desviaciones, rechazos tecnicos y reinspecciones requeridas antes de reactivar o cerrar una orden RUI.',
    documentationHref: '/docs/sop/hvac-rejected-deviation-control',
  },
  history: {
    path: '/mantenimiento/hvac/rui/ht',
    title: 'Historial Tecnico GxP de Ordenes HVAC',
    tooltip:
      'Archivo historico para consulta auditada de ordenes RUI, evidencias, firmas y estados finales asociados al mantenimiento HVAC.',
    documentationHref: '/docs/sop/hvac-technical-history',
  },
} as const satisfies Record<string, RuiRouteGovernanceMetadata>;

function normalizePathname(pathname: string) {
  const [pathWithoutQuery] = pathname.split(/[?#]/);
  const normalizedPath = pathWithoutQuery.trim().replace(/\/+$/, '');

  return normalizedPath || '/';
}

function hasSingleDynamicSegment(pathname: string, prefix: string) {
  const normalizedPrefix = normalizePathname(prefix);

  if (!pathname.startsWith(`${normalizedPrefix}/`)) {
    return false;
  }

  const remainder = pathname.slice(normalizedPrefix.length + 1);

  return remainder.length > 0 && !remainder.includes('/');
}

export function resolveInterfaceIdentifier(pathname: string): InterfaceIdentifier | null {
  const normalizedPathname = normalizePathname(pathname);
  const staticIdentifier = STATIC_INTERFACE_IDENTIFIERS[normalizedPathname];

  if (staticIdentifier) {
    return staticIdentifier;
  }

  if (hasSingleDynamicSegment(normalizedPathname, '/activos/hvac/ver')) {
    return { kind: 'FORM_ID', value: 'FOR-MNT-HVAC-REV' };
  }

  if (hasSingleDynamicSegment(normalizedPathname, '/activos/hvac/ver') === false) {
    const changeControlPrefix = '/activos/hvac/ver/';
    const changeControlSuffix = '/control-cambios';

    if (
      normalizedPathname.startsWith(changeControlPrefix) &&
      normalizedPathname.endsWith(changeControlSuffix)
    ) {
      const routeId = normalizedPathname.slice(
        changeControlPrefix.length,
        -changeControlSuffix.length,
      );

      if (routeId && !routeId.includes('/')) {
        return { kind: 'FORM_ID', value: 'FOR-PDAC-CC' };
      }
    }
  }

  if (hasSingleDynamicSegment(normalizedPathname, '/mantenimiento/hvac/rui/ht')) {
    return { kind: 'FORM_ID', value: 'FOR-MNT-HVAC-TECH' };
  }

  if (hasSingleDynamicSegment(normalizedPathname, '/admin/hub-firmas')) {
    return { kind: 'SCREEN_ID', value: 'SCREEN-QA-REVIEW' };
  }

  if (hasSingleDynamicSegment(normalizedPathname, '/admin/usuarios')) {
    return { kind: 'FORM_ID', value: 'FOR-ADM-USER-MUTATE' };
  }

  return null;
}

export const CHANGE_CONTROL_INTERFACE_IDENTIFIER = {
  kind: 'FORM_ID',
  value: 'FOR-PDAC-CC',
} as const;
