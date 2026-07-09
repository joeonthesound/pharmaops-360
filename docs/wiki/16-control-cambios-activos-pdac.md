# 16 - Control de Cambios de Activos PDAC

## Objetivo

Documentar el checkpoint de base de datos aplicado sobre `public.activos` para soportar el control de cambios de activos PDAC bajo trazabilidad GxP.

## Alcance Regulatorio

Identificadores aplicables:

- `FORM_ID: FOR-PDAC-CC`
- `SCREEN_ID: SCREEN-ACT-CC-01`

El control de cambios de activos debe preservar el estado canonico en Supabase y evitar variables sueltas, mocks o valores hardcodeados en la interfaz.

## Tabla Canonica

Tabla:

```txt
public.activos
```

Campos vivos agregados por la migracion:

| Campo | Tipo | Nulabilidad | Default | Uso GxP |
| --- | --- | --- | --- | --- |
| `version` | `int` | `not null` | `1` | Cuenta la iteracion activa del control de cambios del activo. |
| `status_gxp` | `varchar` | `not null` | `APROBADO` | Estado regulado del activo en el flujo PDAC. |
| `image_url` | `text` | nullable | `null` | Referencia a la imagen versionada del activo en Storage seguro. |

Valores permitidos para `status_gxp`:

- `EVALUACIÓN`
- `APROBADO`
- `RECHAZADO`

## Storage Asociado

Bucket:

```txt
evidencias-activos
```

`image_url` debe apuntar a una cadena versionada dentro del bucket. La UI no debe reemplazar este valor con imagenes estaticas ni placeholders persistidos como dato operativo.

## Impacto en FOR-PDAC-REV

Toda consulta server-side o analitica que alimente `FORM_ID: FOR-PDAC-REV` debe seleccionar estos campos desde `public.activos`:

- `version`
- `status_gxp`
- `image_url`

La visibilidad en UI debe reflejar exclusivamente el estado canonico de base de datos.

## Reglas de Implementacion

- Las Server Actions deben tipar estos campos dentro de las interfaces de activos.
- Las consultas Supabase deben incluir las columnas nuevas cuando construyan expedientes PDAC o vistas analiticas relacionadas.
- No se permite mockear, derivar por string local ni hardcodear `version`, `status_gxp` o `image_url`.
- Cualquier flujo que modifique el activo debe registrar justificacion y preservar auditoria GxP.
- El proyecto debe compilar limpiamente con `npm run typecheck` despues de integrar estos campos en codigo.

## Implementacion FOR-PDAC-CC / SCREEN-ACT-CC-01

Archivos canonicos:

- `src/modules/activos/actions/change-control.actions.ts`
- `src/app/(app)/activos/hvac/ver/[id]/control-cambios/page.tsx`
- `src/app/(app)/activos/hvac/ver/[id]/control-cambios/change-control-form.tsx`

La accion `submitChangeControlAction` recibe `assetId` como `number` para alinearse con
`public.control_cambios_activos.asset_id` (`BIGINT`) y mantiene el identificador propio del control
de cambios como UUID textual cuando Supabase retorna `id`.

El estado inicial de toda solicitud se persiste como `PENDIENTE`, junto a `datos_anteriores`,
`datos_nuevos`, `justificacion_tecnica`, `form_id`, `screen_id`, usuario de sesion, IP, User-Agent y
timestamp UTC.

La pantalla de control de cambios muestra un comparativo industrial entre valores actuales y valores
propuestos. Las fotografias propuestas se referencian contra el bucket `evidencias-activos` mediante
una ruta inmutable `ASSETCODE_TIMESTAMP.png`; la interfaz no ofrece accion de borrado para esa ruta.

## Trazabilidad ALCOA+

Este checkpoint refuerza:

- Attributable: los cambios de activo deben quedar vinculados a usuario y justificacion.
- Legible: `status_gxp` usa estados regulados y visibles.
- Contemporaneous: `version` representa la iteracion vigente del control de cambios.
- Original: `image_url` referencia la evidencia visual versionada original.
- Accurate: las pantallas PDAC deben leer el estado real de Supabase.

## Enlaces Relacionados

- [Gestion Universal de Activos](./04-gestion-universal-activos.md)
- [Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
- [Supabase: Definicion y Replicacion de Base de Datos](./12-supabase-replicacion-db.md)
