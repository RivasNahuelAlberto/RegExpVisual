# PROJECT_INDEX.md

# Índice del proyecto

Este documento sirve como mapa rápido del repositorio.

Su objetivo es evitar recorrer directorios innecesariamente y reducir el consumo de contexto de los agentes.

Actualizar únicamente cuando cambie la estructura del proyecto.

---

# Raíz

```
backend/
frontend/
shared/
docs/
```

---

# backend/

Responsabilidad

Implementación de algoritmos.

Generación de ExecutionTrace.

API.

Métricas.

---

## backend/src/algorithms/

Contiene

- Backtracking
- Memoización
- Bottom-Up

No modificar la lógica.

---

## backend/src/events/

Tipos de eventos.

Factories.

Enums.

---

## backend/src/trace/

Construcción de ExecutionTrace.

---

## backend/src/metrics/

Cálculo de métricas.

---

## backend/src/controllers/

Endpoints REST.

---

## backend/src/services/

Servicios principales.

---

# frontend/

Aplicación React.

---

## frontend/src/pages/

Pantallas principales.

---

## frontend/src/components/

Componentes reutilizables.

---

## frontend/src/visualizers/

Visualizadores.

Ejemplo

Tree

Timeline

DP

Inspector

Metrics

---

## frontend/src/hooks/

Hooks personalizados.

---

## frontend/src/store/

Estado global.

Paso actual.

Debugger.

---

## frontend/src/services/

Comunicación con backend.

---

## frontend/src/types/

Tipos propios del frontend.

---

# shared/

Tipos compartidos.

ExecutionTrace.

ExecutionEvent.

Metrics.

---

# docs/

Documentación del proyecto.

No contiene código.

---

## docs/algorithms/

Implementaciones de referencia.

No modificar.

---

# Actualización

Cuando se agregue:

- un nuevo directorio;
- un nuevo módulo;
- una nueva responsabilidad;

actualizar únicamente este documento.

No agregar documentación redundante.

---

# Última actualización

Actualizar únicamente esta sección cuando cambie la estructura del proyecto.

Versión:

Fecha:

Resumen: