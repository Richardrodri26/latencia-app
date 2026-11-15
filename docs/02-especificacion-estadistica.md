# 02 · Especificación estadística (según los apuntes de clase)

Principio rector: **«No añadir más de lo que nos han dado.»** La app solo usa los procedimientos, la notación y la redacción de los apuntes de clase de Estadística Inferencial. Lo que no aparece en los apuntes se eliminó (ver la sección final). Las Unidades I y II (TLC, simulador, tamaño de muestra con piloto y descriptivos) se conservan porque sí se vieron.

Todas las funciones viven en `src/lib/stats/` como **funciones puras en TypeScript** (sin React) y se prueban con Vitest usando los valores de la sección «Valores de prueba». El plan de cambios del código está en [07-alineacion-con-la-clase.md](07-alineacion-con-la-clase.md); la prueba de hipótesis (Unidad IV) está en [06-pruebas-de-hipotesis.md](06-pruebas-de-hipotesis.md).

## Notación de clase

| Símbolo | Significado (apuntes) |
|---------|-----------------------|
| (θ̂ᵢ ≤ θ ≤ θ̂ₛ) = (1 − α)·100 % | Intervalo de confianza: θ̂ᵢ límite inferior, θ̂ₛ límite superior, θ parámetro, (1 − α)·100 % nivel de confianza (N.C.) |
| N.C. | Nivel de confianza. **«Si no me dan el nivel de confianza, por defecto será 95 %.»** La app arranca en 95 % y permite 90, 95 y 99 %. |
| α, α/2 | α = 1 − N.C. Ej.: α = 5 % → α/2 = 2.5 % → 1 − 0.025 = 0.975 → «busco en la tabla» → Z_{α/2} = 1.96 |
| Z_{α/2} | Valor crítico de la normal estándar |
| t_{α/2} | Valor crítico de la t de Student con gl grados de libertad |
| gl | Grados de libertad |
| q̂ | q̂ = 1 − p̂ |
| e, E | Error de estimación (margen de error): e = Z_{α/2}·σ/√n. En los procedimientos en pasos se llama «margen de error E». |
| SS | Suma de cuadrados: SS = Σx² − (Σx)²/n |
| Sp | Desviación estándar agrupada (dos muestras pequeñas con σ iguales) |

**En la interfaz** las expresiones con subíndice se escriben como texto `Z_{α/2}` y `t_{α/2}` y se muestran con `<sub>` (componente nuevo `MathText`, ver docs/07). Decimales con punto, como en el cuaderno.

## Convenciones de implementación

- Valores críticos con **funciones cuantil** (exactas) en `src/lib/stats/distributions.ts`, envolviendo `jstat`:
  - `zQ(p)` = cuantil de la normal estándar → Z_{α/2} = `zQ(1 − α/2)`.
  - `tQ(p, gl)` = cuantil de la t de Student → t_{α/2} = `tQ(1 − α/2, gl)`.
  - La app usa el cuantil exacto (p. ej. 1.9600, 2.5758) y, en el texto de los pasos, **cita entre paréntesis el valor de tabla de clase** cuando existe (p. ej. «Z_{α/2} = 1.9600 (tabla: 1.96)»). Ver «Valores de tabla de clase».
  - Para la Unidad IV se agregan `zCdf`, `tCdf` y `tPdf` (ver docs/06). Las funciones de cuantiles retiradas se listan en la sección final.
- **Datos que entran a cada cálculo** (sin cambios):
  - Latencia (`X`): solo mediciones con `ok = true` y `warmup = false`.
  - Proporción de incumplimiento del SLA (`S`): mediciones `ok = true` y `warmup = false`.
  - Proporción de fallos (`F`): todas las mediciones con `warmup = false`.
- Formato en la UI: 2 decimales en ms (x̄, s, s², SS, Σx, Σx², E y límites); 4 decimales en errores estándar, valores críticos, variantes de prueba y proporciones (p̂, q̂, E e IC de proporciones).

### Valores de tabla de clase (para citar al lado del exacto)

| N.C. | α/2 | 1 − α/2 | Z_{α/2} de clase | `zQ(1 − α/2)` (SciPy) |
|------|-----|---------|------------------|-----------------------|
| 90 % | 0.05 | 0.95 | 1.645 | 1.644854 |
| 95 % | 0.025 | 0.975 | 1.96 | 1.959964 |
| 98 % | 0.01 | 0.99 | 2.326 | 2.326348 |
| 99 % | 0.005 | 0.995 | 2.576 | 2.575829 |

Los valores t de clase (2.093 con gl = 19; 2.977 con gl = 14; 2.060 con gl = 25) son los de la tabla t; la app calcula `tQ` exacto (2.093024; 2.976843; 2.059539).

### Objeto común de los intervalos (`src/lib/stats/intervals.ts`)

