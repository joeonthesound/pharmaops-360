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
- Impresion controlada: [`src/app/(app)/mantenimiento/imprimir/[id]/page.tsx`](../../src/app/%28app%29/mantenimiento/imprimir/[id]/page.tsx)

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

La vista RUI usa un interceptor dinamico por estado:

- Estados editables como `draft` o `PENDING_TECHNICIAN`: formulario de llenado manual.
- Estados de revision, liberacion o cierre: resumen inmutable con timeline y acciones reguladas.

Riesgo corregido:

- Las acciones de firma estaban en el layout documental, pero `pending_supervisor` renderizaba el layout compacto. Se integraron `SignatureReviewCard` en el layout activo.
- Los comentarios de validacion ahora se renderizan dentro del loop de cada firma para que Supervisor, Calidad y Gerencia tengan su propio bloque.

## Componentes RUI

- Checklist: [`checklist-form.tsx`](../../src/app/%28app%29/mantenimiento/[area]/checklist-form.tsx)
- Copiar RUI: [`copy-rui-button.tsx`](../../src/app/%28app%29/mantenimiento/[area]/copy-rui-button.tsx)
- Galeria evidencia: [`evidence-photo-gallery.tsx`](../../src/app/%28app%29/mantenimiento/[area]/evidence-photo-gallery.tsx)
- Boton imprimir: [`print-report-button.tsx`](../../src/app/%28app%29/mantenimiento/[area]/print-report-button.tsx)
- Firma: [`signature-review-card.tsx`](../../src/app/%28app%29/mantenimiento/[area]/signature-review-card.tsx)
- Ficha forense: [`audit-lifecycle-sheet.tsx`](../../src/modules/mantenimiento/components/audit-lifecycle-sheet.tsx)

## Comentarios de Validacion GxP

Las firmas no deben perder la justificacion escrita por el operador de revision. La estrategia actual persiste los comentarios en:

```txt
mantenimientos_registros.notes.gxp_workflow_comments
```

Estructura esperada:

```json
{
  "gxp_workflow_comments": {
    "supervisor": {
      "action": "approve",
      "comment": "Comentario de revision tecnica",
      "signer_email": "supervisor@planta.com",
      "signed_at_utc": "2026-07-02T00:00:00.000Z"
    },
    "quality": {
      "action": "approve",
      "comment": "Dictamen de QA",
      "signer_email": "qa@planta.com",
      "signed_at_utc": "2026-07-02T00:00:00.000Z"
    }
  }
}
```

La UI consulta primero este nodo JSON, luego comentarios recuperados de auditoria y finalmente `rejection_comments` como compatibilidad historica.

## Copia Controlada

La salida regulada ya no depende de un PDF binario generado desde cliente. El endpoint historico `/api/mantenimiento/exportar-pdf?id=<uuid>` redirige a la vista print-ready:

```txt
/mantenimiento/imprimir/[id]
```

Al cargar:

1. Consulta el RUI desde servidor.
2. Incrementa `notes.print_metadata.count`.
3. Inserta auditoria `PRINT_CONTROLLED_COPY`.
4. Renderiza HTML de alta legibilidad para impresion.
5. Ejecuta `window.print()` despues de que el DOM queda listo.
6. Si el solicitante es `auditor`, muestra marca de agua de copia controlada.

## Tablas

- `mantenimientos_registros`
- `formularios_campos`
- `formularios_respuestas`
- `mantenimiento_plantillas_campos`

## Enlaces Relacionados

- [Crear Ordenes y Plantillas Dinamicas](./06-crear-ordenes-plantillas.md)
- [Firma Electronica, Desvios y Auditoria](./07-firma-electronica-desvios-auditoria.md)
- [Evidencias Fotograficas y Storage](./08-evidencias-storage.md)
- [Portal Auditor y Copias Controladas](./14-portal-auditor-copias-controladas.md)
