# docs/algorithms/bottom_up_dp.md

# Programación Dinámica Bottom-Up

## Objetivo

Resolver **Regular Expression Matching** utilizando Programación Dinámica Bottom-Up.

Esta implementación constituye la referencia oficial del proyecto.

No utiliza llamadas recursivas.

---

# Implementación de referencia

```java

public boolean isMatch3(String s, String p) {
	int m = s.length();
	int n = p.length();

	boolean[][] dp = new boolean[m + 1][n + 1];

	dp[m][n] = true;

	for (int i = m; i >= 0; i--) {
		for (int j = n - 1; j >= 0; j--) {

			boolean firstMatch = i < m && (s.charAt(i) == p.charAt(j) || p.charAt(j) == '.');

			if (j + 1 < n && p.charAt(j + 1) == '*') {
				dp[i][j] = dp[i][j + 2] || (firstMatch && dp[i + 1][j]);
			} else {
				dp[i][j] = firstMatch && dp[i + 1][j + 1];
			}
		}
	}

	return dp[0][0];
}

```

---

# Descripción

Se construye una matriz:

```
dp[m+1][n+1]
```

donde:

```
dp[i][j]
```

representa si:

```
s[i...]
```

coincide con:

```
p[j...]
```

---

# Caso base

Debe inicializarse:

```
dp[m][n] = true
```

No modificar este comportamiento.

---

# Orden de recorrido

La tabla debe recorrerse exactamente así:

```text
for i = m → 0
    for j = n-1 → 0
```

No alterar este orden.

La explicación visual depende de él.

---

# Dependencias

Cuando existe `*`:

```
dp[i][j]

↓

dp[i][j+2]

↓

dp[i+1][j]
```

Cuando no existe `*`:

```
dp[i][j]

↓

dp[i+1][j+1]
```

Estas dependencias deberán poder visualizarse.

---

# Instrumentación

Cada cálculo de una celda debe generar eventos.

Ejemplos:

- DP_CELL_START
- FIRST_MATCH
- STAR_FOUND
- DP_DEPENDENCY
- DP_CELL_RESULT
- DP_FINISH

Cada evento debe registrar:

- posición `(i,j)`
- valor calculado
- dependencias utilizadas
- explicación textual

---

# Restricciones

No modificar:

- recorrido
- fórmula
- inicialización
- dependencias

No reemplazar esta implementación por una versión Top-Down.

El objetivo del proyecto es comparar enfoques distintos.

---

# Complejidad esperada

Tiempo:

O(m · n)

Espacio:

O(m · n)

---

# Objetivo educativo

La interfaz deberá mostrar:

- construcción progresiva de la tabla
- orden de cálculo
- dependencias entre estados
- explicación de cada transición

A diferencia de Backtracking, aquí no existe árbol de llamadas.

La representación principal será:

- tabla DP
- DAG de dependencias
- timeline de cálculo
- inspector de celdas

Estas visualizaciones deben permitir comprender cómo la solución se construye desde los casos base hasta obtener `dp[0][0]`.