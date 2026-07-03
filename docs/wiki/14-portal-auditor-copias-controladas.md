# 14 - Portal Auditor y Copias Controladas

## Objetivo

Documentar el espacio read-only para auditor externo, la ficha forense y la impresion de copias controladas.

## Rutas

- Portal auditor: [`src/app/(app)/auditoria/page.tsx`](../../src/app/%28app%29/auditoria/page.tsx)
- Endpoint compatible: [`src/app/api/mantenimiento/exportar-pdf/route.ts`](../../src/app/api/mantenimiento/exportar-pdf/route.ts)
- Vista print-ready: [`src/app/(app)/mantenimiento/imprimir/[id]/page.tsx`](../../src/app/%28app%29/mantenimiento/imprimir/[id]/page.tsx)
- Trigger de impresion: [`src/app/(app)/mantenimiento/imprimir/[id]/print-trigger.tsx`](../../src/app/%28app%29/mantenimiento/imprimir/[id]/print-trigger.tsx)

## Acceso

El usuario debe tener rol normalizado `auditor`.

Capacidades recomendadas:

- `can_view_audit = true`
- `can_access_forensic_sheet = true`
- `can_export_controlled_copies = true`

No debe tener:

- `can_create_assets`
- `can_execute_maintenance`
- `can_manage_users`

## Buscador de Muestreo

Campos:

- UUID del Registro Unico e Inmutable (RUI).
- Rango de Fecha de Ejecucion.

Accion:

- Buscar Expediente Validado.

Resultado:

- Expedientes cerrados o validados por defecto.
- Tabla con Codigo de Acta, Activo Fijo, Ultima Firma, Fecha de Cierre UTC y Estado.

## Acciones Permitidas

Cada fila solo debe mostrar:

- Ver Ficha Forense: abre el sheet de ciclo de vida al 89% de ancho.
- Descargar PDF Controlado: redirige al endpoint compatible y luego a la vista print-ready.

Acciones prohibidas:

- Crear Registro.
- Editar Formulario.
- Eliminar.
- Reasignar Tecnico.

## Ficha Forense

La ficha forense consolida nodos de:

- `public.audit_trail`
- `mantenimiento_firmas`
- metadata base del RUI

Debe mostrar:

- etapa
- operador
- timestamp
- significado legal GxP
- comentario u observacion con fallback legible

## Impresion Controlada

La arquitectura actual usa HTML print-ready y `window.print()`.

Flujo:

1. El endpoint `/api/mantenimiento/exportar-pdf?id=<uuid>` redirige a `/mantenimiento/imprimir/<uuid>`.
2. La pagina consulta el RUI desde servidor.
3. Incrementa `notes.print_metadata.count`.
4. Inserta evento `PRINT_CONTROLLED_COPY`.
5. Renderiza encabezado, checklist, firmas y footer.
6. `print-trigger.tsx` ejecuta `window.print()` luego de 500ms.

Footer requerido:

```txt
Copia Controlada Impresion #X | Solicitado por: usuario@dominio.com
```

## Marca de Agua Auditor

Si el rol solicitante es `auditor`, todas las paginas impresas deben mostrar:

```txt
COPIA CONTROLADA - EXCLUSIVO PARA AUDITORIA
```

## Validacion Manual

1. Iniciar sesion como auditor.
2. Confirmar redireccion a `/auditoria`.
3. Buscar un RUI cerrado.
4. Abrir ficha forense.
5. Solicitar copia controlada.
6. Confirmar incremento del contador en `notes.print_metadata.count`.
7. Confirmar evento `PRINT_CONTROLLED_COPY` en auditoria.

## Enlaces Relacionados

- [Mantenimiento, RUI y Ciclo de Vida](./05-mantenimiento-rui-ciclo-vida.md)
- [Firma Electronica, Desvios y Auditoria](./07-firma-electronica-desvios-auditoria.md)
- [Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
