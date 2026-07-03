export type ActivoTipo = 'Mantenimiento de aire acondicionado';

export type ActivoEstado = 'Operativo' | 'En mantenimiento' | 'Fuera de servicio';

export type FrecuenciaMantenimiento = 'Mensual' | 'Trimestral';

export interface Activo {
  id: number;
  created_at: string;
  asset_code: string;
  asset_name: string;
  asset_type: ActivoTipo;
  site: string | null;
  area: string;
  location_detail: string | null;
  brand: string;
  model: string;
  serial_number: string;
  capacity: string;
  capacity_unit: string;
  installation_date: string | null;
  status: ActivoEstado;
  maintenance_frequency: FrecuenciaMantenimiento;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  internal_responsible: string | null;
  technical_provider: string | null;
  qr_possible: boolean;
  notes: string;
  asset_reference_image_url?: string | null;
  critical_operational_thresholds?: string | null;
  operating_thresholds?: string | null;
}