```ts
export const LARGE_SAMPLE_N = 30;            // n ≥ 30 → «muestra grande»
export type Distribution = "z" | "t";

export type IntervalKind =
  | "mean-z-sigma"        // media, σ conocida → Z con σ
  | "mean-z"              // media, σ desconocida y n ≥ 30 → Z con s
  | "mean-t"              // media, σ desconocida y n < 30 → t (gl = n − 1)
  | "proportion"
  | "diff-means-z-sigma"  // dos medias, σ₁ y σ₂ conocidas → Z
  | "diff-means-z"        // dos medias, σ desconocidas, n₁ ≥ 30 y n₂ ≥ 30 → Z con s₁², s₂²
  | "diff-means-pooled"   // dos medias, σ desconocidas e iguales, muestras pequeñas → t con Sp
  | "diff-proportions";

export type ConfidenceInterval = {
  kind: IntervalKind;
  distribution: Distribution;
  confidence: number;      // 0.90 | 0.95 | 0.99 en la UI; las funciones aceptan cualquier valor en (0, 1)
  estimate: number;        // estimador puntual (x̄, p̂, x̄₁ − x̄₂ o p̂₁ − p̂₂)
  lower: number;           // θ̂ᵢ
  upper: number;           // θ̂ₛ
  margin: number;          // margen de error E
  standardError: number;   // error estándar
  criticalValue: number;   // Z_{α/2} o t_{α/2} (cuantil exacto)
  df?: number;             // gl, solo con t
  conditionMet?: boolean;  // solo proporciones: n·p̂ ≥ 5 y n·q̂ ≥ 5 (en diferencias, en ambos grupos)
  warnings: string[];      // solo el aviso de la condición de la normal en proporciones
};

/** Lo mínimo que necesitan los intervalos de medias. */
export type Summary = { n: number; mean: number; variance: number };
```

`Descriptive` (de `descriptive.ts`) cumple `Summary` y además trae `sum` (Σx), `sumSq` (Σx²) y `ss` (SS) para los textos de los pasos (campos nuevos, ver docs/07).

---

## Regla de elección de la distribución (como está en el cuaderno)

**Una media** (función nueva `meanDistribution(n: number, sigmaKnown: boolean): Distribution`):

| Caso | Distribución | Error estándar | Origen |
|------|--------------|----------------|--------|
| σ conocida | **Z** | σ/√n | Cuaderno |
| σ desconocida y n < 30 | **t de Student**, gl = n − 1 | s/√n | Cuaderno: «Como σ es desconocida y n < 30, se usa la distribución T de Student.» |
| σ desconocida y n ≥ 30 | **Z usando s en lugar de σ** | s/√n | **Extensión derivada de la regla del cuaderno** (consecuencia directa de la fila anterior; decisión del usuario del 15-nov-2026) |

**Dos medias** (función nueva `diffMeansDistribution(n1: number, n2: number, sigmasKnown: boolean): Distribution`):

| Caso | Distribución | Error estándar | Origen |
|------|--------------|----------------|--------|
| σ₁ y σ₂ conocidas | **Z** | √(σ₁²/n₁ + σ₂²/n₂) | Cuaderno |
| σ desconocidas e iguales, muestras pequeñas (n₁ < 30 o n₂ < 30) | **t con Sp**, gl = n₁ + n₂ − 2 | Sp·√(1/n₁ + 1/n₂) | Cuaderno (Problema 3.1) |
| σ desconocidas, n₁ ≥ 30 y n₂ ≥ 30 | **Z con s₁², s₂² en lugar de σ₁², σ₂²** | √(s₁²/n₁ + s₂²/n₂) | **Extensión derivada de la regla del cuaderno** |

- Basta con que una de las dos muestras tenga n < 30 para usar t con Sp (decisión 33). En ese caso la app dice: «Se supone σ₁ = σ₂, como en los apuntes.» No se verifica la igualdad (en clase no se vio una prueba para eso).
- En la app las σ poblacionales **nunca se conocen** (solo hay datos medidos), así que la app usa las filas «σ desconocida». Las ramas con σ conocida existen en las funciones para reproducir los ejemplos del cuaderno en las pruebas.
- Con el dataset de respaldo, n = 100 (principal) y n = 30 (piloto) → **Z con s** en ambos casos.

---

## Unidad I · Distribuciones muestrales (se conserva)

### Descriptivos (`descriptive.ts`)
`n`, media `x̄`, varianza muestral `s²`, `s`, mínimo, máximo, mediana, percentil 95 (interpolación lineal), coeficiente de asimetría `g₁ = [n / ((n−1)(n−2))] · Σ((xᵢ − x̄)/s)³` y coeficiente de variación `s/x̄`. **Nuevos:** `sum = Σx`, `sumSq = Σx²` y `ss = Σx² − (Σx)²/n` (los usa el Paso 2 del IC de la media). `variance` se sigue calculando como hasta ahora (dos pasadas); las pruebas verifican que `ss/(n − 1)` coincide con `variance`.

