# docs/ARCHITECTURE.md

# Arquitectura del Sistema

## Objetivo

Este documento describe la arquitectura general del proyecto y las decisiones de diseño adoptadas.

El objetivo principal es construir una plataforma educativa para visualizar algoritmos instrumentados mediante una traza de ejecución común (`ExecutionTrace`).

Todos los componentes del sistema deben respetar esta arquitectura.

---

# Filosofía

El proyecto se basa en un principio fundamental:

> **Los algoritmos no dibujan interfaces. Los algoritmos generan eventos.**

El backend produce una representación estructurada de la ejecución.

El frontend únicamente interpreta dicha representación.

Esto permite:

- desacoplar lógica y visualización;
- reutilizar visualizadores;
- incorporar nuevos algoritmos sin modificar la UI;
- reproducir ejecuciones paso a paso.

---

# Arquitectura General

```text
                    Usuario

                        │

                        ▼

              Interfaz React (Frontend)

                        │

                        ▼

                 API REST (NestJS)

                        │

                        ▼

              Algorithm Runner Service

                        │

                        ▼

               Trace Recorder Engine

                        │

                        ▼

               ExecutionTrace JSON

                        │

                        ▼

     ┌──────────┬────────────┬─────────────┐
     │          │            │             │
     ▼          ▼            ▼             ▼

 Call Tree   Timeline    DP Viewer   Inspector

                        │

                        ▼

                    Métricas
```

---

# Monorepo

```text
regex-matching-visualizer/

backend/

frontend/

shared/

docs/
```

---

# Backend

Responsabilidades:

- ejecutar algoritmos;
- instrumentar eventos;
- construir árboles;
- construir métricas;
- devolver ExecutionTrace.

El backend nunca conoce la interfaz gráfica.

---

# Frontend

Responsabilidades:

- solicitar ExecutionTrace;
- renderizar visualizadores;
- sincronizar vistas;
- controlar el debugger.

El frontend nunca implementa lógica del algoritmo.

---

# Shared

Contiene los tipos compartidos.

Ejemplos:

ExecutionTrace

ExecutionEvent

Metrics

AlgorithmType

State

---

# Flujo completo

## Paso 1

El usuario ingresa

String

Patrón

Algoritmo

Modo

---

## Paso 2

El frontend envía

POST

/api/run

---

## Paso 3

El backend ejecuta

AlgorithmRunner

---

## Paso 4

Durante la ejecución

cada paso produce eventos.

Ejemplo

CALL

↓

COMPARE

↓

STAR_FOUND

↓

RETURN

---

## Paso 5

El TraceRecorder construye

ExecutionTrace

---

## Paso 6

El backend devuelve JSON.

---

## Paso 7

Todos los visualizadores consumen exactamente esa traza.

---

# Principio de una única fuente de verdad

Existe una única fuente de información:

ExecutionTrace

Nunca se reconstruyen árboles.

Nunca se recalculan estados.

Nunca se interpreta nuevamente el algoritmo.

Todo proviene de la traza.

---

# Componentes

## Algorithm Runner

Selecciona qué algoritmo ejecutar.

No contiene lógica específica.

---

## Algorithms

Implementaciones instrumentadas.

Cada algoritmo implementa:

run(input)

↓

ExecutionTrace

---

## Trace Recorder

Responsable de registrar eventos.

No conoce detalles de React.

---

## Metrics Builder

Calcula:

- llamadas
- estados
- memo hits
- profundidad
- tiempo
- memoria
- etc.

---

## Visualizers

Cada visualizador recibe

ExecutionTrace

No conoce el algoritmo.

Ejemplos:

Tree

Timeline

DP

Metrics

Inspector

---

# Sincronización

Todos los visualizadores comparten un estado global:

currentStep

Cuando cambia:

- cambia el árbol;
- cambia el timeline;
- cambia el inspector;
- cambia la tabla DP;
- cambian las métricas.

No existen estados independientes.

---

# Agregar un nuevo algoritmo

Para incorporar un algoritmo nuevo únicamente debe implementarse:

AlgorithmRunner

↓

TraceRecorder

↓

ExecutionTrace

La interfaz no debe modificarse.

---

# Decisiones de diseño

## ¿Por qué ExecutionTrace?

Permite:

- reproducir;
- pausar;
- exportar;
- comparar;
- inspeccionar.

---

## ¿Por qué eventos?

Porque un evento representa exactamente una acción del algoritmo.

Esto permite construir cualquier visualización.

---

## ¿Por qué React Flow?

Porque soporta:

- zoom
- pan
- nodos personalizados
- minimap
- layout automático

---

## ¿Por qué ELK.js?

Porque garantiza:

- árboles jerárquicos;
- buena distribución;
- pocos cruces.

---

## ¿Por qué NestJS?

Porque facilita:

- modularidad;
- escalabilidad;
- separación de responsabilidades.

---

# Principios

- SOLID
- DRY
- KISS
- Separation of Concerns
- Single Source of Truth
- Event Driven Architecture
- Componentes desacoplados

---

# Regla más importante

Los algoritmos pueden cambiar únicamente agregando instrumentación.

Nunca debe modificarse su comportamiento.