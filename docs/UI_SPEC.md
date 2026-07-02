# docs/UI_SPEC.md

# Especificación de interfaz

## Pantalla principal

Debe permitir:

- ingresar String
- ingresar Patrón
- elegir algoritmo
- elegir modo
- ejecutar

---

## Runner

Debe contener

Toolbar

↓

Visualizador principal

↓

Timeline

↓

Inspector

↓

Métricas

---

## Toolbar

Controles

- Run
- Pause
- Play
- Step
- Back
- Restart

---

## Árbol

Debe permitir

- zoom
- pan
- scroll
- minimap
- selección

Layout jerárquico obligatorio.

---

## Tabla DP

Debe mostrar

- valor
- orden de cálculo
- dependencias

---

## Inspector

Al seleccionar un nodo debe mostrar

- estado
- variables
- resultado
- explicación
- fragmento de código

---

## Timeline

Debe estar sincronizado con todos los visualizadores.

Modificar el paso actual actualiza toda la interfaz.

---

## Métricas

Mostrar

- tiempo
- memoria
- llamadas
- profundidad
- memo hits
- estados únicos
- estados repetidos

---

## Comparación

Tres columnas

Backtracking

Memo

DP

Todas sincronizadas.

---

## Diseño

Tema claro y oscuro.

Diseño responsive.

No utilizar ventanas emergentes para información principal.

Preferir panel lateral.