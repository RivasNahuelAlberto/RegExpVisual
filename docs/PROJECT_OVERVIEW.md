# docs/PROJECT_OVERVIEW.md

# Regex Matching Algorithm Explorer

## Descripción

Regex Matching Algorithm Explorer es una plataforma educativa diseñada para estudiar visualmente distintos algoritmos que resuelven el problema **Regular Expression Matching (Leetcode #10)**.

A diferencia de una implementación convencional, el objetivo principal no es obtener únicamente el resultado (`true` o `false`), sino comprender el proceso interno mediante visualizaciones sincronizadas.

La plataforma permite explorar el comportamiento del algoritmo paso a paso, inspeccionar estados individuales, comparar estrategias y analizar métricas de rendimiento.

---

# Objetivos

El proyecto busca responder preguntas como:

- ¿Qué estados visita cada algoritmo?
- ¿Por qué Backtracking explota exponencialmente?
- ¿Cómo evita Memoización recalcular estados?
- ¿Cómo construye DP Bottom-Up su solución?
- ¿Qué diferencias estructurales existen entre los enfoques?

---

# Algoritmos soportados

Actualmente:

- Backtracking
- Backtracking + Memoización
- Programación Dinámica Bottom-Up

La arquitectura deberá permitir agregar nuevos algoritmos sin modificar la interfaz.

---

# Principios

Todo el proyecto gira alrededor de un único concepto:

ExecutionTrace

Los algoritmos generan eventos.

Las visualizaciones únicamente reproducen esos eventos.

Ningún componente gráfico implementa lógica algorítmica.

---

# Arquitectura

Usuario

↓

Selecciona algoritmo

↓

Backend

↓

ExecutionTrace

↓

Frontend

↓

Visualizadores

---

# Visualizadores

- Árbol de llamadas
- Grafo de estados
- Tabla DP
- DAG de dependencias
- Timeline
- Inspector
- Comparador de métricas

---

# Público objetivo

- Estudiantes
- Docentes
- Cursos de Algoritmos
- Programación Dinámica
- Diseño de Algoritmos
- Análisis de Complejidad

---

# Estado del proyecto

Proyecto educativo.

La prioridad es la claridad de la explicación antes que el rendimiento.