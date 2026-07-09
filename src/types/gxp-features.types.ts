export interface MasterFeature {
  id: number;
  nombre_parametro: string;
  text_label_frontend: string;
  unidad_medida: string;
  tipo_dato: 'NUMERIC' | 'TEXT' | 'BOOLEAN';
  limite_alerta: number | null;
  limite_accion: number | null;
  activa: boolean;
  version: number;
}

export interface FeatureValue {
  id: number;
  order_id: string;
  caracteristica_id: number;
  valor_registrado: string;
  updated_at: string;
}