g₁ se conserva **solo como descriptivo**: ya no genera advertencias (no están en los apuntes).

### Simulación de la distribución muestral (`sampling.ts`)
Sin cambios: remuestreo con reemplazo (`resampleMeans`, mulberry32 con semilla), `m` de 2 a 100, 1000 réplicas, histograma de las latencias originales frente al de las medias con la curva `N(x̄, s/√m)`; lo mismo con la proporción `p̂` (`N(p, √(p(1−p)/m))`).

Mensaje didáctico: *«Aunque las latencias no son normales, la distribución de la media muestral se aproxima a la normal cuando m crece (TLC).»*

---

## Unidad II · Estimación y muestreo (se conserva)

### Estimación puntual
| Parámetro | Estimador | Error estándar |
|-----------|-----------|----------------|
| μ | `x̄ = Σx/n` | `s/√n` (o σ/√n si σ es conocida) |
| σ² | `s² = SS/(n − 1)` | — |
| p | `p̂ = x/n`, `q̂ = 1 − p̂` | `√(p̂q̂/n)` |

### Tamaño de muestra (`sampleSize.ts`). Sin cambios; redondear siempre hacia arriba.
- **Media:** `n = (Z_{α/2} · σ / E)²`, usando como σ la `s` del piloto.
- **Proporción:** `n = Z_{α/2}² · p(1−p) / E²`, con `p̂` del piloto o `p = 0.5`.
- **Población finita (opcional):** `n' = n / (1 + (n−1)/N)`.

En la app: después del piloto, botón **«Usar este n»** que precarga el experimento principal.

---

## Unidad III · Intervalos de confianza (`intervals.ts`)

### 1. IC para la media μ — `meanCI(s: Summary, confidence: number, sigma?: number): ConfidenceInterval`

Fórmulas (notación de clase):

- σ conocida: (x̄ − Z_{α/2}·σ/√n ≤ μ ≤ x̄ + Z_{α/2}·σ/√n) = (1 − α)100 %  → `kind: "mean-z-sigma"`.
- σ desconocida, n ≥ 30: (x̄ − Z_{α/2}·s/√n ≤ μ ≤ x̄ + Z_{α/2}·s/√n) = (1 − α)100 %  → `kind: "mean-z"`.
- σ desconocida, n < 30: (x̄ − t_{α/2}·s/√n ≤ μ ≤ x̄ + t_{α/2}·s/√n) = (1 − α)100 %, gl = n − 1  → `kind: "mean-t"`.

`sigma` presente → rama σ conocida (ignora `s.variance`). `warnings` siempre vacío.

Función auxiliar nueva para los ejemplos del cuaderno con sumas: `summaryFromSums(n: number, sumX: number, sumX2: number): Summary` → `mean = sumX/n`, `variance = (sumX2 − sumX²/n)/(n − 1)`.

**Procedimiento en 4 pasos (como en clase; los pasos 1–3 los genera `explainMean` en `src/lib/ciText.ts` y el 4 lo agrega la tarjeta con `interpret.ts`):**

1. **Media muestral:** x̄ = Σx/n = {Σx}/{n} = {x̄} ms.
2. **Desviación estándar muestral:** SS = Σx² − (Σx)²/n = {Σx²} − {Σx}²/{n} = {SS}; s² = SS/(n − 1) = {SS}/{n−1} = {s²}; s = √{s²} = {s} ms.
3. **Intervalo de confianza:**
   - Distribución: «Como σ es desconocida y n ≥ 30, se usa la distribución normal Z con s en lugar de σ.» / «Como σ es desconocida y n < 30, se usa la distribución T de Student.» / (σ conocida) «Como σ es conocida, se usa la distribución normal Z.»
   - Grados de libertad (solo t): gl = n − 1 = {gl}.
   - α = {α}, α/2 = {α/2} → valor de tabla: Z_{α/2} = {crit} (tabla: {valor de clase}) o t_{α/2} = {crit}.
   - Error estándar = s/√n = {s}/√{n} = {SE}.
   - Margen de error E = Z_{α/2}·s/√n = {crit} × {SE} = {E} (con t: E = t_{α/2}·s/√n).
   - IC = x̄ ± E = {x̄} ± {E} → ({θ̂ᵢ} ≤ μ ≤ {θ̂ₛ}) = {N.C.} %.
4. **Interpretación:** ver plantillas.

### 2. IC para una proporción p — `proportionCI(x: number, n: number, confidence: number): ConfidenceInterval`

Fórmula: (p̂ − Z_{α/2}·√(p̂q̂/n) ≤ p ≤ p̂ + Z_{α/2}·√(p̂q̂/n)) = (1 − α)100 %, con q̂ = 1 − p̂.

