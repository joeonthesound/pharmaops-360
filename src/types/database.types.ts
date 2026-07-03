export type NotificationRoleContext = 'technician' | 'supervisor' | 'quality' | 'management';

export type NotificationSeverity = 'info' | 'warning' | 'critical_gxp';

export type NotificacionesRow = {
  id: string;
  user_id: string;
  role_context: NotificationRoleContext;
  title: string;
  message: string;
  severity: NotificationSeverity;
  related_record_code: string | null;
  is_read: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      notificaciones: {
        Row: NotificacionesRow;
        Insert: Omit<NotificacionesRow, 'id' | 'created_at' | 'is_read'> & {
          id?: string;
          created_at?: string;
          is_read?: boolean;
        };
        Update: Partial<Omit<NotificacionesRow, 'id' | 'user_id' | 'created_at'>>;
      };
    };
    Enums: {
      notification_role_context: NotificationRoleContext;
      notification_severity: NotificationSeverity;
    };
  };
};
