import type { NavigationCapabilities, NavigationNode } from './navigation.interface';

function normalizeRole(role: string) {
  return role
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ã©/g, 'e')
    .replace(/Ã³/g, 'o')
    .trim()
    .toLowerCase();
}

function getRoleAliases(role: string) {
  const normalizedRole = normalizeRole(role);
  const aliases = new Set([normalizedRole]);

  if (
    normalizedRole.includes('superadmin') ||
    normalizedRole.includes('superusuario') ||
    normalizedRole.includes('administrador top') ||
    normalizedRole.includes('top admin') ||
    normalizedRole.includes('root')
  ) {
    aliases.add('superadmin');
    aliases.add('superusuario');
    aliases.add('administrador top');
  }

  if (
    normalizedRole.includes('administrador') &&
    !normalizedRole.includes('administrador top')
  ) {
    aliases.add('administrador');
  }

  if (normalizedRole.includes('aseguramiento') || normalizedRole.includes('calidad')) {
    aliases.add('aseguramiento de calidad');
    aliases.add('calidad');
  }

  if (normalizedRole.includes('propietario') || normalizedRole.includes('gerencia')) {
    aliases.add('propietario / gerencia');
  }

  if (normalizedRole.includes('gerente general')) {
    aliases.add('gerente general');
  }

  if (normalizedRole.includes('tecnico') || normalizedRole.includes('tecnico')) {
    aliases.add('tecnico');
  }

  if (normalizedRole.includes('auditor')) {
    aliases.add('auditor');
  }

  return aliases;
}

function getNodeRoles(node: NavigationNode) {
  return node.roles ?? node.rolesAllowed ?? [];
}

function hasRequiredCapabilities(
  node: NavigationNode,
  capabilities: NavigationCapabilities = {},
) {
  const requiredCapabilities = node.requiredCapabilities ?? [];

  if (requiredCapabilities.length === 0) {
    return false;
  }

  return requiredCapabilities.some((capability) => capabilities[capability] === true);
}

function canDisplayNode(
  node: NavigationNode,
  role: string,
  capabilities: NavigationCapabilities = {},
) {
  if (hasRequiredCapabilities(node, capabilities)) {
    return true;
  }

  const nodeRoles = getNodeRoles(node);

  if (nodeRoles.length === 0 || nodeRoles.includes('*')) {
    return true;
  }

  if (nodeRoles.length === 1 && normalizeRole(nodeRoles[0] ?? '') === 'superadmin') {
    return role.trim() === 'Superadmin';
  }

  const roleAliases = getRoleAliases(role);

  return nodeRoles.some((nodeRole) => roleAliases.has(normalizeRole(nodeRole)));
}

export function filterNavigationByRole(
  nodes: NavigationNode[],
  role: string,
  capabilities: NavigationCapabilities = {},
): NavigationNode[] {
  return nodes.flatMap((node) => {
    if (!canDisplayNode(node, role, capabilities)) {
      return [];
    }

    const children = node.children
      ? filterNavigationByRole(node.children, role, capabilities)
      : undefined;

    if (node.children?.length && !node.href && (!children || children.length === 0)) {
      return [];
    }

    return [{ ...node, children }];
  });
}
