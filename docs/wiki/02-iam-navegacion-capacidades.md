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

### `requiredCapabilities`

Tipo:

```ts
Array<'can_approve' | 'can_create_assets'>
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

## Enlaces Relacionados

- [Crear Ordenes y Plantillas Dinamicas](./06-crear-ordenes-plantillas.md)
- [Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
