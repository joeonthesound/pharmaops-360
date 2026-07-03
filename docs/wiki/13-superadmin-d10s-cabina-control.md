# 13 - SuperAdmin D10S y Cabina de Control

## Objetivo

Documentar el panel Nivel 1 SuperAdmin D10S, sus controles de infraestructura y las restricciones de identidad supervisada.

## Ruta

[`src/app/(app)/admin/superadmin/page.tsx`](../../src/app/%28app%29/admin/superadmin/page.tsx)

## Distribucion Visual

- Zona izquierda, 60%: pre-flight, switches, herramientas de base de datos, branding y checklist.
- Zona derecha, 40%: tarjeta de perfil SuperAdmin e identidad supervisada.
- La vista debe respetar el sidebar colapsable y no provocar overflow horizontal.

## Pre-Flight Checklist

Controles visibles:

- Politicas de Seguridad a Nivel de Fila (RLS): activo.
- Esquema de Restricciones del Flujo: compara constraints como `mantenimientos_registros_status_check`.
- Integridad de Firmas Historicas: alerta si un RUI cerrado no tiene auditoria reconciliable.
- Conexion de Almacenamiento de Evidencias: valida conectividad logica a buckets Supabase.

## Master Debug

Flag funcional:

```ts
ENABLE_SUPERADMIN_DEBUG_LOGS
```

Regla:

- Encendido: permite trazas D10S para diagnostico controlado.
- Apagado: no deben emitirse logs cliente/servidor durante flujos regulados.
- Cualquier bypass temporal debe tratarse como actividad de investigacion y revertirse antes de uso productivo.

## Herramientas de Base de Datos

Acciones retenidas bajo dialogo de confirmacion:

- Resetear Esquemas de Base de Datos.
- Exportar Respaldo Estructurado.
- Importar Backup GxP.
- Descargar Plantilla de Migracion de Datos Cualificada.

La plantilla cualificada sirve para carga masiva y estructurada de registros, activos y comentarios GxP listos para migracion.

## White-Label Corporativo

Entrada:

- Logotipo Corporativo de la Planta.

Especificaciones:

- Formatos: `.png`, `.jpg`, `.webp`.
- Fondo transparente recomendado para sidebar.
- Maximo 2MB.
- Dimensiones optimizadas: 240px x 60px.

## Identidad Supervisada

La tarjeta de perfil muestra email, nombre y rol, pero no permite cambios silenciosos.

Cambios sensibles:

- Email.
- Password.
- Perfil administrativo.

Requisitos:

- Justificacion GxP obligatoria.
- Registro en `public.audit_trail`.
- Validacion MFA antes de modificar Supabase Auth.

## Uso Operativo

1. Entrar como SuperAdmin D10S.
2. Abrir `/admin/superadmin`.
3. Revisar checklist pre-flight antes de tareas administrativas.
4. Activar debug solo durante una investigacion aprobada.
5. Ejecutar herramientas de DB solo con confirmacion y evidencia de cambio.
6. Registrar justificacion para cualquier alteracion de identidad.

## Enlaces Relacionados

- [IAM, Roles, Capacidades y Navegacion](./02-iam-navegacion-capacidades.md)
- [Usuarios y Roles](./09-usuarios-roles.md)
- [Runbooks de Validacion](./11-runbooks-validacion.md)
