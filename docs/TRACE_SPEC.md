# docs/TRACE_SPEC.md

# ExecutionTrace

ExecutionTrace representa la ejecución completa de un algoritmo.

Todas las visualizaciones deberán consumir exclusivamente esta estructura.

---

# Estructura

ExecutionTrace

- algorithm
- input
- events
- callTree
- stateGraph
- metrics
- finalAnswer

---

# ExecutionEvent

Cada evento contiene

- id
- step
- type
- timestamp
- state
- description
- variables
- codeReference

---

# Estado

Representado por

(i,j)

---

# Call Tree

Representa las llamadas recursivas.

Solo existe para:

- Backtracking
- Memoización

---

# State Graph

Representa estados únicos.

Permite visualizar convergencia.

---

# Timeline

Lista cronológica de eventos.

Debe ser suficiente para reconstruir completamente la ejecución.

---

# Inspector

Cada evento debe contener información suficiente para mostrar:

- variables
- explicación
- código asociado

---

# Serialización

La traza debe ser completamente serializable en JSON.

No deben existir referencias circulares.

---

# Compatibilidad

Todos los algoritmos deben producir exactamente esta estructura.