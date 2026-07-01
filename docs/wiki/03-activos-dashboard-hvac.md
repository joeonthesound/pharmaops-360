# 03 - Activos y Dashboard HVAC

## Objetivo

Documentar la gestion y visualizacion de activos, especialmente el dashboard HVAC.

## Rutas

- Activos general: [`src/app/(app)/activos/page.tsx`](../../src/app/%28app%29/activos/page.tsx)
- Dashboard HVAC: [`src/app/(app)/activos/hvac/page.tsx`](../../src/app/%28app%29/activos/hvac/page.tsx)
- Perfil de activo HVAC: [`src/app/(app)/activos/hvac/ver/[id]/page.tsx`](../../src/app/%28app%29/activos/hvac/ver/[id]/page.tsx)

## Server Actions

- Dashboard HVAC: [`src/modules/activos/actions/get-hvac-dashboard.ts`](../../src/modules/activos/actions/get-hvac-dashboard.ts)
- Detalle activo: [`src/modules/activos/actions/get-activo-detalle.ts`](../../src/modules/activos/actions/get-activo-detalle.ts)
- Cumplimiento de perfil: [`src/modules/activos/actions/asset-profile-compliance-actions.ts`](../../src/modules/activos/actions/asset-profile-compliance-actions.ts)

## Tablas

- `public.activos`
- `public.mantenimientos_registros`
- `public.formularios_respuestas`
- `public.formularios_campos`

## Filtro HVAC

La clasificacion HVAC se obtiene por:

```ts
.ilike('asset_type', '%hvac%')
```

Motivo:

- `area` representa ubicacion geografica o planta.
- `asset_type` representa clasificacion tecnica.

## Dashboard HVAC

Datos principales por activo:

- `uuid`
- `asset_code`
- `asset_name`
- `status`
- `asset_type`
- `area`
- `location_detail`
- `next_maintenance_date`

Salud del activo:

- Se agrupan mantenimientos por `asset_code`.
- Se toma el ultimo estado.
- Mapeo:
  - `approved` -> Healthy
  - `En revision` -> Attention
  - Otros -> Critical

## Grid 3x3

El dashboard HVAC renderiza hasta 9 cards.

Reglas historicas implementadas:

- Prioriza datos reales.
- Puede mezclar placeholders si se necesita auditoria visual.
- La instruccion mas reciente para datos reales indica no ocultar registros reales.

## Perfil de Activo

Componentes relevantes:

- [`asset-compliance-panels.tsx`](../../src/app/%28app%29/activos/hvac/ver/[id]/asset-compliance-panels.tsx)
- [`evidence-preview-gallery.tsx`](../../src/app/%28app%29/activos/hvac/ver/[id]/evidence-preview-gallery.tsx)
- [`superadmin-debug-panel.tsx`](../../src/app/%28app%29/activos/hvac/ver/[id]/superadmin-debug-panel.tsx)

## Paneles Condicionales

- Admin:
  - `Administrador`
  - `Superadmin`
- Superadmin destructivo:
  - Solo `Superadmin`
  - Nunca ejecuta SQL DELETE.
  - Debe usar soft delete / descalificacion.

## Enlaces Relacionados

- [Gestion Universal de Activos](./04-gestion-universal-activos.md)
- [Mantenimiento, RUI y Ciclo de Vida](./05-mantenimiento-rui-ciclo-vida.md)
