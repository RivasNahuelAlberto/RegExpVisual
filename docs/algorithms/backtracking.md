# Backtracking (DFS Recursivo)

## Objetivo

Resolver el problema **Regular Expression Matching (Leetcode #10)** utilizando búsqueda recursiva (Depth First Search), **sin memoización**.

Esta implementación constituye la **referencia oficial** del proyecto y deberá conservar exactamente el mismo comportamiento lógico.

---

# Implementación de referencia

```java

private String s;
private String p;
private int m;
private int n;

public boolean isMatch2(String p, String s) {
	m = s.length();
	n = p.length();

	this.s = s;
	this.p = p;

	boolean res = isMatch2(0, 0, 0);

	return res;
}

private boolean isMatch2(int i, int j, int depth) {

	System.out.printf("%isMatch2(i=%d, j=%d)%n", indent(depth), i, j);

	if (j >= n) {

		boolean res = (i == m);

		System.out.printf("%sFIN patron -> %s%n", indent(depth), res);

		return res;
	}

	boolean res;

	if (j + 1 < n && p.charAt(j + 1) == '*') {

		System.out.printf("%sEncontrado '*' para '%c'%n", indent(depth), p.charAt(j));

		System.out.printf("%s-> SKIP (%d,%d)%n", indent(depth), i, j + 2);

		boolean skip = isMatch2(i, j + 2, depth + 1);

		System.out.printf("%s<- SKIP = %s%n", indent(depth), skip);

		boolean consume = false;

		if (i < m && (s.charAt(i) == p.charAt(j) || p.charAt(j) == '.')) {

			System.out.printf("%s-> CONSUME '%c' (%d,%d)%n", indent(depth), s.charAt(i), i + 1, j);

			consume = isMatch2(i + 1, j, depth + 1);

			System.out.printf("%s<- CONSUME = %s%n", indent(depth), consume);
		} else {

			System.out.printf("%sNo se puede consumir%n", indent(depth));
		}

		res = skip || consume;

	} else {

		boolean match = i < m && (s.charAt(i) == p.charAt(j) || p.charAt(j) == '.');

		System.out.printf("%sComparando s[%d] y p[%d] -> %s%n", indent(depth), i, j, match);

		res = match && isMatch2(i + 1, j + 1, depth + 1);
	}

	return res;
}

```

---

# Descripción

Cada estado del algoritmo está definido por el par:

(i, j)

donde:

- `i` representa la posición actual dentro del string `s`
- `j` representa la posición actual dentro del patrón `p`

Cada llamada recursiva intenta determinar si:

```
s[i...]
```

coincide con

```
p[j...]
```

---

# Flujo del algoritmo

Para cada llamada:

1. Registrar entrada al estado `(i,j)`.
2. Verificar si el patrón terminó.
3. Detectar si existe un `*` en `p[j+1]`.
4. Si existe:
   - explorar primero la rama **SKIP**
   - luego explorar la rama **CONSUME** (si corresponde)
5. Si no existe `*`, comparar caracteres y avanzar.
6. Retornar el resultado obtenido.

---

# Orden de exploración (OBLIGATORIO)

Cuando existe un `*`, las ramas deben evaluarse exactamente en este orden:

1. SKIP
2. CONSUME

No invertir este orden.

El árbol de llamadas esperado depende de esta secuencia.

---

# Estados

Cada llamada representa un estado independiente.

En esta implementación:

- NO existe reutilización de estados.
- Un mismo estado puede calcularse múltiples veces.
- Todas las llamadas deben aparecer en el árbol.

---

# Instrumentación

Esta implementación NO debe utilizar:

- System.out.println
- console.log
- logs como mecanismo de comunicación

En su lugar deberá emitir eventos hacia el `TraceRecorder`.

Ejemplos:

- CALL
- COMPARE
- STAR_FOUND
- SKIP_BRANCH
- CONSUME_BRANCH
- RETURN

---

# Restricciones

No modificar:

- lógica del algoritmo
- orden de llamadas
- condiciones
- flujo de retorno

La única modificación permitida consiste en registrar eventos para la generación de la `ExecutionTrace`.

---

# Complejidad esperada

Tiempo:

Exponencial.

Espacio:

O(profundidad de la recursión)

---

# Objetivo educativo

Esta implementación debe mostrar claramente:

- explosión combinatoria
- estados repetidos
- profundidad recursiva
- árbol completo de llamadas

Es la base para comparar posteriormente con Memoización.