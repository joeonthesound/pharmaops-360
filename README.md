# PharmaOps 360

PharmaOps 360 es una PWA de alta integridad para operaciones farmaceuticas, validacion GxP y trazabilidad regulada. El proyecto usa Next.js App Router, TypeScript, Tailwind CSS y Supabase para autenticacion, PostgreSQL y almacenamiento de evidencias.

## Estado documentado al 3 de julio de 2026

Este README consolida lo implementado hasta el momento que no estaba descrito en la documentacion principal del repositorio. La documentacion tecnica modular continua en [`docs/wiki/README.md`](./docs/wiki/README.md), y la bitacora de contexto extendida continua en [`README-CONTEXT.md`](./README-CONTEXT.md).

## Stack y comandos

```bash
npm run dev
npm run build
npm run typecheck
```

Scripts disponibles:

- `dev`: servidor local Next.js.
- `build`: compilacion de produccion.
- `start`: arranque de produccion.
- `typecheck`: validacion TypeScript sin emitir archivos.

## Arquitectura funcional actual

- App Router con rutas protegidas bajo `src/app/(app)`.
- Supabase SSR en `src/shared/lib/supabase-server.ts` para validaciones server-side.
- Supabase client en `src/shared/lib/supabase.ts` para componentes cliente.
- Shell comun en `src/modules/common/components/app-shell.tsx`.
- Sidebar declarativo en `src/modules/common/components/navigation.config.ts`.
- Modelo de acceso basado en roles visibles y capacidades booleanas GxP.

## Modulos implementados

### Autenticacion y shell

- Login en `/login`.
- Middleware de sesion en `src/middleware.ts`.
- Layout autenticado en `src/app/(app)/layout.tsx`.
- Navegacion lateral con filtrado por `roles`, `rolesAllowed` y `requiredCapabilities`.

### Dashboard y calidad

- Dashboard operativo en `/dashboard`.
- Vistas separadas para ordenes pendientes, enviadas, rechazadas e historial tecnico.
- Componentes modulares para tarjetas, estados vacios y boundaries de error.

### Activos

- Vista general en `/activos`.
- Dashboard HVAC en `/activos/hvac`.
- Documento unico de inspeccion de activo HVAC en `/activos/hvac/ver/[id]`.
- Gestion universal de activos en `/activos/gestion`.
- Paneles de cumplimiento, galeria de evidencias y panel debug de superadmin en la ficha HVAC.

### Mantenimiento y RUI

- Vista general de mantenimiento en `/mantenimiento`.
- Flujo HVAC en `/mantenimiento/hvac`.
- Listados RUI por estado en `/mantenimiento/[area]/rui/[status]`.
- Detalle RUI en `/mantenimiento/[area]/rui/[status]/[id]`.
- Checklist, evidencias fotograficas, revision de firma, acciones de aprobacion y rechazo.
- Vista de impresion controlada en `/mantenimiento/imprimir/[id]`.
- Creacion de ordenes en `/mantenimiento/crear-ordenes`.
- Plantillas dinamicas en `/mantenimiento/plantillas`.

### Auditoria

- Portal auditor en `/auditoria`.
- Enfoque read-only para expedientes cerrados, ficha forense y copias controladas.
- Documentacion relacionada en [`docs/wiki/14-portal-auditor-copias-controladas.md`](./docs/wiki/14-portal-auditor-copias-controladas.md).

## Administracion y seguridad

Esta seccion corresponde al trabajo mas reciente que aun no tenia entrada clara en el README raiz.

### Operational Governance Center

Ruta: `/admin`

Archivo: `src/app/(app)/admin/page.tsx`

Estado actual:

- Panel administrativo con metricas de auditoria de plataforma.
- Accesos cruzados hacia usuarios, hub de firmas, auditoria/storage y plantillas de calibracion.
- Feed visual de incidentes de seguridad con severidades `info`, `success` y `warning`.
- Datos actuales son estaticos de UI; queda pendiente conectarlos a fuentes canonicas de Supabase o servicios de observabilidad.

### Hub de perfiles regulados

Ruta: `/admin/user`

Archivo: `src/app/(app)/admin/user/page.tsx`

Estado actual:

- Selector visual de perfiles regulados por rol operativo.
- Perfiles simulados para tecnico HVAC, supervisor, QA y gerencia.
- Cada tarjeta muestra certificacion activa, nivel de clearance y turno.
- Cada perfil enruta a un tablero especializado en `/admin/user/[rol]`.

