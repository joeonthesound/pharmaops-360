import type { NavigationNode } from './navigation.interface';

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

  if (normalizedRole.includes('superadmin') || normalizedRole.includes('administrador')) {
    aliases.add('superadmin');
    aliases.add('administrador');
  }

  if (normalizedRole.includes('aseguramiento') || normalizedRole.includes('calidad')) {
    aliases.add('aseguramiento de calidad');
    aliases.add('calidad');
  }

  if (normalizedRole.includes('tecnico') || normalizedRole.includes('tecnico')) {
    aliases.add('tecnico');
  }

  return aliases;
}

function getNodeRoles(node: NavigationNode) {
  return node.roles ?? node.rolesAllowed ?? [];
}

function canDisplayNode(node: NavigationNode, role: string) {
  const nodeRoles = getNodeRoles(node);

  if (nodeRoles.length === 0 || nodeRoles.includes('*')) {
    return true;
  }

  const roleAliases = getRoleAliases(role);

  return nodeRoles.some((nodeRole) => roleAliases.has(normalizeRole(nodeRole)));
}

export function filterNavigationByRole(
  nodes: NavigationNode[],
  role: string,
): NavigationNode[] {
  return nodes.flatMap((node) => {
    if (!canDisplayNode(node, role)) {
      return [];
    }

    const children = node.children
      ? filterNavigationByRole(node.children, role)
      : undefined;

    return [{ ...node, children }];
  });
}