- `conditionMet = n·p̂ ≥ 5 && n·q̂ ≥ 5`.
- Si **no** se cumple: `warnings = ["No se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5: no se puede usar la distribución normal, así que este intervalo no aplica."]`. Los apuntes no dan otro método, así que **no se inventa uno**: la tarjeta muestra los Pasos 1 y 2, el aviso, y **no** presenta el intervalo como resultado ni la interpretación. Los números calculados se pueden ver dentro de un desplegable «Cálculo de referencia (no aplica)».
- Se conserva el comportamiento actual de recortar los extremos a [0, 1] (solo puede notarse cuando la condición no se cumple o al 99 % con n·p̂ muy cerca de 5).

**Procedimiento en 6 pasos (como en clase; los pasos 1–5 los genera `explainProportion` y el 6 lo agrega la tarjeta con `interpret.ts`):**

1. **Proporción muestral:** p̂ = x/n = {x}/{n} = {p̂}; q̂ = 1 − p̂ = {q̂}.
2. **Verificar que se puede usar la normal:** n·p̂ ≥ 5 y n·q̂ ≥ 5 → {n} × {p̂} = {n·p̂}; {n} × {q̂} = {n·q̂} → «sí se cumple» / «no se cumple (el intervalo no aplica)».
3. **Valor crítico:** {N.C.} %, α/2 = {α/2}, tabla z = {crit} (tabla: {valor de clase}).
4. **Error estándar:** SE = √(p̂q̂/n) = √({p̂} × {q̂}/{n}) = {SE}.
5. **Margen de error e intervalo:** E = {crit} × {SE} = {E}; IC = {p̂} ± {E} → IC {N.C.} % [{θ̂ᵢ} ; {θ̂ₛ}].
6. **Interpretación:** ver plantillas (incluye la lectura complementaria con q̂, como en el Problema 1 de clase).

Se aplica a la proporción que incumple el SLA y a la tasa de fallos (misma función).

### 3. IC para la diferencia de medias μ₁ − μ₂ (A − B) — `diffMeansCI(a: Summary, b: Summary, confidence: number, sigmas?: [number, number]): ConfidenceInterval`

Elige la rama con `diffMeansDistribution`:

- σ conocidas → `kind: "diff-means-z-sigma"`: (x̄₁ − x̄₂) ± Z_{α/2}·√(σ₁²/n₁ + σ₂²/n₂).
- σ desconocidas, n₁ ≥ 30 y n₂ ≥ 30 → `kind: "diff-means-z"`: (x̄₁ − x̄₂) ± Z_{α/2}·√(s₁²/n₁ + s₂²/n₂). *(Extensión derivada de la regla del cuaderno.)*
- σ desconocidas e iguales, muestras pequeñas → `kind: "diff-means-pooled"`: Sp² = [(n₁ − 1)s₁² + (n₂ − 1)s₂²]/(n₁ + n₂ − 2); (x̄₁ − x̄₂) ± t_{α/2}·Sp·√(1/n₁ + 1/n₂), gl = n₁ + n₂ − 2. Se conserva `pooledVariance(a, b)`.

En notación de clase: ({θ̂ᵢ} ≤ μ₁ − μ₂ ≤ {θ̂ₛ}) = (1 − α)100 %.

**Regla de clase:** «Si el intervalo de confianza contiene al cero, no hay diferencias entre las poblaciones.» (contiene ⇔ `lower ≤ 0 ≤ upper`).

**Pasos que muestra la app (`explainDiffMeans`):** (1) datos de cada API: n, x̄, s² (o σ²); (2) distribución elegida con la frase de la regla (y gl y Sp² si es t); (3) valor crítico Z_{α/2} o t_{α/2}; (4) error estándar con sustitución; (5) margen de error E e IC; (6) interpretación con la regla del cero.

### 4. IC para la diferencia de proporciones p₁ − p₂ — `diffProportionsCI(x1: number, n1: number, x2: number, n2: number, confidence: number): ConfidenceInterval`

Fórmula: (p₁ − p₂) = (p̂₁ − p̂₂) ± Z_{α/2}·√(p̂₁q̂₁/n₁ + p̂₂q̂₂/n₂). Sin recorte.

- Misma regla del cero.
- `conditionMet` = condición n·p̂ ≥ 5 y n·q̂ ≥ 5 en ambos grupos. Si no se cumple, el intervalo **se muestra** (así lo hacen las cifras del caso) con la nota: «En {api} no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5.» (decisión 34).
- Pasos que muestra la app (`explainDiffProportions`): (1) p̂₁, q̂₁, p̂₂, q̂₂; (2) valor crítico; (3) error estándar; (4) E e IC; (5) interpretación.

---

## Interpretación automática (`interpret.ts`)

Plantillas en el estilo de los apuntes. Los valores entre llaves se reemplazan; `{conf}` es el N.C. en porcentaje.

