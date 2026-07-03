export type UsuarioRolNombre =
  | 'tecnico'
  | 'supervisor'
  | 'calidad'
  | 'gerencia'
  | 'auditor'
  | 'Administrador'
  | 'Administrativo'
  | 'Propietario / Gerencia'
  | 'Calidad'
  | 'Supervisor'
  | 'Tecnico'
  | 'Temporal';

export type UsuarioTipo = 'Interno' | 'Externo';

export interface UsuarioRol {
  id: number;
  created_at: string;
  user_email: string;
  full_name: string;
  job_title: string;
  role: UsuarioRolNombre;
  user_type: UsuarioTipo;
  site: string | null;
  area: string;
  can_create_assets: boolean;
  can_execute_maintenance: boolean;
  can_review: boolean;
  can_approve: boolean;
  can_view_audit: boolean;
  can_access_forensic_sheet?: boolean;
  can_export_controlled_copies?: boolean;
  can_manage_users: boolean;
  requires_2fa: boolean;
  active: boolean;
  notes: string;
}
