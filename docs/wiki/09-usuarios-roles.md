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
- `can_access_forensic_sheet`
- `can_export_controlled_copies`
- `can_manage_users`
- `requires_2fa`
- `notes`

## Valores Estandarizados

Roles soportados:

- `tecnico`
- `supervisor`
- `calidad`
- `gerencia`
- `auditor`

Areas validadas:

- `Control de Calidad (QC)`
- `Aseguramiento de Calidad (QA)`
- `Ingenieria y Mantenimiento`
- `Produccion/Planta`
- `Entidad Regulatoria Externa`

Cargos operativos:

- `Tecnico de Campo`
- `Supervisor Tecnico`
- `Oficial de QA`
- `Director de Planta`
- `Auditor Externo`

## Modelo de Acceso

La plataforma ya no debe depender exclusivamente del string `role`.

Reglas actuales:

- El rol visible viene del primer perfil activo ordenado.
- Las capacidades se agregan con `some(...)` sobre todos los perfiles activos.
- `Crear Ordenes` depende de:
  - `can_approve`
  - `can_create_assets`
- `Portal Auditor` depende del rol `auditor`.
- Ficha forense y copia controlada dependen de:
  - `can_view_audit`
  - `can_access_forensic_sheet`
  - `can_export_controlled_copies`

## Permisos GxP en Formulario

El formulario de usuarios administra estos flags:

- Estado de Cuenta: `active`
- Crear Activos: `can_create_assets`
- Ejecutar Mantenimiento: `can_execute_maintenance`
- Rol Supervisor: `can_review`
- Aseguramiento de Calidad: `can_approve`
- Administrar Usuarios: `can_manage_users`
- Ver Auditoria: `can_view_audit`
- Acceso a Ficha Forense: `can_access_forensic_sheet`
- Exportar Copias Controladas: `can_export_controlled_copies`

## Reglas SoD Automaticas

Regla Auditor:

- Se activa si el rol es `auditor`, el cargo es `Auditor Externo` o el area es `Entidad Regulatoria Externa`.
- Fuerza lectura regulada: `can_view_audit`, `can_access_forensic_sheet`, `can_export_controlled_copies`.
- Bloquea mutacion: `can_create_assets`, `can_execute_maintenance`, `can_manage_users`.

Regla Tecnico:

- Se activa si el cargo es `Tecnico de Campo`.
- Fuerza `can_execute_maintenance`.
- Bloquea `can_review`, `can_approve` y `can_manage_users`.

Si un administrador intenta modificar un permiso bloqueado, la UI muestra la advertencia de restriccion por Segregacion de Funciones.

## Telemetria D10S

El dispatcher de usuarios usa `ENABLE_SUPERADMIN_DEBUG_LOGS` para controlar trazas cliente/servidor. Cuando el flag esta apagado no deben emitirse logs de diagnostico durante creacion o edicion de usuarios.

Nota operativa: cualquier bypass temporal de debug usado para diagnostico debe retirarse o volver a quedar gated antes de liberar a produccion.

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
- [SuperAdmin D10S y Cabina de Control](./13-superadmin-d10s-cabina-control.md)
