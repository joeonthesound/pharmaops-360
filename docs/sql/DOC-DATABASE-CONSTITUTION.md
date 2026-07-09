# 📑 Constitución Estructural de la Base de Datos GxP
## Módulo: PharmaOps 360 — Núcleo Relacional y Transaccional

Este documento constituye la especificación técnica obligatoria e inmutable del esquema de base de datos de la plataforma en Supabase. Cualquier modificación en el código fuente de Next.js (Server Actions, Filtros o Mutaciones) debe respetar estrictamente los tipos de datos, llaves foráneas y comportamientos aquí decretados para no alterar el estado de validación computarizada del sistema informático (FDA 21 CFR Part 11).

---

## 🗺️ Mapa Relacional y Dependencias (E-R)

* Un **Activo** (`activos`) es el nodo maestro del equipamiento de la planta.
* Una **Orden de Trabajo** (`ordenes_mantenimiento`) cuelga de un activo y posee un **RUI (UUID)** único.
* La evidencia analógica de campo se guarda dinámicamente mapeando la orden con la definición en `caracteristicas_maestras` a través de la tabla relacional `valores_caracteristicas`.
* El ciclo de vida de firmas seguras (`firmas_ordenes`) restringe el avance de las fases del documento.
* Cualquier alteración transaccional o firma estampa una traza criptográfica e inalterable en `audit_trail`.

---

## 🗂️ Directorio Detallado de Tablas

### 📦 1. Tabla: `public.activos`
* **Descripción:** Catálogo maestro y perfil inmutable de los equipos críticos e infraestructura física del laboratorio.
* **Estructura y Tipado Teórico:**
    * `id`: `BIGINT` (Primary Key, Identity)
    * `uuid`: `UUID` (Identificador lógico único de la máquina)
    * `asset_code`: `TEXT` (Único. Código de planta. Ej: `'HVAC-01'`)
    * `asset_name`: `TEXT` (Descripción oficial regulada)
    * `asset_type`: `TEXT` (Familia tecnológica. Ej: `'Sistemas HVAC'`)
    * `site` / `area` / `location_detail`: `TEXT` (Gobernanza de ubicación física y salas estériles)
    * `brand` / `model` / `serial_number`: `TEXT` (Atributos técnicos del fabricante)
    * `capacity` / `capacity_unit`: `TEXT` (Métricas de potencia. Ej: `'50'`, `'TON'`)
    * `status`: `TEXT` (Estado físico operativo: `'Operativo'`, `'Mantenimiento'`)
    * `status_gxp`: `TEXT` (Estado regulatorio QA: `'APROBADO'`, `'PENDIENTE_REVISION'`)
    * `version`: `INTEGER` (Contador dinámico de control de cambios del equipo)
    * `image_url`: `TEXT` (Puntero del storage para la evidencia fotográfica de la placa)
    * `created_at` / `installation_date` / `last_maintenance_date` / `next_maintenance_date`: `TIMESTAMPTZ / DATE`

---

### 🕵️ 2. Tabla: `public.audit_trail`
* **Descripción:** Caja negra e historial forense inalterable del sistema. Almacena las huellas de auditoría exigidas por las inspecciones regulatorias.
* **Estructura y Tipado Teórico:**
    * `id`: `BIGINT` (Primary Key, Identity)
    * `accion`: `TEXT` (Tipo de evento operativo: `'APPROVE'`, `'REJECT'`, `'MUTATE'`)
    * `entity`: `TEXT` (Tabla o módulo afectado. Ej: `'mantenimientos_registros'`)
    * `entity_uuid`: `TEXT` (UUID del registro modificado para el rastreo forense)
    * `usuario`: `TEXT` (Correo del ejecutor de la acción. Ej: `'josueth.acevedo@gmail.com'`)
    * `comentarios`: `TEXT / JSON` (Almacena justificaciones técnicas y metadatos de entorno como `deviceTimestamp`, `clientIp` y `userAgent`)
    * `created_at` / `timestamp`: `TIMESTAMPTZ`

---

### 🎛️ 3. Tabla: `public.caracteristicas_maestras`
* **Descripción:** Diccionario de variables dinámicas permitidas en los reportes del laboratorio.
* **Estructura y Tipado Teórico:**
    * `id`: `BIGINT` (Primary Key, Identity)
    * `nombre_parametro`: `TEXT` (Identificador en código. Ej: `'Presion_Diferencial'`)
    * `text_label_frontend`: `TEXT` (Etiqueta visual ergonómica para la tablet)
    * `unidad_medida`: `TEXT` (Unidades métricas farmacéuticas. Ej: `'Pa'`, `'°C'`, `'% RH'`)
    * `tipo_dato`: `TEXT` (Restricción estricta mediante CHECK: `'NUMERIC'`, `'TEXT'`, `'BOOLEAN'`)
    * `limite_alerta` / `limite_accion`: `NUMERIC` (Umbrales de tolerancia para desvíos de calidad)
    * `activa`: `BOOLEAN` (Control de vigencia)
    * `version`: `INTEGER` (Control de versionamiento inmutable)
    * **Constraints:** `UNIQUE (nombre_parametro, version)`

---

