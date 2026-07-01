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
- `next_maintenance_date`

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
```

## Relaciones Logicas

- `activos.asset_code` -> `mantenimientos_registros.asset_code`
- `mantenimientos_registros.id` -> `formularios_respuestas.mantenimiento_id`
- `formularios_campos.id` -> `formularios_respuestas.campo_id`
- `activos.asset_type` -> `mantenimiento_plantillas_campos.asset_type`

## Enlaces Relacionados

- [Crear Ordenes y Plantillas Dinamicas](./06-crear-ordenes-plantillas.md)
- [Firma Electronica, Desvios y Auditoria](./07-firma-electronica-desvios-auditoria.md)