- **Media:** «Con {conf}% de confianza, el promedio real del tiempo de respuesta de {api} está entre {lower} ms y {upper} ms.»
- **Media frente al SLA** (como el Paso 4 del Problema 2 de clase; función nueva `interpretMeanVsSla(ci, api, slaMs)`):
  - `upper < sla`: «El límite superior ({upper} ms) está por debajo de {sla} ms: con {conf}% de confianza, el promedio real de {api} cumple el SLA.»
  - `lower > sla`: «El límite inferior ({lower} ms) supera {sla} ms: con {conf}% de confianza, el promedio real de {api} no cumple el SLA.»
  - contiene `sla`: «El valor {sla} ms cae dentro del intervalo: con {conf}% de confianza no se puede garantizar que {api} cumpla el SLA, porque el promedio real podría estar por encima.»
- **Proporción SLA:** «Con {conf}% de confianza, entre el {lower}% y el {upper}% de las peticiones a {api} superan {sla} ms; también significa que entre el {100 − upper}% y el {100 − lower}% sí responden dentro del SLA.»
- **Tasa de fallos:** «Con {conf}% de confianza, entre el {lower}% y el {upper}% de las peticiones a {api} fallan (error de red, timeout o estado distinto de 2xx).»
- **Proporción cuando no se cumple la condición:** no hay interpretación; solo el aviso del Paso 2.
- **Diferencia de medias:**
  - Contiene 0: «El intervalo contiene al cero: con {conf}% de confianza no hay diferencias entre el tiempo medio de {A} y el de {B}.»
  - Todo por debajo de 0: «El intervalo no contiene al cero: hay diferencia. {A} responde en promedio entre {|upper|} y {|lower|} ms antes que {B}.»
  - Todo por encima de 0: «El intervalo no contiene al cero: hay diferencia. {B} responde en promedio entre {lower} y {upper} ms antes que {A}.»
- **Diferencia de proporciones:**
  - Contiene 0: «El intervalo contiene al cero: con {conf}% de confianza no hay diferencias en la proporción de peticiones que incumplen el SLA.»
  - Por debajo de 0: «El intervalo no contiene al cero: hay diferencia. {A} incumple el SLA con menos frecuencia que {B} (entre {|upper|} y {|lower|} puntos porcentuales menos).»
  - Por encima de 0: simétrico con {B}.
- **Recomendación final** (`recommend`, regla nueva; decisión 35). Solo usa lo de clase:
  1. Si el IC de la **diferencia de medias** no contiene al cero, se recomienda la API más rápida: «Se recomienda {api}: el IC de la diferencia de medias no contiene al cero y {api} responde más rápido.» (`criterion: "media"`).
  2. Si lo contiene, se mira el IC de la **diferencia de proporciones que incumplen el SLA**: si no contiene al cero, «No hay diferencias en el tiempo medio (el IC contiene al cero). Se recomienda {api} por incumplir el SLA con menor frecuencia (el IC de la diferencia de proporciones no contiene al cero).» (`criterion: "sla"`).
  3. Si ambos contienen al cero: «No hay evidencia suficiente para preferir una API; aumentar n o considerar otros criterios.» (`criterion: null`).

  Ya no hay desempate por varianza.

---

## Valores de prueba (calculados con SciPy 1.18)

Tolerancia `1e-3` en las pruebas unitarias. Cada caso indica la llamada sugerida. «Cuaderno» es el valor redondeado escrito en los apuntes.

### Cuantiles

| Llamada | SciPy | Cuaderno |
|---------|-------|----------|
| `zQ(0.95)` | 1.644854 | 1.645 |
| `zQ(0.975)` | 1.959964 | 1.96 |
| `zQ(0.99)` | 2.326348 | 2.326 |
| `zQ(0.995)` | 2.575829 | 2.576 (en IC) / 2.575 (tabla de pruebas, ver docs/06) |
| `tQ(0.975, 19)` | 2.093024 | 2.093 |
| `tQ(0.995, 14)` | 2.976843 | 2.977 |
| `tQ(0.975, 25)` | 2.059539 | 2.060 |
| `tQ(0.975, 4)` | 2.776445 | — |
| `tQ(0.975, 8)` | 2.306004 | — |

### Ejemplos del cuaderno

**C1 · Media, σ conocida** — `meanCI({ n: 30, mean: 780, variance: NaN }, 0.95, 40)` → `kind: "mean-z-sigma"`.

| | SciPy | Cuaderno |
|-|-------|----------|
| Error estándar σ/√n | 7.302967 | — |
| E | 14.313553 | 14.31 |
| IC 95 % | [765.686447 ; 794.313553] | (765.69 ≤ μ ≤ 794.31) |

