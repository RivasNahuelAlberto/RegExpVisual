# CONTRIBUTING.md

# Guía de contribución

Gracias por contribuir al proyecto **Regex Matching Algorithm Explorer**.

Este documento define las reglas de desarrollo que deben seguir todos los colaboradores y agentes.

---

# Objetivo

Mantener un código:

- limpio;
- desacoplado;
- mantenible;
- consistente;
- educativo.

La prioridad del proyecto es la claridad del funcionamiento interno de los algoritmos.

---

# Flujo de trabajo

Los colaboradores y agentes son responsables únicamente del desarrollo de código y documentación.

La administración del repositorio (commits, ramas, merges y pushes) es responsabilidad exclusiva del propietario del proyecto.

## Importante

Los agentes **NO** deben:

- ejecutar `git push`;
- crear Pull Requests;
- modificar ramas remotas;
- asumir permisos sobre el repositorio.

Los cambios deberán quedar preparados localmente para que el propietario los revise e integre manualmente.

---

# Convenciones generales

Todo cambio debe respetar la documentación existente.

Antes de comenzar una implementación revisar:

- START_HERE.md
- ARCHITECTURE.md
- TRACE_SPEC.md
- AGENTS.md

---

# Principios de diseño

Aplicar siempre:

- SOLID
- DRY
- KISS
- Separation of Concerns
- Single Responsibility
- Strong Typing
- Event Driven Architecture

---

# Backend

El backend es responsable de:

- ejecutar algoritmos;
- generar eventos;
- construir ExecutionTrace;
- calcular métricas.

Nunca debe contener lógica de visualización.

---

# Frontend

El frontend es responsable de:

- renderizar ExecutionTrace;
- sincronizar visualizadores;
- controlar la reproducción de eventos.

Nunca debe implementar lógica del algoritmo.

---

# Algoritmos

Las implementaciones de referencia son parte de la especificación.

Está permitido:

- agregar instrumentación;
- agregar eventos;
- agregar métricas.

No está permitido:

- modificar la lógica;
- optimizar el algoritmo;
- alterar el orden de exploración;
- modificar el recorrido de DP;
- cambiar el comportamiento observable.

---

# Código

Todo código nuevo deberá:

- estar tipado;
- ser modular;
- ser reutilizable;
- contener nombres descriptivos;
- evitar duplicación.

---

# Documentación

Toda funcionalidad nueva deberá actualizar la documentación correspondiente.

Si cambia la arquitectura:

actualizar ARCHITECTURE.md.

Si cambia la UI:

actualizar UI_SPEC.md.

Si aparece un nuevo tipo de evento:

actualizar EVENT_MAPPING.md y TRACE_SPEC.md.

---

# Testing

Toda modificación deberá preservar:

- compatibilidad con ExecutionTrace;
- sincronización entre visualizadores;
- funcionamiento del modo paso a paso.

---

# Calidad esperada

Antes de considerar terminada una tarea verificar:

- compila correctamente;
- respeta la arquitectura;
- mantiene el desacoplamiento;
- está documentada;
- no rompe funcionalidades existentes.

---

# Commits

Los agentes NO realizan commits.

Los agentes NO realizan pushes.

Toda integración con Git será realizada manualmente por el propietario del proyecto después de revisar los cambios.

---

# Filosofía

La prioridad del proyecto no es construir el algoritmo más rápido.

La prioridad es construir la mejor herramienta posible para comprender cómo funcionan estos algoritmos internamente.