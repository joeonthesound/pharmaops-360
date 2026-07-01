# 01 - Arquitectura App Router y Shell

## Objetivo

Documentar la estructura App Router, el shell autenticado y los puntos de integracion global.

## Estructura Base

- Layout raiz: [`src/app/layout.tsx`](../../src/app/layout.tsx)
- Login publico: [`src/app/page.tsx`](../../src/app/page.tsx)
- Layout autenticado: [`src/app/(app)/layout.tsx`](../../src/app/%28app%29/layout.tsx)
- Shell cliente: [`src/modules/common/components/app-shell.tsx`](../../src/modules/common/components/app-shell.tsx)
- Sidebar: [`src/modules/common/components/sidebar.tsx`](../../src/modules/common/components/sidebar.tsx)

## Layout Autenticado

Archivo: [`src/app/(app)/layout.tsx`](../../src/app/%28app%29/layout.tsx)

Responsabilidades:

- Ejecuta en servidor.
- Obtiene usuario actual via Supabase Auth.
- Consulta `usuarios_roles`.
- Normaliza rol visible.
- Calcula capacidades agregadas:
  - `canApprove`
  - `canCreateAssets`
- Pasa datos a `AppShell`:
  - `currentRole`
  - `currentUserName`
  - `currentUserEmail`
  - `currentCapabilities`

## AppShell

Archivo: [`src/modules/common/components/app-shell.tsx`](../../src/modules/common/components/app-shell.tsx)

Responsabilidades:

- Renderizar layout visual con sidebar fijo.
- Renderizar header superior.
- Mostrar breadcrumbs dinamicos.
- Mostrar widget de usuario.
- Mostrar email de login bajo el nombre completo.
- Pasar capacidades al sidebar.

## Breadcrumbs

Componente interno: `DynamicBreadcrumbs`.

Reglas:

- Divide `pathname` por segmentos.
- Mapea segmentos estaticos a etiquetas humanas.
- Para `/activos/hvac/ver/[uuid]`, busca `asset_code` en Supabase.
- Si esta cargando el codigo del activo, muestra skeleton.

## Sidebar

Archivo: [`src/modules/common/components/sidebar.tsx`](../../src/modules/common/components/sidebar.tsx)

Responsabilidades:

- Renderizar arbol de navegacion filtrado.
- Resolver iconos Lucide.
- Manejar menus colapsables.
- Aplicar clase activa.
- Filtrar por busqueda local.

## Riesgos

- Si `usuarios_roles` devuelve multiples perfiles, el primer perfil ordenado por `id` define el rol visual.
- Las capacidades se agregan con `some(...)`; un usuario con cualquier perfil activo con capacidad obtiene acceso funcional.
- Los textos con mojibake historico deben normalizarse gradualmente sin romper diffs grandes.

## Enlaces Relacionados

- [IAM, Roles, Capacidades y Navegacion](./02-iam-navegacion-capacidades.md)
- [Usuarios y Roles](./09-usuarios-roles.md)
