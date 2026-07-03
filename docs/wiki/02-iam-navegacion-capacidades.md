# 02 - IAM, Roles, Capacidades y Navegacion

## Objetivo

Definir el modelo de acceso usado por la UI, sidebar y rutas sensibles.

## Fuentes de Identidad

Tabla principal: `public.usuarios_roles`.

Campos usados:

- `user_email`
- `full_name`
- `role`
- `active`
- `notes`
- `can_approve`
- `can_create_assets`
- `can_review`
- `can_approve`
- `can_manage_users`
- `can_view_audit`
- `can_access_forensic_sheet`
- `can_export_controlled_copies`

## Principio Actual

El rol visible no siempre representa la autorizacion real.

Ejemplo:

- Header puede mostrar `Administrativo`.
- El mismo usuario puede tener capacidades superiores:
  - `can_approve: true`
  - `can_create_assets: true`

Por eso, las rutas criticas usan capacidades booleanas antes que strings rigidos.

## Navegacion

Configuracion: [`src/modules/common/components/navigation.config.ts`](../../src/modules/common/components/navigation.config.ts)

Tipos: [`src/modules/common/components/navigation.interface.ts`](../../src/modules/common/components/navigation.interface.ts)

Filtro: [`src/modules/common/components/navigation.utils.ts`](../../src/modules/common/components/navigation.utils.ts)

### Propiedades soportadas por nodo

- `title`
- `href`
- `icon`
- `roles`
- `rolesAllowed`
- `requiredCapabilities`
- `children`

## Roles Normalizados

| Nivel | Rol canonico | Uso principal |
| --- | --- | --- |
| Nivel 1 | `superadmin` / D10S | Pre-flight, debug maestro, branding e identidad supervisada. |
| Nivel 2 | `supervisor` | Revision tecnica, programacion y respuesta primaria. |
| Nivel 3 | `calidad` | Liberacion, dictamen GxP y CAPA. |
| Nivel 4 | `gerencia` | Cierre institucional y analitica operativa. |
| Nivel 5 | `tecnico` | Ejecucion movil, checklist y evidencias. |
| Externo | `auditor` | Muestreo read-only, ficha forense y copias controladas. |

### `requiredCapabilities`

Tipo:

```ts
Array<'can_approve' | 'can_create_assets' | 'can_view_audit' | 'can_access_forensic_sheet' | 'can_export_controlled_copies'>
```

Regla:

- Si el usuario tiene al menos una capacidad requerida, el nodo se renderiza.
- Si no, se evalua el filtro historico por rol.

## Nodo Crear Ordenes

Ruta: `/mantenimiento/crear-ordenes`

Ubicacion:

- Hijo directo de `Mantenimientos`.
- Ultimo nodo del arreglo `children`.

Regla de visibilidad:

```ts
requiredCapabilities: ['can_approve']
```

## Guardia de Ruta Crear Ordenes

Archivo: [`src/app/(app)/mantenimiento/crear-ordenes/page.tsx`](../../src/app/%28app%29/mantenimiento/crear-ordenes/page.tsx)

Regla:

```ts
can_approve === true || can_create_assets === true
```

Si no cumple:

- Inserta evento en `access_denied_logs`.
- Calcula contador historico por perfil/ruta.
- Renderiza pantalla `Acceso Restringido`.

## Seguridad GxP

La restriccion de ruta no depende solo del sidebar. Aunque el enlace no se renderice, la pagina aplica validacion server-side.

## Segregacion de Funciones

Reglas de interfaz aplicadas en administracion de usuarios:

- Si `role = auditor`, `job_title = Auditor Externo` o `area = Entidad Regulatoria Externa`, el sistema fuerza `can_view_audit`, `can_access_forensic_sheet` y `can_export_controlled_copies`.
- Para el mismo perfil auditor, quedan bloqueadas las capacidades de mutacion: `can_create_assets`, `can_execute_maintenance` y `can_manage_users`.
- Si `job_title = Tecnico de Campo`, el sistema fuerza `can_execute_maintenance` y bloquea `can_review`, `can_approve` y `can_manage_users`.
- Cualquier intento visual de tocar un permiso bloqueado muestra la advertencia de incompatibilidad GxP por Segregacion de Funciones.

## Rutas Sensibles Nuevas

- `/admin/superadmin`: requiere control Nivel 1 D10S y no debe usarse para mutaciones silenciosas de identidad.
- `/auditoria`: requiere rol `auditor`; muestra expedientes cerrados y acciones read-only.
- `/mantenimiento/imprimir/[id]`: renderiza copia controlada print-ready, incrementa contador y escribe auditoria.

## Enlaces Relacionados

- [Crear Ordenes y Plantillas Dinamicas](./06-crear-ordenes-plantillas.md)
- [Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
- [Usuarios y Roles](./09-usuarios-roles.md)
- [Portal Auditor y Copias Controladas](./14-portal-auditor-copias-controladas.md)
