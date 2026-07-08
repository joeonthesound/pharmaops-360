# WIKI: Control de Expedientes y Perfiles Dinamicos de Activos Criticos (PDAC)
## Codigo de Documento: WIKI-GXP-PDAC-01 | Estado: VALIDADO

### 1. ALINEACION DE ARQUITECTURA DE ENRUTAMIENTO (UX/UI INDUSTRIAL)
- **Eliminacion de Rutas Muertas (Error 404):** La ruta previamente rota `/activos/hvac/ver` fue recuperada e implementada como terminal central de busqueda de expedientes PDAC. Esta vista deja de operar como una ruta huerfana y pasa a funcionar como punto regulado de entrada para localizar expedientes de activos HVAC criticos.
- **Jerarquia en Sidebar:** El boton "Documento Unico de Inspeccion" fue reubicado como un hijo directo de primer nivel bajo "Activos" y renombrado como "Buscador de Expedientes PDAC (Regulado)" para independizarlo del expediente individual de un activo. Esta reorganizacion permite que el operador acceda a la terminal de busqueda sin depender de una vista de perfil ya activa.

### 2. ABSTRACCION DE IDENTIFICADORES CRIPTOGRAFICOS A CODIGOS HUMANOS (ALCOA+)
- **El Problema del UUID:** Mostrar fragmentos de hashes o UUIDs, por ejemplo `d1c86fd0...`, en el frontend violaba el principio de legibilidad operativa. Estos identificadores son utiles para integridad transaccional interna, pero resultan inutiles para operadores de planta que trabajan con placas fisicas, codigos de equipo y expedientes trazables en lenguaje humano.
- **Solucion Implementada:**
  * El buscador en la terminal `/activos/hvac/ver` ahora intercepta y procesa entradas en lenguaje humano, por ejemplo `HVAC-01` o `HVAC-02`, mapeando el Asset Tag operativo almacenado en `public.activos` mediante la columna implementada `asset_code` (equivalente funcional al codigo/tag regulado del activo) para obtener el UUID transaccional de forma transparente.
  * El cintillo de metadatos de `FORM_ID: FOR-PDAC-REV` ahora muestra de forma prominente el identificador legible `[EXPEDIENTE: HVAC-01]` en lugar del token criptografico, y el titulo de la pagina destaca el Asset Tag en tipografia masiva junto al nombre del activo.

### 3. REDISTRIBUCION ERGONOMICA EN 3 COLUMNAS ASIMETRICAS
Para mitigar el scroll vertical excesivo en pantallas tactiles industriales, el layout del expediente se optimizo en una estructura horizontal de ancho completo (`98vw`) dividida en una grilla de 12 columnas:
- **Columna Izquierda (`lg:col-span-3`) - Imagen del Activo:** Con borde superior gris (Slate) y apertura en modal a pantalla completa mediante Radix UI Dialog para auditoria visual de placas de ingenieria, identificacion fisica y evidencia fotografica del activo.
- **Columna Central (`lg:col-span-6`) - Ficha Tecnica Avanzada:** Con borde superior azul (Indigo). Integra un sistema de sub-tabs nativas ("Datos Generales", "Limites GxP", "Registro Fabrica") para organizar la densidad informativa sin recurrir a sliders prohibidos, limitando los campos a un maximo de 2 lineas para conservar legibilidad.
- **Columna Derecha (`lg:col-span-3`) - Perfil Regular (Solo Lectura):** Con borde superior ambar (Amber) para la visualizacion de setpoints, umbrales operacionales y parametros GxP de consulta controlada.

### 4. INTEGRIDAD DE DATOS Y CONTEXTUALIZACION REGLAMENTARIA
- **Correccion en Contador de Adjuntos:** Se corrigio la consulta en `get-activo-detalle.ts` para normalizar y parsear de forma segura el payload JSONB de evidencias de `public.mantenimientos_registros`. Filas criticas como `WO-HVAC-01-CORRECTED-21` ahora muestran el numero matematico real de archivos adjuntos en lugar de un guion vacio.
- **Tooltips Flotantes Conceptuales:** Se implementaron tooltips con `@radix-ui/react-tooltip` vinculados estrictamente a las cabeceras conceptuales: titulos de KPI estadisticos como MTBF, Ciclo de Vida y Delta de Fallas, ademas de cabeceras de tablas de la bitacora. Estos tooltips instruyen al usuario sobre la procedencia de los datos y el impacto operativo, eliminando la saturacion de tooltips en las celdas de datos.

---
**Estado del Repositorio:** COMPILACION EXITOSA (0 ERRORES EN TYPECHECK). Ready for deployment stage.
