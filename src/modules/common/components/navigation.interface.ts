export interface NavigationNode {
  title: string;
  href?: string;
  icon?: string;
  roles?: string[];
  rolesAllowed?: string[];
  children?: NavigationNode[];
}

export type PharmaOpsRole =
  | 'Técnico'
  | 'Calidad'
  | 'Producción'
  | 'Administrativo'
  | 'Administrador'
  | 'Supervisor'
  | 'Temporal'
  | 'Propietario / Gerencia';

export type SidebarTheme = {
  shell: string;
  item: string;
  itemActive: string;
  text: string;
  mutedText: string;
  border: string;
};
