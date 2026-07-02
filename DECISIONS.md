# DECISIONS.md

# Registro de decisiones de arquitectura

Este documento registra las decisiones importantes del proyecto y la motivación detrás de cada una.

Su objetivo es preservar el contexto para futuros colaboradores y agentes.

---

# DEC-001

## Toda la aplicación gira alrededor de ExecutionTrace

Estado

Aceptada

Motivación

Todas las visualizaciones deben compartir exactamente la misma información.

No deben reconstruirse árboles ni recalcular estados.

Consecuencia

ExecutionTrace se convierte en la única fuente de verdad.

---

# DEC-002

## Los algoritmos generan eventos

Estado

Aceptada

Motivación

Los algoritmos no deben conocer la interfaz gráfica.

Generar eventos permite:

- reproducir
- pausar
- exportar
- comparar

Consecuencia

Toda la UI depende únicamente de ExecutionTrace.

---

# DEC-003

## Frontend completamente desacoplado

Estado

Aceptada

Motivación

La interfaz no debe implementar lógica del algoritmo.

Beneficios

- reutilización
- mantenibilidad
- incorporación de nuevos algoritmos

---

# DEC-004

## Backend desacoplado de la UI

Estado

Aceptada

El backend produce únicamente datos.

Nunca componentes gráficos.

---

# DEC-005

## Instrumentar en lugar de reescribir

Estado

Aceptada

Las implementaciones de referencia representan la especificación funcional del proyecto.

Únicamente se permite agregar instrumentación.

No modificar la lógica.

---

# DEC-006

## React Flow para grafos

Estado

Aceptada

Motivación

Permite:

- zoom
- pan
- minimap
- nodos personalizados
- edges animados

---

# DEC-007

## ELK.js para layout

Estado

Aceptada

Motivación

Genera árboles jerárquicos limpios y estables.

Evita cruces innecesarios.

---

# DEC-008

## NestJS como backend

Estado

Aceptada

Motivación

Arquitectura modular.

Escalable.

Tipado fuerte.

Separación clara de responsabilidades.

---

# DEC-009

## Render para despliegue

Estado

Aceptada

Frontend

Static Site

Backend

Web Service

Motivación

Simplicidad de despliegue y mantenimiento.

---

# DEC-010

## Inspector lateral en lugar de modal

Estado

Aceptada

Motivación

Permite inspeccionar múltiples estados sin interrumpir la navegación.

Mantiene el contexto visible.

---

# DEC-011

## El proyecto prioriza el valor educativo

Estado

Aceptada

Motivación

Las decisiones técnicas deberán favorecer la comprensión del algoritmo.

Una implementación ligeramente menos eficiente es aceptable si mejora la explicación.

---

# DEC-012

## Git administrado manualmente

Estado

Aceptada

Motivación

Los agentes no administran el repositorio.

No realizan:

- commits
- pushes
- merges
- creación de ramas remotas

Toda integración con Git será realizada manualmente por el propietario del proyecto.

Esto garantiza control total sobre el historial del repositorio.

---

# Cómo agregar una nueva decisión

Cada decisión deberá incluir:

- Identificador (DEC-XXX)
- Estado
- Contexto
- Motivación
- Consecuencias

No eliminar decisiones anteriores.

Si una decisión cambia, agregar una nueva que la reemplace manteniendo el historial.