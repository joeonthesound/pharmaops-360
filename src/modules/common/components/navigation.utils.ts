import type { NavigationNode } from './navigation.interface';

export function filterNavigationByRole(
  nodes: NavigationNode[],
  role: string,
): NavigationNode[] {
  return nodes.flatMap((node) => {
    if (!node.rolesAllowed.includes(role)) {
      return [];
    }

    const children = node.children
      ? filterNavigationByRole(node.children, role)
      : undefined;

    return [{ ...node, children }];
  });
}
