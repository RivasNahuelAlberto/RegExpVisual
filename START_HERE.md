# START_HERE.md

# Bienvenido al proyecto

Antes de escribir una sola línea de código, es obligatorio leer la documentación indicada en este archivo.

Este proyecto no es una implementación convencional de algoritmos.

Es una plataforma educativa basada en trazas instrumentadas.

El objetivo principal no es resolver Regex Matching, sino explicar visualmente cómo distintos algoritmos llegan al resultado.

---

# Orden obligatorio de lectura

Leer los siguientes documentos en este orden.

---

## 1. PROJECT_OVERVIEW.md

Explica:

- objetivo del proyecto;
- alcance;
- filosofía;
- funcionalidades principales.

Permite comprender **qué** se está construyendo.

---

## 2. ARCHITECTURE.md

Explica:

- arquitectura completa;
- responsabilidades;
- flujo del sistema;
- decisiones de diseño.

Permite comprender **cómo** está construido el proyecto.

---

## 3. TRACE_SPEC.md

Define el contrato principal del proyecto.

Describe:

- ExecutionTrace
- ExecutionEvent
- Timeline
- CallTree
- StateGraph

Todo el sistema gira alrededor de esta especificación.

---

## 4. EVENT_MAPPING.md

Explica exactamente cuándo debe emitirse cada evento.

Es obligatorio respetar este documento al instrumentar algoritmos.

---

## 5. UI_SPEC.md

Describe todas las pantallas.

Incluye:

- componentes;
- visualizadores;
- sincronización;
- debugger;
- inspector.

---

## 6. IMPLEMENTATION_PLAN.md

Describe el roadmap completo.

Antes de comenzar una tarea verificar en qué fase del proyecto se encuentra.

---

## 7. AGENTS.md

Contiene las reglas generales para cualquier colaborador.

Incluye:

- restricciones;
- buenas prácticas;
- criterios de aceptación.

---

## 8. CONTRIBUTING.md

Describe las reglas de colaboración del proyecto.

Incluye:

- responsabilidades de frontend y backend;
- convenciones de desarrollo;
- criterios de calidad;
- reglas para mantener la documentación actualizada;
- aclaración de que los commits y los push son realizados manualmente por el propietario del proyecto.

---

## 9. DECISIONS.md

Contiene el registro de decisiones arquitectónicas (Architecture Decision Log).

Explica por qué se eligieron determinadas tecnologías y patrones de diseño.

Antes de proponer cambios estructurales, revisar este documento para comprender el contexto de las decisiones ya tomadas.

---

## 10. docs/algorithms/

Esta carpeta contiene las implementaciones de referencia.

Archivos:

- backtracking.md
- backtracking_memo.md
- bottom_up_dp.md

Estos documentos forman parte de la especificación funcional del proyecto.

No representan ejemplos de implementación.

No deben modificarse.

---

## PROJECT_INDEX.md

Este documento contiene un mapa actualizado del repositorio.

Consultar este archivo antes de explorar el código.

Su objetivo es minimizar el consumo de tokens evitando recorrer directorios innecesariamente.

Leer únicamente los módulos involucrados en la tarea actual.

---

## AI_WORKFLOW.md

Define cómo deben trabajar los agentes durante el desarrollo.

Establece reglas para:

- minimizar el consumo de contexto;
- evitar releer documentación innecesariamente;
- mantener actualizado únicamente el índice del proyecto cuando cambie la estructura;
- limitar las modificaciones de documentación a los casos estrictamente necesarios.

---

# Principios fundamentales

Este proyecto gira alrededor de una sola entidad:

ExecutionTrace

Los algoritmos generan eventos.

Los visualizadores únicamente consumen esos eventos.

El frontend nunca implementa lógica del algoritmo.

El backend nunca conoce detalles de la interfaz.

---

# Antes de implementar cualquier funcionalidad

Verificar siempre:

- ¿Respeta ExecutionTrace?
- ¿Respeta la arquitectura?
- ¿Rompe alguna visualización?
- ¿Está desacoplada?
- ¿Puede reutilizarse?

Si alguna respuesta es negativa, detener la implementación y revisar la documentación.

---

# Restricciones

No modificar:

- comportamiento de los algoritmos;
- orden de exploración;
- recorrido de DP;
- estrategia de memoización.

La única modificación permitida consiste en agregar instrumentación para producir la ExecutionTrace.

---

# Objetivo final

Construir una plataforma reutilizable para visualizar algoritmos instrumentados.

El código debe priorizar:

- claridad;
- mantenibilidad;
- extensibilidad;
- valor educativo.

Las optimizaciones sólo son aceptables si no afectan la comprensión del algoritmo ni la reproducibilidad de la traza.

---

# Definición de éxito

Una funcionalidad se considera terminada únicamente cuando:

- compila correctamente;
- respeta toda la documentación;
- mantiene la arquitectura;
- no introduce lógica duplicada;
- no rompe la sincronización entre visualizadores;
- está documentada;
- puede ser utilizada por otros agentes sin contexto adicional.

Bienvenido al proyecto.