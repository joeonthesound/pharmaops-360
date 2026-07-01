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

1. Iniciar sesion con usuario con rol visible `Administrativo`.
2. Confirmar que el header muestra:
   - Nombre completo.
   - Rol visible.
   - Email de login.
3. Confirmar que si el usuario tiene `can_approve: true`, ve `Crear Ordenes`.
4. Confirmar que si no tiene `can_approve` ni `can_create_assets`, no ve el enlace.
5. Acceder manualmente a `/mantenimiento/crear-ordenes` con usuario sin capacidades.
6. Confirmar pantalla `Acceso Restringido`.
7. Confirmar insercion en `access_denied_logs`.

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

## Runbook Regresion HVAC Dashboard

1. Abrir `/activos/hvac`.
2. Confirmar que filtra por `asset_type`.
3. Confirmar cards reales.
4. Confirmar counters de salud.
5. Confirmar links `Consultar` a `/activos/hvac/ver/[uuid]`.
