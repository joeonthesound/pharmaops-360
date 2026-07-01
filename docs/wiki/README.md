# PharmaOps 360 Wiki

Este directorio documenta de forma modular el estado funcional, tecnico y GxP de PharmaOps 360.

## Indice de Modulos

- [00 - Mapa del Sistema](./00-mapa-del-sistema.md)
- [01 - Arquitectura App Router y Shell](./01-arquitectura-app-router-shell.md)
- [02 - IAM, Roles, Capacidades y Navegacion](./02-iam-navegacion-capacidades.md)
- [03 - Activos y Dashboard HVAC](./03-activos-dashboard-hvac.md)
- [04 - Gestion Universal de Activos](./04-gestion-universal-activos.md)
- [05 - Mantenimiento, RUI y Ciclo de Vida](./05-mantenimiento-rui-ciclo-vida.md)
- [06 - Crear Ordenes y Plantillas Dinamicas](./06-crear-ordenes-plantillas.md)
- [07 - Firma Electronica, Desvios y Auditoria](./07-firma-electronica-desvios-auditoria.md)
- [08 - Evidencias Fotograficas y Storage](./08-evidencias-storage.md)
- [09 - Usuarios y Roles](./09-usuarios-roles.md)
- [10 - Modelo de Datos Supabase](./10-modelo-datos-supabase.md)
- [11 - Runbooks de Validacion](./11-runbooks-validacion.md)
- [12 - Supabase: Definicion y Replicacion de Base de Datos](./12-supabase-replicacion-db.md)

## Convenciones

- Las rutas de UI se documentan como `src/app/...`.
- Las mutaciones server-side se documentan como Server Actions.
- Los nombres de tablas se documentan con esquema logico `public.<tabla>`.
- Los estados GxP se documentan con el valor exacto esperado en base de datos cuando aplica.

## Estado de Compilacion

Ultima validacion aplicada durante esta sesion:

```bash
npm run typecheck
```

Resultado esperado: `tsc --noEmit` sin errores.
