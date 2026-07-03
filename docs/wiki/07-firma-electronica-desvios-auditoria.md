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
- `management`

Acciones:

- `approve`
- `reject`

Requisitos:

- Comentario GxP minimo 10 caracteres para aprobacion.
- Rechazo simple historico requiere comentarios.
- El comentario de aprobacion se conserva en `notes.gxp_workflow_comments[rol]`.
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

Eventos principales:

- `SIGN_APPROVE`: firma electronica afirmativa.
- `SIGN_REJECT`: rechazo de etapa.
- `RECHAZAR_CON_DESVIO`: rechazo dirigido con retorno controlado.
- `PRINT_CONTROLLED_COPY`: apertura de vista de impresion controlada.

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

## Comentarios y Observaciones

Cada firma debe mostrar un bloque "Comentario de Validacion GxP" debajo de "GXP LEGAL MEANING".

Orden de reconciliacion en UI:

1. `notes.gxp_workflow_comments.<rol>.comment`
2. Comentarios o justificacion presentes en nodos de `audit_trail` o `mantenimiento_firmas`
3. `rejection_comments`
4. Fallback: `Sin observaciones documentadas.`

Esto permite que filas heredadas sigan siendo legibles aunque no tengan el nodo JSON nuevo.

## Copias Controladas

La accion de impresion regulada se audita antes de entregar la vista final al usuario.

Metadata minima:

- `print_index`
- `target_rui`
- `timestamp`
- `operator_identity`
- `role_attribution`

Si el rol del solicitante es `auditor`, la vista impresa debe incluir marca de agua: `COPIA CONTROLADA - EXCLUSIVO PARA AUDITORIA`.

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
- [Portal Auditor y Copias Controladas](./14-portal-auditor-copias-controladas.md)