### Tableros dinamicos por rol

Ruta: `/admin/user/[rol]`

Archivo: `src/app/(app)/admin/user/[rol]/page.tsx`

Slugs soportados:

- `technician`
- `supervisor`
- `quality`
- `management`

Estado actual:

- Valida el slug y retorna `notFound()` para roles no soportados.
- Lee la sesion activa con Supabase SSR.
- Busca el perfil activo en `public.usuarios_roles` por email.
- Construye nombre, departamento, ubicacion y licencia de firma electronica a partir del perfil real cuando existe.
- Muestra metricas operativas y tabla de acciones recientes por rol.
- Las acciones recientes y metricas son datos estaticos de presentacion; queda pendiente conectarlas a auditoria real, RUI y eventos de firma.

### SuperAdmin D10S

Ruta: `/admin/superadmin`

Archivo: `src/app/(app)/admin/superadmin/page.tsx`

Estado actual:

- Checklist pre-flight de RLS, constraints, firmas historicas y storage.
- Interruptor visual para telemetria `ENABLE_SUPERADMIN_DEBUG_LOGS`.
- Herramientas de base de datos retenidas por dialogo de confirmacion.
- Carga local de preview para logotipo corporativo.
- Bloque de identidad supervisada con justificacion GxP obligatoria antes de habilitar solicitud.
- Documentacion especifica en [`docs/wiki/13-superadmin-d10s-cabina-control.md`](./docs/wiki/13-superadmin-d10s-cabina-control.md).

### Usuarios y roles

Ruta principal: `/admin/usuarios`

Archivos:

- `src/app/(app)/admin/usuarios/page.tsx`
- `src/app/(app)/admin/usuarios/nuevo/page.tsx`
- `src/app/(app)/admin/usuarios/[id]/page.tsx`
- `src/app/(app)/admin/usuarios/user-form.tsx`
- `src/modules/usuarios-roles/user-admin.actions.ts`

Estado actual:

- Listado de usuarios desde `public.usuarios_roles`.
- Jerarquia visual de usuarios: superusuario raiz, administracion funcional, calidad/auditor, supervisor, tecnico y temporal.
- Acceso protegido con `assertRootAdminAccess()`.
- Creacion y edicion mediante `upsertUserAction()`.
- Activacion/desactivacion logica mediante `toggleUserStatusAction()`.
- Proteccion SoD para impedir que un administrador funcional modifique o desactive la cuenta raiz.
- Notas de auditoria en `notes` con actor, timestamp UTC y origen Server Action.

## Navegacion nueva

El sidebar incluye el grupo `Administracion y Seguridad` en `src/modules/common/components/navigation.config.ts`.

Nodos actuales:

- `Panel Analitico Admin` -> `/admin`
- `Hub de Perfiles Regulados` -> `/admin/user`

Nota: estos nodos aun no tienen `rolesAllowed` o `requiredCapabilities` definidos en la configuracion nueva, por lo que conviene endurecerlos antes de pasar a un entorno validado.

## Riesgos y pendientes detectados

- Conectar metricas estaticas de `/admin` a fuentes reales de auditoria, sesiones, backups y logs.
- Conectar perfiles simulados de `/admin/user` a perfiles reales y certificaciones persistidas.
- Conectar acciones recientes de `/admin/user/[rol]` a RUI, firmas electronicas y `public.audit_trail`.
- Endurecer visibilidad del grupo `Administracion y Seguridad` con capacidades o roles explicitos.
- Revisar textos con caracteres mal codificados en algunos archivos fuente y documentacion historica.
- Retirar o dejar estrictamente gated cualquier log temporal de debug antes de uso productivo.

## Documentacion relacionada

- [Wiki tecnica](./docs/wiki/README.md)
- [Mapa del sistema](./docs/wiki/00-mapa-del-sistema.md)
- [IAM, roles, capacidades y navegacion](./docs/wiki/02-iam-navegacion-capacidades.md)
- [Usuarios y roles](./docs/wiki/09-usuarios-roles.md)
- [SuperAdmin D10S](./docs/wiki/13-superadmin-d10s-cabina-control.md)
- [Portal auditor](./docs/wiki/14-portal-auditor-copias-controladas.md)

"Release v1.1.0: Refactorización estructural de PDAC y control GxP"