**C2 · Días sin accidentes (σ desconocida, n = 20 < 30 → t)** — `meanCI(summaryFromSums(20, 873, 39217), 0.95)` → `kind: "mean-t"`, `df: 19`.

| | SciPy | Cuaderno |
|-|-------|----------|
| x̄ | 43.650000 | 43.65 |
| SS | 1110.550000 | 1110.55 |
| s² | 58.450000 | 58.45 |
| s | 7.645260 | 7.645 |
| t_{α/2} (gl = 19) | 2.093024 | 2.093 |
| Error estándar | 1.709532 | 1.7095 |
| E | 3.578092 | 3.578 |
| IC 95 % | [40.071908 ; 47.228092] | [40.07 ; 47.23] |

**C3 · Tiempo de respuesta de la API (n = 15 < 30 → t, 99 %)**. En clase se restó 215 a cada dato (d = x − 215; «eso no cambia la varianza»): Σd = −7, Σd² = 3301. Equivale a Σx = 3218 y Σx² = 693666. Llamada: `meanCI(summaryFromSums(15, 3218, 693666), 0.99)` → `kind: "mean-t"`, `df: 14`. (La app no usa el truco de restar 215; es solo para el cálculo a mano.)

| | SciPy | Cuaderno |
|-|-------|----------|
| x̄ | 214.533333 | 214.53 |
| SS | 3297.733333 | 3297.73 |
| s² | 235.552381 | 235.55 |
| s | 15.347716 | 15.35 |
| t_{α/2} (gl = 14) | 2.976843 | 2.977 |
| Error estándar | 3.962763 | 3.963 |
| E | 11.796523 | 11.80 |
| IC 99 % | [202.736811 ; 226.329856] | [202.74 ; 226.33] |

Con SLA = 220 ms, `interpretMeanVsSla` debe devolver la frase «contiene» (220 cae dentro del intervalo), como el Paso 4 de clase.

**C4 · Proporción, uso correcto de EPP (123/150, 95 %)** — `proportionCI(123, 150, 0.95)`.

| | SciPy | Cuaderno |
|-|-------|----------|
| p̂ ; q̂ | 0.820000 ; 0.180000 | 0.82 ; 0.18 |
| n·p̂ ; n·q̂ | 123 ; 27 → `conditionMet: true` | 123 ; 27 |
| SE | 0.031369 | 0.03137 |
| E | 0.061482 | 0.0615 |
| IC 95 % | [0.758518 ; 0.881482] | [0.7585 ; 0.8815] |

**C5 · Tasa de fallos (34/400, 99 %)** — `proportionCI(34, 400, 0.99)`.

| | SciPy | Cuaderno |
|-|-------|----------|
| p̂ ; q̂ | 0.085000 ; 0.915000 | 0.085 ; 0.915 |
| SE | 0.013944 | 0.01394 |
| E | 0.035918 | 0.0359 |
| IC 99 % | [0.049082 ; 0.120918] | [0.0491 ; 0.1209] |

**C6 · Proporción 10/200 (95 %)** — `proportionCI(10, 200, 0.95)`: p̂ = 0.05, q̂ = 0.95, SE = 0.015411, E = 0.030205, IC [0.019795 ; 0.080205]. Cuaderno: 0.05 ± 0.030 → (0.02 ≤ p ≤ 0.08).

**C7 · Diferencia de medias, σ conocidas (largueros, 90 %)** — `diffMeansCI({ n: 10, mean: 87.6, variance: NaN }, { n: 12, mean: 74.5, variance: NaN }, 0.90, [1.0, 1.5])` → `kind: "diff-means-z-sigma"`.

| | SciPy | Cuaderno |
|-|-------|----------|
| x̄₁ − x̄₂ | 13.100000 | 13.1 |
| Error estándar | 0.536190 | — |
| E | 0.881955 | 0.882 |
| IC 90 % | [12.218045 ; 13.981955] | (12.21 ≤ μ₁ − μ₂ ≤ 13.98) |

Diferencia: el cuaderno escribe 12.21, pero 13.1 − 0.882 = 12.218, que redondea a 12.22 (el cuaderno truncó). No contiene 0 → hay diferencia.

**C8 · Problema 2.2 (σ conocidas, 98 %)** — `diffMeansCI({ n: 60, mean: 125, variance: NaN }, { n: 70, mean: 134, variance: NaN }, 0.98, [20, 25])` (σ₁² = 400, σ₂² = 625) → `kind: "diff-means-z-sigma"`.

| | SciPy | Cuaderno |
|-|-------|----------|
| Z_{α/2} | 2.326348 | 2.326 |
| Error estándar | 3.949081 | — |
| E | 9.186935 | 9.19 |
| IC 98 % | [−18.186935 ; 0.186935] | (−18.19 ≤ μ₁ − μ₂ ≤ 0.19) |

Contiene 0 → no hay diferencia.

