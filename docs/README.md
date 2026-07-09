# PharmaOps 360 - Documentacion Tecnica

Toda nueva funcionalidad o modulo implementado debe incluir un `README.md` tecnico.

Cada documento debe contener:

1. Objetivo del proceso.
2. Reglas de negocio y validaciones GxP aplicables.
3. Diagrama de flujo en formato Mermaid.
4. Verificar si el Diagrama de Base de datos cambió o no, si se cambió debe actualizar el archivo docs/sql/DOC-DATABASE-CONSTITUTION.md

## Modulos priorizados

- Workflow de Aprobaciones: consume `mantenimientos_registros` y gestiona transiciones de `status` mediante firmas electronicas humanas explicitas.
- Wiki modular principal: ver [`docs/wiki/README.md`](./wiki/README.md).
- SuperAdmin D10S: pre-flight, debug maestro, herramientas de base de datos, white-label e identidad supervisada.
- Portal Auditor: busqueda de expedientes cerrados, ficha forense e impresion de copias controladas read-only.
- Copia controlada: vista HTML print-ready con contador en `notes.print_metadata` y evento `PRINT_CONTROLLED_COPY`.
