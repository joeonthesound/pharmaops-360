# 11 - Runbooks de Validacion

## Objetivo

Definir pruebas manuales y tecnicas para validar los flujos criticos.

## Comando Base

```bash
npm run typecheck
```

Resultado esperado:

```txt
tsc --noEmit
```

sin errores.

## Runbook IAM

1. Iniciar sesion con usuario con rol autorizado.
2. Confirmar que el header muestra:
   - Nombre completo.
   - Rol visible.
   - Email de login.
3. Confirmar que si el usuario tiene `can_approve: true`, ve `Crear Ordenes`.
4. Confirmar que si no tiene `can_approve` ni `can_create_assets`, no ve el enlace.
5. Acceder manualmente a `/mantenimiento/crear-ordenes` con usuario sin capacidades.
6. Confirmar pantalla `Acceso Restringido`.
7. Confirmar insercion en `access_denied_logs`.

## Runbook SuperAdmin D10S

1. Iniciar sesion con perfil autorizado para Nivel 1.
2. Abrir `/admin/superadmin`.
3. Confirmar dos zonas visuales:
   - Izquierda: pre-flight, switches, base de datos, branding y checklist.
   - Derecha: tarjeta de identidad supervisada.
4. Confirmar checklist:
   - RLS activo.
   - Enums coincidentes.
   - Firmas historicas revisadas.
   - Buckets de evidencias verificables.
5. Probar el switch de debug y confirmar el aviso sobre silencio de telemetria cuando esta apagado.
6. Confirmar que acciones de base de datos abren dialogo de confirmacion.
7. Confirmar instrucciones del logo:
   - `.png`, `.jpg`, `.webp`
   - maximo 2MB
   - 240px x 60px recomendado
8. En identidad, confirmar que email/password no se editan silenciosamente y requieren justificacion GxP/MFA.

## Runbook Crear Usuario Auditor

1. Abrir `/admin/usuarios/nuevo`.
2. Seleccionar:
   - Rol: `auditor`
   - Area: `Entidad Regulatoria Externa`
   - Cargo: `Auditor Externo`
3. Confirmar que quedan forzados y bloqueados:
   - `can_view_audit`
   - `can_access_forensic_sheet`
   - `can_export_controlled_copies`
4. Confirmar que quedan desmarcados y bloqueados:
   - `can_create_assets`
   - `can_execute_maintenance`
   - `can_manage_users`
5. Guardar usuario.
6. Confirmar fila en `usuarios_roles`.
7. Iniciar sesion como auditor y validar redireccion a `/auditoria`.

## Runbook Crear Ordenes

1. Abrir `/mantenimiento/crear-ordenes`.
2. Buscar activo por codigo.
3. Seleccionar activo `Sistemas HVAC`.
4. Confirmar que aparece preview con secciones:
   - Verificacion Inicial
   - Parametros Electricos
   - Ciclo de Refrigeracion
   - Componentes Especiales
5. Confirmar que no aparece alerta de plantilla faltante.
6. Presionar `Generar Orden de Mantenimiento`.
7. Confirmar fila en `mantenimientos_registros` con:
   - `status = PENDING_TECHNICIAN`
   - `notes.progress_step = 1`

## Runbook Plantillas Nuevas

1. Seleccionar activo con `asset_type` sin plantilla.
2. Confirmar alerta de plantilla faltante.
3. Abrir link de agregar parametros.
4. En `/mantenimiento/plantillas?asset_type=<tipo>` agregar 3 filas:
   - Seccion
   - Nombre del Parametro
   - Tipo de Dato
   - Unidad
5. Presionar `Guardar Cambios`.
6. Confirmar bulk insert en `mantenimiento_plantillas_campos`.
7. Confirmar redireccion a `/mantenimiento/crear-ordenes?template_saved=1`.

## Runbook RUI y Evidencias

1. Abrir RUI aprobado o pendiente.
2. Confirmar timeline.
3. Confirmar boton copiar RUI.
4. Confirmar tabla zebra.
5. Si hay evidencias, confirmar miniaturas y modal.
6. Si no hay evidencias, confirmar placeholder.

## Runbook Firma Supervisor

1. Abrir RUI con estado `PENDING_SUPERVISOR`.
2. Confirmar que Tecnico esta completo y Supervisor activo.
3. Confirmar botones:
   - Aprobar Inspeccion
   - Rechazar con Desvio
4. Abrir rechazo.
5. Confirmar selector de retorno dinamico.
6. Confirmar razon obligatoria minimo 15 caracteres.
7. Confirmar insercion en `auditoria_log_cambios`.
8. Confirmar que el comentario queda visible debajo de "GXP LEGAL MEANING".
9. Confirmar que `mantenimientos_registros.notes.gxp_workflow_comments.supervisor.comment` contiene el texto capturado.

## Runbook Firma Calidad y Gerencia

1. Abrir RUI en `PENDING_QUALITY` o `PENDING_MANAGEMENT`.
2. Ingresar comentario de validacion GxP.
3. Firmar aprobacion o rechazo segun corresponda.
4. Confirmar avance de estado documental.
5. Confirmar auditoria en `audit_trail` o `auditoria_log_cambios`.
6. Confirmar comentario visible en su propia tarjeta, no solo en la tarjeta Tecnico.

## Runbook Portal Auditor

1. Iniciar sesion con rol `auditor`.
2. Confirmar aterrizaje en `/auditoria`.
3. Buscar por UUID de RUI o rango de fecha.
4. Confirmar tabla de expedientes cerrados:
   - Codigo de Acta
   - Activo Fijo
   - Ultima Firma
   - Fecha de Cierre UTC
   - Estado
5. Confirmar que no existen acciones de crear, editar, eliminar o reasignar.
6. Abrir "Ver Ficha Forense" y confirmar modal de ciclo de vida.
7. Abrir "Descargar PDF Controlado" y confirmar redireccion a impresion controlada.

## Runbook Copia Controlada

1. Abrir `/api/mantenimiento/exportar-pdf?id=<uuid>` o `/mantenimiento/imprimir/<uuid>`.
2. Confirmar que la vista carga datos desde servidor.
3. Confirmar que se dispara `window.print()` despues de renderizar.
4. Confirmar footer:
   - numero de copia
   - solicitante
   - timestamp UTC
5. Confirmar incremento de `notes.print_metadata.count`.
6. Confirmar evento `PRINT_CONTROLLED_COPY` en auditoria.
7. Si el usuario es `auditor`, confirmar marca de agua de copia controlada.

## Runbook Regresion HVAC Dashboard

1. Abrir `/activos/hvac`.
2. Confirmar que filtra por `asset_type`.
3. Confirmar cards reales.
4. Confirmar counters de salud.
5. Confirmar links `Consultar` a `/activos/hvac/ver/[uuid]`.
