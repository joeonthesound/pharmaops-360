# 05 - Mantenimiento, RUI y Ciclo de Vida

## Objetivo

Documentar el modulo de mantenimiento, inspecciones RUI y ciclo de vida del documento.

## Rutas

- Mantenimiento home: [`src/app/(app)/mantenimiento/page.tsx`](../../src/app/%28app%29/mantenimiento/page.tsx)
- Crear ordenes: [`src/app/(app)/mantenimiento/crear-ordenes/page.tsx`](../../src/app/%28app%29/mantenimiento/crear-ordenes/page.tsx)
- Plantillas: [`src/app/(app)/mantenimiento/plantillas/page.tsx`](../../src/app/%28app%29/mantenimiento/plantillas/page.tsx)
- Inspeccion dinamica: [`src/app/(app)/mantenimiento/[area]/page.tsx`](../../src/app/%28app%29/mantenimiento/[area]/page.tsx)
- RUI por estado: [`src/app/(app)/mantenimiento/[area]/rui/[status]/page.tsx`](../../src/app/%28app%29/mantenimiento/[area]/rui/[status]/page.tsx)
- RUI detalle: [`src/app/(app)/mantenimiento/[area]/rui/[status]/[id]/page.tsx`](../../src/app/%28app%29/mantenimiento/[area]/rui/[status]/[id]/page.tsx)

## Estados Documentales

Estados normalizados en UI:

- `draft`
- `pending_supervisor`
- `pending_quality`
- `pending_management`
- `approved`
- `rejected`

Estados externos soportados:

- `PENDING_SUPERVISOR`
- `PENDING_QUALITY`
- `PENDING_MANAGEMENT`
- `RECHAZADO_TECNICO`
- variantes en espanol como `pendiente_supervisor`

## Timeline

Etapas:

1. Tecnico - Confeccion
2. Supervisor - Revision
3. Calidad - Liberacion GxP
4. Gerencia - Cierre de Acta

Componente:

- `ApprovalTimelineGraphic` dentro de [`src/app/(app)/mantenimiento/[area]/page.tsx`](../../src/app/%28app%29/mantenimiento/[area]/page.tsx)

## RUI View

La vista RUI tiene dos layouts:

- Layout compacto read-only.
- Layout documental estandar.

Riesgo corregido:

- Las acciones de firma estaban en el layout documental, pero `pending_supervisor` renderizaba el layout compacto. Se integraron `SignatureReviewCard` en el layout activo.

## Componentes RUI

- Checklist: [`checklist-form.tsx`](../../src/app/%28app%29/mantenimiento/[area]/checklist-form.tsx)
- Copiar RUI: [`copy-rui-button.tsx`](../../src/app/%28app%29/mantenimiento/[area]/copy-rui-button.tsx)
- Galeria evidencia: [`evidence-photo-gallery.tsx`](../../src/app/%28app%29/mantenimiento/[area]/evidence-photo-gallery.tsx)
- Boton imprimir: [`print-report-button.tsx`](../../src/app/%28app%29/mantenimiento/[area]/print-report-button.tsx)
- Firma: [`signature-review-card.tsx`](../../src/app/%28app%29/mantenimiento/[area]/signature-review-card.tsx)

## Tablas

- `mantenimientos_registros`
- `formularios_campos`
- `formularios_respuestas`
- `mantenimiento_plantillas_campos`

## Enlaces Relacionados

- [Crear Ordenes y Plantillas Dinamicas](./06-crear-ordenes-plantillas.md)
- [Firma Electronica, Desvios y Auditoria](./07-firma-electronica-desvios-auditoria.md)
- [Evidencias Fotograficas y Storage](./08-evidencias-storage.md)
