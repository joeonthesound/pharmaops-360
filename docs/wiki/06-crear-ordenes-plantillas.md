# 06 - Crear Ordenes y Plantillas Dinamicas

## Objetivo

Documentar el flujo de creacion de ordenes de mantenimiento y configuracion dinamica de campos por tipo de activo.

## Rutas

- Crear Ordenes: [`src/app/(app)/mantenimiento/crear-ordenes/page.tsx`](../../src/app/%28app%29/mantenimiento/crear-ordenes/page.tsx)
- Formulario cliente: [`order-creation-form.tsx`](../../src/app/%28app%29/mantenimiento/crear-ordenes/order-creation-form.tsx)
- Acciones: [`actions.ts`](../../src/app/%28app%29/mantenimiento/crear-ordenes/actions.ts)
- Modificar parametros: [`src/app/(app)/mantenimiento/plantillas/page.tsx`](../../src/app/%28app%29/mantenimiento/plantillas/page.tsx)
- Formulario de plantilla: [`template-fields-form.tsx`](../../src/app/%28app%29/mantenimiento/plantillas/template-fields-form.tsx)
- Bulk insert: [`plantillas/actions.ts`](../../src/app/%28app%29/mantenimiento/plantillas/actions.ts)

## Acceso

Crear Ordenes usa capacidades IAM:

```ts
can_approve === true || can_create_assets === true
```

No depende de `role === 'Superadmin'`.

## Seleccion de Activo

Fuente:

- `public.activos`

Campos:

- `uuid`
- `asset_code`
- `asset_name`
- `asset_type`

UI:

- Select buscable.
- Texto visible: `asset_code - asset_name`.
- Al seleccionar, se extrae `asset_type`.

## Lookup de Plantilla

Tabla:

- `public.mantenimiento_plantillas_campos`

Filtro:

```ts
eq('asset_type', selectedAsset.asset_type)
```

Columnas soportadas:

- `asset_type`
- `seccion_nombre`
- `campo_nombre`
- `tipo_dato`
- `unidad_medida`

Compatibilidad adicional en lector:

- `section_name`
- `field_key`
- `field_label`
- `field_type`
- `unit`
- `section_order`
- `field_order`

## Preview HVAC

`Sistemas HVAC` es baseline validado.

Si la tabla devuelve filas:

- Se agrupan por `seccion_nombre`.
- Se muestran en tablas con zebra striping.

Si la tabla devuelve cero filas:

- Se usa fallback `HVAC_BASELINE_TEMPLATE_FIELDS`.
- Se evita la alerta de plantilla no registrada.

Secciones baseline:

- Verificacion Inicial
- Parametros Electricos
- Ciclo de Refrigeracion
- Componentes Especiales

## Fallback para Nuevos Tipos

Si `asset_type` no tiene plantilla y no es HVAC:

Mensaje:

```txt
Este Tipo de Activo no posee una plantilla de calificacion registrada.
```

Accion:

- Link a `/mantenimiento/plantillas?asset_type=<asset_type>`

## Modificar Parametros

Campos por fila:

| UI | DB |
| --- | --- |
| Seccion | `seccion_nombre` |
| Nombre del Parametro | `campo_nombre` |
| Tipo de Dato | `tipo_dato` |
| Unidad | `unidad_medida` |

Tipos permitidos:

- `OK_NOK`
- `NUMERIC`
- `TEXT`

## Bulk Insert

Server Action:

```ts
saveTemplateFields(input)
```

Tabla:

- `public.mantenimiento_plantillas_campos`

Operacion:

```ts
insert(rows)
```

Despues de guardar:

- Redirige a `/mantenimiento/crear-ordenes?template_saved=1`
- La pantalla muestra confirmacion visual.

## Generar Orden

Server Action:

```ts
generateMaintenanceOrder(input)
```

Inserta en:

- `public.mantenimientos_registros`

Estado inicial:

```txt
PENDING_TECHNICIAN
```

`notes` contiene:

- `asset_uuid_origen`
- `asset_type`
- `captured_at`
- `progress_step: 1`
- `initial_layout`
- `generated_by`

## Enlaces Relacionados

- [IAM, Roles, Capacidades y Navegacion](./02-iam-navegacion-capacidades.md)
- [Mantenimiento, RUI y Ciclo de Vida](./05-mantenimiento-rui-ciclo-vida.md)
- [Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