### 🔄 4. Tabla: `public.control_cambios_activos`
* **Descripción:** Custodia de datos ante modificaciones en el catálogo maestro de equipos. Evita alteraciones sin justificación.
* **Estructura y Tipado Teórico:**
    * `id`: `UUID` (Primary Key)
    * `asset_id`: `BIGINT` (Llave foránea hacia `activos.id`)
    * `datos_anteriores` / `datos_nuevos`: `JSONB` (Fotografías comparativas del estado del registro antes y después)
    * `justificacion_tecnica`: `TEXT` (Declaración obligatoria del porqué de la modificación)
    * `status_control`: `TEXT` (Estado del cambio: `'APROBADO'`, `'RECHAZADO'`)
    * `creado_por` / `firma_qa_user`: `UUID` (Identidades digitales que procesaron el cambio)
    * `creado_at` / `firma_qa_at`: `TIMESTAMPTZ`
    * `metadata_seguridad`: `JSONB` (Captura de IP y UserAgent del navegador)

---

### ✍️ 5. Tabla: `public.firmas_ordenes`
* **Descripción:** Registro criptográfico de validación de flujos mediante PIN de 6 dígitos.
* **Estructura y Tipado Teórico:**
    * `id`: `BIGINT` (Primary Key, Identity)
    * `order_id`: `UUID` (Llave foránea hacia `ordenes_mantenimiento.id` con `ON DELETE CASCADE`)
    * `rol_firma`: `TEXT` (Nivel de la rúbrica: `'TECNICO'`, `'SUPERVISOR'`, `'CALIDAD'`, `'GERENCIA'`)
    * `usuario_email`: `TEXT` (Correo institucional del firmante)
    * `token_firma`: `TEXT` (Hash SHA-256 de verificación estructural)
    * `sign_timestamp`: `TIMESTAMPTZ` (Estampa de tiempo contemporánea)

---

### 📑 6. Tabla: `public.formularios_campos` y `public.formularios_respuestas`
* **Descripción:** Almacenamiento modular para plantillas estáticas de inspección y checklists complementarios.
* **Estructura y Tipado Teórico (`formularios_campos`):**
    * `id`: `BIGINT` | `template_code`: `TEXT` | `section_name`: `TEXT` | `field_key`: `TEXT` | `field_type`: `TEXT` | `evidence_required`: `BOOLEAN`

---

### 📅 7. Tabla: `public.ordenes_mantenimiento`
* **Descripción:** Cabecera y origen transaccional de las Hojas de Trabajo emitidas en la planta.
* **Estructura y Tipado Teórico:**
    * `id`: `UUID` (Primary Key. Generado automáticamente por `gen_random_uuid()`. El RUI del sistema)
    * `asset_id`: `BIGINT` (Llave foránea hacia `activos.id` con `ON DELETE CASCADE`)
    * `code_order`: `TEXT` (Código secuencial regulado único. Ej: `'PM-HVAC-01-20260629210636'`)
    * `tipo_mantenimiento`: `TEXT` (Categoría: `'Preventivo'`, `'Correctivo'`)
    * `created_at`: `TIMESTAMPTZ`

---

### 🧪 8. Tabla: `public.valores_caracteristicas`
* **Descripción:** Celda transaccional dinámica que une los resultados introducidos en las tablets con las variables del activo.
* **Estructura y Tipado Teórico:**
    * `id`: `BIGINT` (Primary Key, Identity)
    * `order_id`: `UUID` (Llave foránea hacia `ordenes_mantenimiento.id` con `ON DELETE CASCADE`)
    * `caracteristica_id`: `BIGINT` (Llave foránea hacia `caracteristicas_maestras.id` con `ON DELETE RESTRICT`)
    * `valor_registrado`: `TEXT` (El dato capturado por el operario en formato string para flexibilizar el tipo de input)
    * `updated_at`: `TIMESTAMPTZ`

---

### 👥 9. Tabla: `public.usuarios_roles`
* **Descripción:** Matriz de control de accesos e identidades digitales habilitadas en la planta.
* **Estructura y Tipado Teórico:**
    * `id`: `BIGINT` | `user_email`: `TEXT` | `full_name`: `TEXT` | `role`: `TEXT` | `can_create_assets`: `BOOLEAN` | `can_execute_maintenance`: `BOOLEAN` | `can_approve`: `BOOLEAN` | `requires_2fa`: `BOOLEAN` | `active`: `BOOLEAN`

---

## 📈 Vistas de Base de Datos Activas (SQL Views)

### 📊 A. `public.view_hvac_dashboard_cards`
* **Configuración:** `WITH (security_invoker = true)` -> Respeta estrictamente las políticas RLS de las tablas base.
* **Propósito:** Procesa las agregaciones matemáticas para las tarjetas del Dashboard principal (`/activos/hvac`), calculando los contadores del semáforo GxP mediante la existencia de filas de datos y firmas en tiempo real.

### 🎛️ B. `public.view_hvac_order_parameters`
* **Configuración:** `WITH (security_invoker = true)`
* **Propósito:** Unifica los parámetros dinámicos recolectados y sus especificaciones para inyectarlos en bucle dentro de los formularios táctiles de la aplicación.