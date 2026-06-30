# Modulo de Workflow de Aprobaciones

## Objetivo

Documentar el proceso de aprobacion humana de ordenes de mantenimiento registradas en `mantenimientos_registros`.

## Reglas GxP

- Las aprobaciones requieren accion humana explicita.
- El estado transaccional se controla mediante la columna `status`.
- No se automatizan firmas ni aprobaciones.
- Toda observacion debe conservar trazabilidad en el registro correspondiente.

## Diagrama de Flujo

```mermaid
flowchart TD
  A[Orden en mantenimientos_registros] --> B[Revision humana]
  B --> C{Decision}
  C -->|Aprobar| D[Actualizar status]
  C -->|Solicitar ajustes| E[Registrar observacion]
  E --> F[Status: Cambios solicitados]
  D --> G[Continuar flujo de firmas]
```
