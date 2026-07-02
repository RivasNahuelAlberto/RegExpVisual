# AI_WORKFLOW.md

# Flujo de trabajo para agentes

Este documento define cómo deben trabajar los agentes que colaboren en este proyecto.

Su objetivo principal es:

- minimizar el consumo de contexto y tokens;
- mantener la arquitectura consistente;
- evitar releer documentación innecesariamente;
- mantener actualizado el índice del proyecto.

---

# Regla principal

Consumir la menor cantidad posible de tokens.

Antes de leer un documento completo preguntarse:

"¿Realmente necesito leer este archivo para realizar la tarea?"

No volver a leer documentación ya conocida si la tarea no lo requiere.

---

# Orden recomendado

## Primera sesión

Leer únicamente:

START_HERE.md

Luego:

PROJECT_OVERVIEW.md

ARCHITECTURE.md

TRACE_SPEC.md

AGENTS.md

Con eso es suficiente para comprender el proyecto.

---

## Sesiones posteriores

No volver a leer toda la documentación.

Leer únicamente:

- los archivos relacionados con la tarea actual;
- PROJECT_INDEX.md para localizar rápidamente el código involucrado.

---

# Antes de implementar

Identificar:

- directorios afectados;
- componentes afectados;
- documentación afectada.

No inspeccionar directorios que no estén relacionados.

---

# Durante la implementación

Respetar:

- arquitectura;
- separación de responsabilidades;
- ExecutionTrace;
- Event Mapping.

---

# Al finalizar

Actualizar únicamente:

PROJECT_INDEX.md

si la estructura del proyecto cambió.

No modificar documentación innecesariamente.

---

# Optimización de tokens

Preferir:

- leer archivos específicos;
- buscar símbolos;
- inspeccionar únicamente el módulo afectado.

Evitar:

- recorrer todo el proyecto;
- releer documentación completa;
- generar resúmenes extensos.

---

# Cambios arquitectónicos

Si una modificación afecta la arquitectura:

actualizar:

ARCHITECTURE.md

Si no la afecta,

NO modificar dicho documento.

---

# Cambios de UI

Actualizar UI_SPEC.md únicamente cuando cambie el comportamiento esperado de la interfaz.

---

# Cambios de eventos

Actualizar:

EVENT_MAPPING.md

TRACE_SPEC.md

únicamente cuando aparezca un nuevo tipo de evento.

---

# Cambios de algoritmos

Las implementaciones de referencia NO deben modificarse.

Únicamente instrumentarse.

---

# Regla final

La documentación debe crecer lentamente.

No generar nuevos documentos cuando una actualización de uno existente sea suficiente.