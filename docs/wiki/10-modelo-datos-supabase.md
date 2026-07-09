# 10 - Modelo de Datos Supabase

## Objetivo

Documentar tablas, responsabilidades y relaciones logicas usadas por PharmaOps 360.

## Tablas Principales

### `activos`

Uso:

- Inventario de activos.
- Dashboard HVAC.
- Ordenes de mantenimiento.

Campos usados:

- `id`
- `uuid`
- `asset_code`
- `asset_name`
- `asset_type`
- `area`
- `site`
- `location_detail`
- `status`
- `version`
- `status_gxp`
- `image_url`
- `next_maintenance_date`

Checkpoint PDAC activo:

- `version`: `int not null default 1`; cuenta la iteracion activa de control de cambios.
- `status_gxp`: `varchar not null default 'APROBADO'`; restringido a `EVALUACIÓN`, `APROBADO`, `RECHAZADO`.
- `image_url`: `text null`; referencia la imagen versionada en el bucket `evidencias-activos`.

Toda consulta para `FORM_ID: FOR-PDAC-REV` debe seleccionar estos campos desde Supabase. No se permiten mocks, aproximaciones de UI ni valores hardcodeados.

### `mantenimientos_registros`

Uso:

- Cabecera de mantenimiento.
- RUI.
- Workflow documental.

Campos usados:

- `id`
- `uuid`
- `record_code`
- `asset_code`
- `template_code`
- `assigned_technician`
- `executed_at`
- `status`
- `notes`
- `supervisor_signed_by`
- `supervisor_signed_at`
- `quality_signed_by`
- `quality_signed_at`
- `management_signed_by`
- `management_signed_at`
- `rejection_comments`

Estados relevantes:

- `draft`
- `PENDING_TECHNICIAN`
- `PENDING_SUPERVISOR`
- `PENDING_QUALITY`
- `PENDING_MANAGEMENT`
- `approved`
- `rejected`
- `RECHAZADO_TECNICO`

### `mantenimiento_plantillas_campos`

Uso:

- Configuracion dinamica de campos por `asset_type`.

Columnas nuevas validadas:

- `asset_type`
- `seccion_nombre`
- `campo_nombre`
- `tipo_dato`
- `unidad_medida`

Tipos de dato:

- `OK_NOK`
- `NUMERIC`
- `TEXT`

### `formularios_campos`

Uso historico:

- Campos de checklist HVAC anterior.
- Lectura RUI heredada.

### `formularios_respuestas`

Uso:

- Respuestas EAV por mantenimiento.
- Evidencias via `valor_texto`.

Campos usados:

- `mantenimiento_id`
- `campo_id`
- `valor_texto`
- `valor_seleccion`
- `valor_numerico`
- `valor_booleano`

### `usuarios_roles`

Uso:

- Perfil visible.
- Capacidades.
- Control IAM.

Capacidades clave:

- `can_create_assets`
- `can_execute_maintenance`
- `can_review`
- `can_approve`
- `can_view_audit`
- `can_access_forensic_sheet`
- `can_export_controlled_copies`
- `can_manage_users`

Roles canonicos:

- `tecnico`
- `supervisor`
- `calidad`
- `gerencia`
- `auditor`

### `mantenimientos_registros.notes`

`notes` se trata como bloque JSON serializado para extensiones compatibles sin migrar columnas en cada iteracion.

Nodos actuales:

- `progress_step`: paso documental.
- `gxp_workflow_comments`: comentarios de firma por rol.
- `print_metadata`: contador y metadata de impresiones controladas.

Ejemplo:

```json
{
  "progress_step": 3,
  "gxp_workflow_comments": {
    "supervisor": {
      "action": "approve",
      "comment": "Revision tecnica conforme.",
      "signer_email": "supervisor@planta.com",
      "signed_at_utc": "2026-07-02T00:00:00.000Z"
    }
  },
  "print_metadata": {
    "count": 2,
    "last_printed_at_utc": "2026-07-02T00:00:00.000Z",
    "last_printed_by": "auditor@externo.com"
  }
}
```

### `auditoria_log_cambios`

Uso:

- Auditoria GxP de cambios regulados.
- Gestion de activos.
- Rechazo dirigido.

### `access_denied_logs`

Uso:

- Registro historico de accesos denegados a rutas sensibles.

Campos usados:

- `user_id`
- `user_role`
- `target_url`
- `server_utc_timestamp`

## Storage

Bucket:

```txt
evidencias-mantenimiento
evidencias-activos
```

## Relaciones Logicas

- `activos.asset_code` -> `mantenimientos_registros.asset_code`
- `mantenimientos_registros.id` -> `formularios_respuestas.mantenimiento_id`
- `formularios_campos.id` -> `formularios_respuestas.campo_id`
- `activos.asset_type` -> `mantenimiento_plantillas_campos.asset_type`

## Enlaces Relacionados

- [Crear Ordenes y Plantillas Dinamicas](./06-crear-ordenes-plantillas.md)
- [Firma Electronica, Desvios y Auditoria](./07-firma-electronica-desvios-auditoria.md)
- [Supabase: Definicion y Replicacion de Base de Datos](./12-supabase-replicacion-db.md)
- [Control de Cambios de Activos PDAC](./16-control-cambios-activos-pdac.md)
