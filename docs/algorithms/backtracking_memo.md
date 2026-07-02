# Backtracking con Memoización

## Objetivo

Resolver **Regular Expression Matching** utilizando DFS recursivo con memoización.

Esta implementación constituye la referencia oficial del proyecto.

Debe producir exactamente el mismo resultado que la versión sin memoización, evitando recomputaciones.

---

# Implementación de referencia

```java

private Map<Estado, Boolean> estados;
private String s;
private String p;
private int m;
private int n;

private String indent(int depth) {
	return "  ".repeat(depth);
}

public boolean isMatch(String p, String s) {
	m = s.length();
	n = p.length();

	estados = new HashMap<Estado, Boolean>();

	this.s = s;
	this.p = p;

	boolean res = isMatch(0, 0, 0);

	return res;
}

private boolean isMatch(int i, int j, int depth) {

	Estado estado = new Estado(i, j);
	
	System.out.printf("%isMatch(i=%d, j=%d)%n", indent(depth), i, j);

	if (j >= n) {

		boolean res = (i == m);

		System.out.printf("%sFIN patron -> %s%n", indent(depth), res);

		return res;
	}

	if (estados.containsKey(estado)) {

		System.out.printf("%sMEMO (%d,%d) = %s%n", indent(depth), i, j, estados.get(estado));

		return estados.get(estado);
	}

	boolean res;

	if (j + 1 < n && p.charAt(j + 1) == '*') {

		System.out.printf("%sEncontrado '*' para '%c'%n", indent(depth), p.charAt(j));

		System.out.printf("%s-> SKIP (%d,%d)%n", indent(depth), i, j + 2);

		boolean skip = isMatch(i, j + 2, depth + 1);

		System.out.printf("%s<- SKIP = %s%n", indent(depth), skip);

		boolean consume = false;

		if (i < m && (s.charAt(i) == p.charAt(j) || p.charAt(j) == '.')) {

			System.out.printf("%s-> CONSUME '%c' (%d,%d)%n", indent(depth), s.charAt(i), i + 1, j);

			consume = isMatch(i + 1, j, depth + 1);

			System.out.printf("%s<- CONSUME = %s%n", indent(depth), consume);
		} else {

			System.out.printf("%sNo se puede consumir%n", indent(depth));
		}

		res = skip || consume;

	} else {

		boolean match = i < m && (s.charAt(i) == p.charAt(j) || p.charAt(j) == '.');

		System.out.printf("%sComparando s[%d] y p[%d] -> %s%n", indent(depth), i, j, match);

		res = match && isMatch(i + 1, j + 1, depth + 1);
	}

	estados.put(estado, res);

	System.out.printf("%sGUARDAR MEMO (%d,%d) = %s%n", indent(depth), i, j, res);

	return res;
}

public static class Estado {
	int i;
	int j;

	public Estado() {

	}

	public Estado(int indexi, int indexj) {
		i = indexi;
		j = indexj;
	}

	@Override
	public boolean equals(Object comp) {

		if (this == comp) {
			return true;
		}

		if (comp == null || getClass() != comp.getClass()) {
			return false;
		}

		Estado otroEstado = (Estado) comp;

		return (i == otroEstado.i) && (j == otroEstado.j);
	}

	@Override
	public int hashCode() {
		return Objects.hash(i, j);
	}
	
	@Override
	public String toString() {
		return "(" + i + ", " + j + ")";
	}
}


```

---

# Descripción

Cada estado está definido por:

(i, j)

Antes de calcular un estado, el algoritmo consulta la estructura de memoización.

Si el estado ya fue calculado:

- se reutiliza el resultado
- no se expanden nuevas llamadas recursivas

---

# Flujo del algoritmo

Para cada estado:

1. Registrar entrada.
2. Verificar fin de patrón.
3. Consultar memo.
4. Si existe:
   - registrar MEMO_HIT
   - retornar inmediatamente.
5. Si no existe:
   - continuar normalmente.
6. Calcular resultado.
7. Guardar resultado en memo.
8. Retornar.

---

# Orden obligatorio

Cuando existe un `*`:

1. SKIP
2. CONSUME

No modificar este orden.

---

# Memoización

La clave de memo está compuesta por:

```
(i,j)
```

El resultado únicamente debe almacenarse:

después de haber terminado completamente el cálculo del estado.

Nunca almacenar resultados parciales.

---

# Instrumentación

Además de los eventos del Backtracking simple, esta implementación debe generar:

- MEMO_LOOKUP
- MEMO_HIT
- MEMO_STORE

Cada uno deberá contener:

- estado
- resultado
- paso de ejecución

---

# Restricciones

No modificar:

- orden de exploración
- lógica
- condiciones
- estructura de memo
- momento en que se guarda el resultado

La única modificación permitida consiste en agregar instrumentación.

---

# Complejidad esperada

Tiempo:

O(m · n)

Espacio:

O(m · n)

más la pila recursiva.

---

# Objetivo educativo

La visualización deberá permitir observar:

- estados reutilizados
- reducción del árbol
- memo hits
- convergencia de llamadas hacia un mismo estado

La comparación visual con Backtracking es uno de los principales objetivos del proyecto.