**C9 · Problema 3.1 (σ desconocidas e iguales, muestras pequeñas, 95 %)** — `diffMeansCI({ n: 15, mean: 1240, variance: 85 ** 2 }, { n: 12, mean: 1180, variance: 92 ** 2 }, 0.95)` → `kind: "diff-means-pooled"`, `df: 25`.

| | SciPy | Cuaderno |
|-|-------|----------|
| Sp² | 7770.160000 | 7770.16 |
| Sp | 88.148511 | 88.15 |
| t_{α/2} (gl = 25) | 2.059539 | 2.060 |
| Error estándar Sp·√(1/n₁ + 1/n₂) | 34.139772 | — |
| E | 70.312176 | 70.33 |
| IC 95 % | [−10.312176 ; 130.312176] | (−10.33 ≤ μ₁ − μ₂ ≤ 130.33) |

Diferencia de 0.02 en E: el cuaderno multiplica valores ya redondeados (2.060 × 88.15 × 0.3873 = 70.33). Contiene 0 → no hay diferencia.

**C10 · Diferencia de proporciones (75/1000 vs. 80/2500, 90 %)** — `diffProportionsCI(75, 1000, 80, 2500, 0.90)`.

| | SciPy | Cuaderno |
|-|-------|----------|
| p̂₁ ; p̂₂ | 0.075000 ; 0.032000 | 0.075 ; 0.032 |
| p̂₁ − p̂₂ | 0.043000 | 0.0437 |
| Error estándar | 0.009042 | — |
| E | 0.014873 | 0.014 |
| IC 90 % | [0.028127 ; 0.057873] | (0.029 ≤ p₁ − p₂ ≤ 0.057) |

Diferencias: (1) 0.075 − 0.032 = 0.043 exacto; el «0.0437» del cuaderno es un error de cálculo o de transcripción. (2) E = 0.014873 se escribió truncado como 0.014. Por eso los límites del cuaderno se corren unas milésimas. La conclusión no cambia: no contiene 0 → hay diferencia.

**C11 · Problema 1.2, plataformas X e Y (15/250 vs. 8/300, 99 %)** — `diffProportionsCI(15, 250, 8, 300, 0.99)`.

| | SciPy | Cuaderno |
|-|-------|----------|
| p̂₁ ; p̂₂ | 0.060000 ; 0.026667 | — |
| p̂₁ − p̂₂ | 0.033333 | 0.033 |
| Error estándar | 0.017667 | — |
| E | 0.045507 | 0.046 |
| IC 99 % | [−0.012174 ; 0.078840] | (−0.012 ≤ p₁ − p₂ ≤ 0.079) |

Contiene 0 → no hay diferencia. (En Y, n·p̂ = 8 ≥ 5: la condición se cumple en ambos grupos.)

### Casos sintéticos que se conservan

Datos: `A = [10, 12, 14, 16, 18]`, `B = [20, 22, 24, 26, 28]` (95 %).

| Prueba | Resultado esperado (SciPy) |
|--------|----------------------------|
| Descriptivos de A | x̄ = 14, s² = 10, s = 3.162278, Σx = 70, Σx² = 1020, SS = 40 |
| `meanCI(A, 0.95)` (n = 5 < 30 → t, gl = 4) | [10.073514 ; 17.926486] |
| `diffMeansCI(A, B, 0.95)` (muestras pequeñas → t con Sp, gl = 8) | [−14.612008 ; −5.387992] |
| `proportionCI(20, 100, 0.95)` | [0.121601 ; 0.278399], `conditionMet: true` |
| `diffProportionsCI(20, 100, 10, 100, 0.95)` | [0.002002 ; 0.197998] |
| Tamaño de muestra, media: σ = 50, E = 10 | 96.04 → **97** |
| Tamaño de muestra, proporción: p = 0.5, E = 0.05 | 384.15 → **385** |

### Dataset de respaldo (`public/data/respaldo.csv`, `ok = true` y `warmup = false`, SLA = 300 ms)

Verificado con SciPy sobre el CSV (272 filas, 0 errores). La app usa el cuantil exacto (Z = 1.6449, 1.9600, 2.5758). Sirve para una prueba de integración nueva (`tests/respaldo.test.ts`, ver docs/07) que lea el CSV con `parseCsv` y llame a `computeResults`.

**Fase principal (n = 100 por API → σ desconocida y n ≥ 30 → Z con s)**

