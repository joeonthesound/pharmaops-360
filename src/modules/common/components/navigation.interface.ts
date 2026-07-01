export interface NavigationNode {
  title: string;
  href?: string;
  icon?: string;
  roles?: string[];
  rolesAllowed?: string[];
  requiredCapabilities?: Array<'can_approve' | 'can_create_assets'>;
  children?: NavigationNode[];
}

export type NavigationCapabilities = {
  can_approve?: boolean;
  can_create_assets?: boolean;
};

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
