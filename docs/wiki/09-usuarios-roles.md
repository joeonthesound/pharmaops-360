# 09 - Usuarios y Roles

## Objetivo

Documentar administracion de usuarios y perfiles.

## Rutas

- Lista usuarios: [`src/app/(app)/admin/usuarios/page.tsx`](../../src/app/%28app%29/admin/usuarios/page.tsx)
- Crear usuario: [`src/app/(app)/admin/usuarios/nuevo/page.tsx`](../../src/app/%28app%29/admin/usuarios/nuevo/page.tsx)
- Editar usuario: [`src/app/(app)/admin/usuarios/[id]/page.tsx`](../../src/app/%28app%29/admin/usuarios/[id]/page.tsx)
- Formulario: [`src/app/(app)/admin/usuarios/user-form.tsx`](../../src/app/%28app%29/admin/usuarios/user-form.tsx)

## Server Actions

Archivo:

[`src/modules/usuarios-roles/user-admin.actions.ts`](../../src/modules/usuarios-roles/user-admin.actions.ts)

## Tabla

`public.usuarios_roles`

Campos relevantes:

- `id`
- `user_email`
- `full_name`
- `job_title`
- `role`
- `user_type`
- `site`
- `area`
- `active`
- `can_create_assets`
- `can_execute_maintenance`
- `can_review`
- `can_approve`
- `can_view_audit`
- `can_manage_users`
- `requires_2fa`
- `notes`

## Modelo de Acceso

La plataforma ya no debe depender exclusivamente del string `role`.

Reglas actuales:

- El rol visible viene del primer perfil activo ordenado.
- Las capacidades se agregan con `some(...)` sobre todos los perfiles activos.
- `Crear Ordenes` depende de:
  - `can_approve`
  - `can_create_assets`

## Sidebar y Capacidades

El sidebar recibe:

```ts
currentCapabilities={{
  can_approve,
  can_create_assets,
}}
```

Y filtra nodos con:

```ts
requiredCapabilities
```

## Riesgos

- Multiples filas activas para el mismo usuario pueden mostrar un rol visual distinto de sus permisos reales.
- Esto es aceptado, pero debe documentarse en auditoria/IAM.
- Cualquier feature sensible debe validar en servidor.

## Enlaces Relacionados

- [IAM, Roles, Capacidades y Navegacion](./02-iam-navegacion-capacidades.md)
- [Crear Ordenes y Plantillas Dinamicas](./06-crear-ordenes-plantillas.md)