| | API A | API B |
|-|-------|-------|
| Σx ; Σx² | 9051.1986 ; 1010727.2239 | 23421.0254 ; 6016093.5780 |
| SS | 191485.2630 | 530649.2702 |
| x̄ (ms) | 90.5120 | 234.2103 |
| s² ; s | 1934.1946 ; 43.9795 | 5360.0936 ; 73.2127 |
| Error estándar s/√n | 4.3979 | 7.3213 |
| IC 90 % | [83.2780 ; 97.7460], E = 7.2340 | [222.1678 ; 246.2527], E = 12.0424 |
| IC 95 % | [81.8922 ; 99.1318], E = 8.6198 | [219.8608 ; 248.5597], E = 14.3494 |
| IC 99 % | [79.1836 ; 101.8403], E = 11.3284 | [215.3519 ; 253.0686], E = 18.8583 |
| Incumple SLA | 2/100: p̂ = 0.02, q̂ = 0.98, n·p̂ = 2 < 5 → **no se cumple** (`conditionMet: false`); referencia: [0 ; 0.0474] | 5/100: p̂ = 0.05, q̂ = 0.95, n·p̂ = 5, n·q̂ = 95 → se cumple; SE = 0.02179, E = 0.04272, IC 95 % [0.0073 ; 0.0927] |
| Fallos | 0/100 (n·p̂ = 0 < 5 → no aplica) | 0/100 (no aplica) |

Descriptivos que se conservan: mediana A 83.7448, B 216.7641; P95 A 92.0128, B 248.4669; mín. A 78.0066, B 211.8495; máx. A 396.0674, B 636.0938; g₁ A 6.8592, B 4.3119; coef. de variación A 0.4859, B 0.3126.

**Diferencia de medias A − B** (σ desconocidas, n₁, n₂ ≥ 30 → Z con s², `kind: "diff-means-z"`): x̄_A − x̄_B = −143.6983; EE = √(1934.1946/100 + 5360.0936/100) = √72.9429 = 8.5407.

| N.C. | E | IC | ¿Contiene 0? |
|------|---|----|--------------|
| 90 % | 14.0481 | [−157.7464 ; −129.6501] | No |
| 95 % | 16.7394 | [−160.4377 ; −126.9589] | No |
| 99 % | 21.9993 | [−165.6976 ; −121.6990] | No |

Interpretación (95 %): «El intervalo no contiene al cero: hay diferencia. API A responde en promedio entre 126.96 y 160.44 ms antes que API B.»

**Diferencia de proporciones SLA A − B**: −0.03, SE = 0.02590.

| N.C. | E | IC |
|------|---|----|
| 90 % | 0.04261 | [−0.0726 ; 0.0126] |
| 95 % | 0.05077 | [−0.0808 ; 0.0208] |
| 99 % | 0.06672 | [−0.0967 ; 0.0367] |

Contiene 0 → no hay diferencia; nota: en A no se cumple n·p̂ ≥ 5. **Recomendación:** API A, criterio «media».

**Fase piloto (n = 30 por API → n ≥ 30 → Z con s)**

| | API A | API B |
|-|-------|-------|
| x̄ ; s | 78.3964 ; 6.4733 | 243.5815 ; 79.3460 |
| IC 95 % | [76.0800 ; 80.7128] | [215.1884 ; 271.9746] |
| Incumple SLA | 0/30 (no aplica) | 2/30, n·p̂ = 2 < 5 (no aplica) |

Diferencia A − B: −165.1851, EE = 14.5347, IC 95 % [−193.6725 ; −136.6977].

**Tamaño de muestra con el piloto (95 %)**: E = 10 ms → A: (1.96 × 6.4733/10)² = 1.6097 → 2 (la app usa el mínimo 10); B: (1.96 × 79.3460/10)² = 241.8504 → **242**. E = 5 ms → A 7, B 968.

---

## Eliminado por no verse en clase

Estos procedimientos estaban en versiones anteriores de esta especificación y en el código, y **se quitan** (decisión del usuario del 15-nov-2026; plan de cambios en docs/07):

- **IC de la varianza y de la desviación estándar (χ²)**: `varianceCI`, `sdCI`, `chiQ`, la advertencia de normalidad y las tarjetas «Desviación estándar σ (χ²)» y «Varianza σ² (χ²)».
- **IC de la razón de varianzas (F)**: `varianceRatioCI`, `fQ`, la tarjeta «Razón de varianzas» y la interpretación «más estable (menor varianza)».
- **IC de Welch** para la diferencia de medias (gl no entero ν): `diffMeansWelch`.
- **Elección Welch/agrupado según la razón de varianzas F**: `compareMeans`, `MeansComparison`, el aviso «se usa el IC de Welch» y el «dato secundario».
- La advertencia de asimetría en el IC de la media con n < 30 (no está en los apuntes).
- El desempate de la recomendación por menor varianza.
- Valores de prueba retirados: `chiQ(·)`, `fQ(·)`, IC de varianza/desviación de A, IC de la razón A/B, el caso Welch `X = [100, 120, 110, 130, 90, 105]`, `Y = [150, 170, 140, 200, 160, 180, 155]`.
- Tampoco se agregan (no aparecen en los apuntes): potencia, errores tipo I/II y la frase «no se rechaza H₀» (la clase dice «se acepta H₀»).
