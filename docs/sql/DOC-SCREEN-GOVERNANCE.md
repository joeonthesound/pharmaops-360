# 🏛️ Constitución de Gobernanza de Interfaces y Rutas GxP
## PharmaOps 360 — Matriz Unificada de Identificadores Informáticos (FDA 21 CFR Part 11)

Este documento actúa como la **fuente canónica de verdad** para la asignación de códigos de control (`FORM_ID` y `SCREEN_ID`) en la aplicación. Todo el enrutamiento estático, los mensajes del shell dinámico (`app-shell.tsx`), los registros forenses en `audit_trail` y los badges visuales deben regirse estrictamente por esta matriz unificada para eliminar las discrepancias actuales detectadas en el espacio de trabajo.

---

## 🚨 Reglas Fundamentales de Ingeniería de Software

1. **Separación de Capas (Data vs UI):** Los códigos como `TMP-HVAC-PM` pertenecen exclusivamente a la capa de persistencia de datos (`template_code` en base de datos) y no deben ser confundidos con identificadores de interfaz.
2. **Inmutabilidad del Shell:** El resolvedor centralizado del shell (`resolveScreenId`) es la única autoridad para dictaminar qué pantalla está activa. Se prohíbe la inserción de strings manuales h-12 inline dentro de los componentes de las páginas.
3. **Inclusión de Rutas Administrativas:** El shell debe extender su cobertura a las rutas `/admin/*` para garantizar que las pantallas de auditoría y gestión de usuarios queden bajo la misma aduana de estampado perimetral.

---

## 🗺️ Matriz de Reconciliación y Criterio Canónico de Rutas

A continuación se resuelven de forma definitiva todos los conflictos de nombres encontrados en el código:

| Ruta de Aplicación (Next.js) | Código Oficial Único (`IDENTIFIER`) | Categoría Operativa de Interfaz | Criticidad GxP |
| :--- | :--- | :--- | :--- |
| `/login` | `FORM_ID: FOR-AUTH-LOGIN` | Acceso Seguro Perimetral | Alta |
| `/dashboard` | `SCREEN_ID: SCREEN-GLOBAL-DASH` | Hub de Módulos General | Media |
| `/auditoria` | `SCREEN_ID: SCREEN-AUDIT-TRAIL` | Consulta Forense Global | Alta |
| `/activos` | `SCREEN_ID: SCREEN-ASSET-HUB` | Navegación de Sistemas Planta | Media |
| `/activos/gestion` | `FORM_ID: FOR-MNT-HVAC-CREATE` | Alta / Registro de Equipos | Alta |
| `/activos/hvac` | `FORM_ID: FOR-MNT-HVAC-DASH` | Tablero Principal de Equipos | Alta |
| `/activos/hvac/ver` | `SCREEN_ID: SCREEN-HVAC-ASSET-PROFILE` | Historial de Activo Inmutable | Media |
| `/activos/hvac/ver/[id]` | `FORM_ID: FOR-MNT-HVAC-REV` | Vista de Expediente y Revisión | Alta |
| `/activos/hvac/ver/[id]/control-cambios` | `FORM_ID: FOR-PDAC-CC` | Control de Cambios de Activos | Crítica Absoluta |
| `/mantenimiento` | `SCREEN_ID: SCREEN-MNT-MASTER` | Menú Operativo de Ingeniería | Media |
| `/mantenimiento/crear-ordenes` | `FORM_ID: FOR-MNT-ORDER-GENERATOR` | Lanzamiento de Hojas (RUI) | Alta |
| `/mantenimiento/hvac/rui/ht` | `SCREEN_ID: SCREEN-MNT-RUI-LIST` | Bandeja de Órdenes Emitidas | Media |
| `/mantenimiento/hvac/rui/ht/[id]` | `FORM_ID: FOR-MNT-HVAC-TECH` | Hoja de Trabajo / Captura Técnico | Crítica Absoluta |
| `/mantenimiento/hvac/rui/enviado` | `SCREEN_ID: SCREEN-SIGN-SUCCESS` | Confirmación Post-Firma Exitosa | Baja |
| `/mantenimiento/hvac/rui/rechazado` | `SCREEN_ID: SCREEN-SIGN-REJECTED` | Declaración de Desviación GxP | Alta |
| `/admin/hub-firmas` | `SCREEN_ID: SCREEN-ADM-SIGN-HUB` | Consola de Auditoría de Firmas | Alta |
| `/admin/hub-firmas/[id]` | `SCREEN_ID: SCREEN-QA-REVIEW` | Auditoría Forense de Expediente | Alta |
| `/admin/usuarios` | `SCREEN_ID: SCREEN-ADM-USERS-LIST` | Listado de Firmas y Cuentas | Alta |
| `/admin/usuarios/[numero]` | `FORM_ID: FOR-ADM-USER-MUTATE` | Edición y Gestión de Personal | Crítica Absoluta |
| `/admin/usuarios/nuevo` | `FORM_ID: FOR-ADM-USER-MUTATE` | Alta de Nuevo Operario | Crítica Absoluta |
| `/admin/mantenimiento/reset` | `FORM_ID: FOR-ADM-RESET-WIZARD` | Asistente de Configuración Inicial | Alta |
| `/admin/user` | `SCREEN_ID: SCREEN-ADM-ROLE-PREVIEW` | Simulación y Auditoría UX | Media |
| `/admin/user/technician` | `SCREEN_ID: SCREEN-ADM-ROLE-PREVIEW` | Simulación y Auditoría UX | Media |

---

## 🛠️ Mandato de Refactorización de Código

1. **En `app-shell.tsx`:** Reescribir la función `resolveScreenId` para que use un objeto de emparejamiento exacto basado en esta tabla. Debe remover las expresiones regulares genéricas que colapsaban múltiples rutas en `SCREEN-MNT-RUI-01`.
2. **En las Páginas del Sistema:** Localizar y borrar todos los badges y strings de códigos inyectados manualmente (`FOR-MNT-HVAC-DASH`, `SCREEN_CODE`, etc.). Las páginas deben leer dinámicamente el identificador que les provea el contexto del `app-shell`.