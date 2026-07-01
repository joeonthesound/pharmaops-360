# 00 - Mapa del Sistema

## Proposito

PharmaOps 360 es una plataforma Next.js/Supabase para gestion GxP de activos, mantenimiento, inspecciones HVAC, evidencias, aprobaciones, auditoria y administracion de usuarios.

## Entradas Principales

- Login: [`src/app/page.tsx`](../../src/app/page.tsx)
- App protegida: [`src/app/(app)/layout.tsx`](../../src/app/%28app%29/layout.tsx)
- Dashboard: [`src/app/(app)/dashboard/page.tsx`](../../src/app/%28app%29/dashboard/page.tsx)
- Activos: [`src/app/(app)/activos/page.tsx`](../../src/app/%28app%29/activos/page.tsx)
- Mantenimiento: [`src/app/(app)/mantenimiento/page.tsx`](../../src/app/%28app%29/mantenimiento/page.tsx)
- Crear Ordenes: [`src/app/(app)/mantenimiento/crear-ordenes/page.tsx`](../../src/app/%28app%29/mantenimiento/crear-ordenes/page.tsx)

## Dominios Funcionales

| Dominio | UI | Server Actions | Tablas principales |
| --- | --- | --- | --- |
| IAM / Navegacion | `modules/common/components` | `modules/common/actions.ts` | `usuarios_roles`, `access_denied_logs` |
| Activos | `app/(app)/activos` | `modules/activos/actions` | `activos`, `auditoria_log_cambios` |
| Mantenimiento | `app/(app)/mantenimiento` | `modules/mantenimiento/actions.ts` | `mantenimientos_registros`, `formularios_respuestas`, `mantenimiento_plantillas_campos` |
| RUI / Inspeccion | `app/(app)/mantenimiento/[area]` | inline Server Actions + `modules/mantenimiento/actions.ts` | `mantenimientos_registros`, `formularios_campos`, `formularios_respuestas` |
| Evidencias | `checklist-form.tsx`, `evidence-photo-gallery.tsx` | Supabase Storage client/server utilities | Storage bucket `evidencias-mantenimiento` |
| Usuarios | `app/(app)/admin/usuarios` | `modules/usuarios-roles/user-admin.actions.ts` | `usuarios_roles` |

## Flujos de Alto Nivel

1. Usuario inicia sesion en Supabase Auth.
2. `src/app/(app)/layout.tsx` resuelve perfil activo y capacidades.
3. `AppShell` renderiza breadcrumbs, perfil y sidebar.
4. Sidebar filtra nodos por roles y capacidades.
5. Las paginas protegidas aplican guardias server-side adicionales.
6. Las acciones GxP escriben en tablas operativas y en auditoria.

## Enlaces Relacionados

- [Arquitectura App Router y Shell](./01-arquitectura-app-router-shell.md)
- [IAM, Roles, Capacidades y Navegacion](./02-iam-navegacion-capacidades.md)
- [Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
