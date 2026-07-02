# docs/EVENT_MAPPING.md

# Event Mapping

Este documento define cuándo debe emitirse cada evento.

Todos los algoritmos deberán respetar este contrato.

---

## CALL

Se emite al ingresar a un nuevo estado.

Información

- estado
- profundidad
- padre

---

## RETURN

Se emite inmediatamente antes de abandonar un estado.

Información

- resultado
- estado

---

## COMPARE

Se emite al comparar caracteres.

Información

- carácter de s
- carácter de p
- resultado

---

## STAR_FOUND

Se emite cuando existe '*'.

Información

- posición
- carácter asociado

---

## SKIP_BRANCH

Antes de ejecutar la rama Skip.

---

## CONSUME_BRANCH

Antes de ejecutar Consume.

---

## MEMO_LOOKUP

Antes de consultar Memo.

---

## MEMO_HIT

Cuando el estado ya existe.

---

## MEMO_STORE

Cuando el resultado se guarda.

---

## DP_CELL_START

Antes de calcular una celda.

---

## DP_DEPENDENCY

Cada dependencia utilizada.

---

## DP_CELL_RESULT

Resultado de la celda.

---

## DP_FINISH

Finalización del algoritmo.

---

## FINISH

Resultado final.

Debe ser el último evento.