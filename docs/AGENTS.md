# docs/AGENTS.md

# Guía para agentes

## Objetivo

Implementar una plataforma educativa para visualizar algoritmos mediante trazas instrumentadas.

---

## Reglas

NO modificar:

- lógica de los algoritmos
- orden de exploración
- orden de memoización
- recorrido de DP

Las implementaciones de referencia son parte de la especificación.

---

## Arquitectura

Los algoritmos generan eventos.

Los visualizadores consumen eventos.

No existe comunicación directa entre ambos.

---

## Responsabilidades

Backend

- ejecutar algoritmos
- generar ExecutionTrace
- calcular métricas

Frontend

- reproducir ExecutionTrace
- sincronizar vistas
- renderizar gráficos

---

## Prohibiciones

No usar

- console.log
- System.out.println

como fuente de datos.

No duplicar lógica entre frontend y backend.

No generar árboles desde el frontend.

---

## Buenas prácticas

Aplicar

- SOLID
- DRY
- KISS
- separación de responsabilidades
- tipado fuerte

---

## Convenciones

Todos los algoritmos implementan

run(input)

↓

ExecutionTrace

Todas las vistas reciben

ExecutionTrace

No consumir directamente el algoritmo.

---

## Criterios de aceptación

Una tarea se considera finalizada únicamente si:

- compila
- mantiene compatibilidad con ExecutionTrace
- no rompe otras visualizaciones
- está documentada
- incluye tipado
- mantiene sincronización del debugger

---

## Objetivo final

Construir una plataforma reutilizable para el estudio de algoritmos.

La prioridad es la claridad pedagógica antes que la optimización.

---

# Optimización de contexto

- Minimizar el consumo de tokens.
- Evitar recorrer el proyecto completo.
- Consultar `PROJECT_INDEX.md` antes de inspeccionar el código.
- Leer únicamente los módulos necesarios para la tarea.
- Evitar releer documentación ya conocida si no fue modificada.