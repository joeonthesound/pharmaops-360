# 04 - Gestion Universal de Activos

## Objetivo

Documentar el formulario universal de gestion de activos y su flujo GxP.

## Ruta

Archivo: [`src/app/(app)/activos/gestion/page.tsx`](../../src/app/%28app%29/activos/gestion/page.tsx)

URL principal:

```txt
/activos/gestion?action=create
```

## Server Action

Archivo: [`src/modules/activos/actions/save-asset-management-form.ts`](../../src/modules/activos/actions/save-asset-management-form.ts)

Funcion:

```ts
saveAssetManagementForm(payload)
```

## Modos

Parametro `action`:

- `create`
- `edit`
- `delete`

## Validacion Cliente

Campo obligatorio:

- `JUSTIFICACION DE MODIFICACION`

Regla:

- Minimo 15 caracteres.

## Mutaciones

### Create

Inserta en:

- `public.activos`

### Edit

Actualiza:

- `public.activos`
- Filtro: `uuid`

### Delete

No elimina fisicamente.

Soft-delete:

- `status: 'Baja'` o equivalente operativo.

## Auditoria

Tabla:

- `public.auditoria_log_cambios`

Campos usados:

- `usuario_email`
- `usuario_id`
- `timestamp`
- `accion`
- `justificacion`
- `payload_snapshot`
- `entidad`
- `entidad_uuid`

## Sidebar

El nodo `Gestion de Activos` vive dentro de `Activos`.

Restriccion vigente historica:

- `Administrador`
- `Administrativo`

## Riesgos

- El formulario debe evitar insertar strings vacios donde se esperan `null`.
- Cambios en `activos` impactan dashboard HVAC, creacion de ordenes y RUI.

## Enlaces Relacionados

- [Activos y Dashboard HVAC](./03-activos-dashboard-hvac.md)
- [Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
