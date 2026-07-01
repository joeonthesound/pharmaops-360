# 07 - Firma Electronica, Desvios y Auditoria

## Objetivo

Documentar el mecanismo de firmas electronicas reguladas, rechazo dirigido y auditoria ALCOA+.

## Componentes

- UI firma RUI: [`signature-review-card.tsx`](../../src/app/%28app%29/mantenimiento/[area]/signature-review-card.tsx)
- Acciones mantenimiento: [`src/modules/mantenimiento/actions.ts`](../../src/modules/mantenimiento/actions.ts)
- Panel alterno aprobaciones: [`approval-actions-panel.tsx`](../../src/app/%28app%29/mantenimiento/[area]/aprobar/approval-actions-panel.tsx)

## Firma Electronica

Accion:

```ts
signMaintenanceRecordAction(input)
```

Roles de firma:

- `supervisor`
- `quality`

Acciones:

- `approve`
- `reject`

Requisitos:

- Comentario GxP minimo 10 caracteres para aprobacion.
- Rechazo simple historico requiere comentarios.
- Captura metadata:
  - `deviceTimestamp`
  - `clientIp`
  - `userAgent`

## Rechazo Dirigido

Accion:

```ts
rejectMaintenanceWithDeviationAction(input)
```

Entrada:

- `recordUuid`
- `returnStage`
- `returnStageLabel`
- `deviationDescription`
- `clientMetadata`

Regla de comentario:

- Minimo 15 caracteres.

## Destinos Permitidos

Segun estado actual:

| Estado actual | Destinos permitidos |
| --- | --- |
| `pending_supervisor` | `DRAFT` |
| `pending_quality` | `PENDING_SUPERVISOR`, `DRAFT` |
| `pending_management` | `PENDING_QUALITY`, `PENDING_SUPERVISOR`, `DRAFT` |

## Auditoria

Tablas usadas:

- `mantenimiento_firmas`
- `audit_trail`
- `auditoria_log_cambios`

Para rechazo dirigido se registra en `auditoria_log_cambios`:

- `usuario_email`
- `usuario_id`
- `timestamp`
- `accion: RECHAZAR_CON_DESVIO`
- `justificacion`
- `payload_snapshot`
- `entidad: mantenimientos_registros`
- `entidad_uuid`

`payload_snapshot` incluye:

- `record_uuid`
- `previous_status`
- `next_status`
- `return_stage`
- `return_stage_label`
- `deviation_description`
- `environment_metadata`

## Compensacion Transaccional

Si falla el insert de auditoria despues de actualizar el registro:

- Se intenta revertir `mantenimientos_registros` al estado anterior.
- Se limpia firma/rechazo parcial.
- La accion retorna error.

## Riesgos

- Si la tabla `auditoria_log_cambios` cambia columnas, el rechazo dirigido puede fallar.
- Si se agregan nuevos estados, deben actualizarse:
  - normalizadores
  - timeline
  - destinos permitidos

## Enlaces Relacionados

- [Mantenimiento, RUI y Ciclo de Vida](./05-mantenimiento-rui-ciclo-vida.md)
- [Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
