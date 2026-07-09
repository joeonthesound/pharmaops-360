# 📑 PharmaOps 360 — Sistema de Alta Integridad GxP
## Control de Repositorio Central | Cumplimiento FDA 21 CFR Part 11 / ALCOA+

PharmaOps 360 es una Aplicación Web Progresiva (PWA) de alta integridad diseñada específicamente para operaciones farmacéuticas, validación de sistemas computarizados (VSC), calibración y trazabilidad regulada en entornos de manufactura. 

El sistema opera bajo un modelo de arquitectura de Monolito Modular acoplado a un stack tecnológico compuesto por Next.js App Router, TypeScript, Tailwind CSS y Supabase (Autenticación, PostgreSQL y Almacenamiento Seguro de Evidencias e Historiales Inmutables).

---

## ⚖️ VÍNCULO CON LA CONSTITUCIÓN DEL SISTEMA
> **REGLA DE ORO DE INTEGRIDAD (ALCOA+):** Toda visibilidad en la interfaz de usuario debe reflejar estrictamente el estado canónico, en tiempo real e inmutable de la base de datos de Supabase. Quedan estrictamente prohibidas las aproximaciones por cadenas de texto o el harcodeo de datos simulados en entornos de prueba o producción sin el correspondiente registro de desviación. Este repositorio se rige estrictamente por los mandatos inmutables de [**`README-CONTEXT.md`**](./README-CONTEXT.md).

---

## 🛠️ Stack Tecnológico y Comandos de Calificación

Para validar la integridad técnica y la compilación limpia del código antes de cualquier fase de despliegue, el operador o desarrollador debe ejecutar:

```bash
npm run dev        # Inicialización del servidor de desarrollo Next.js local
npm run build      # Compilación de producción (Calificación de Desempeño - PQ)
npm run typecheck  # Validación estricta del árbol de tipos de TypeScript (Cero Errores)