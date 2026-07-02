# docs/IMPLEMENTATION_PLAN.md

# Plan de implementación

## Fase 1 - Infraestructura

Objetivos

- Crear monorepo.
- Configurar React + TypeScript + Vite.
- Configurar NestJS.
- Configurar Tailwind.
- Configurar Render.
- Definir tipos compartidos.

Entregable

Proyecto compilando.

---

## Fase 2 - Motor de trazas

Objetivos

Implementar:

- TraceRecorder
- ExecutionTrace
- Event Factory
- Metrics Collector

Entregable

Backend capaz de producir una traza vacía.

---

## Fase 3 - Instrumentación

Instrumentar:

- Backtracking
- Memoización
- Bottom-Up

Cada algoritmo debe producir exactamente el mismo formato de salida.

Entregable

ExecutionTrace completa.

---

## Fase 4 - API

Endpoints

POST

/api/run

GET

/api/algorithms

GET

/api/version

Entregable

Frontend consumiendo la API.

---

## Fase 5 - UI

Pantallas

- Home
- Runner
- Comparison

Componentes

- Inputs
- Selector
- Toolbar
- Inspector
- Timeline

---

## Fase 6 - Visualizadores

Implementar

- Árbol
- Grafo
- DP
- Timeline
- Métricas

---

## Fase 7 - Debugger

Agregar

Play

Pause

Back

Step

Restart

Speed

Sincronización de todos los visualizadores.

---

## Fase 8 - Comparación

Comparación simultánea de algoritmos.

---

## Fase 9 - Exportación

JSON

PNG

Compartir URL

---

## Criterio de finalización

El proyecto se considera terminado cuando:

- todos los algoritmos producen ExecutionTrace
- todas las vistas consumen únicamente la traza
- existe ejecución paso a paso
- existe comparación
- existe inspector