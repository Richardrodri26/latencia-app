# 06 · Prueba de hipótesis para la diferencia de medias (Unidad IV)

Especificación para implementar **una sola** prueba de hipótesis: la de **diferencia de medias μ_A − μ_B**, con el procedimiento de clase. Se implementa **después** de [07-alineacion-con-la-clase.md](07-alineacion-con-la-clase.md) (hitos 8–11), porque reutiliza `Summary`, `diffMeansDistribution`, `pooledVariance` y los componentes de pasos que deja ese plan.

Principio rector: **«No añadir más de lo que nos han dado.»** No se agregan errores tipo I/II, potencia, tamaño del efecto, pruebas para una media, para proporciones ni para varianzas. La redacción es la de clase: «se acepta H₀» / «se rechaza H₀».

## 1. Lo que dicen los apuntes

**Procedimiento de clase (4 pasos):**

1. **Plantear las hipótesis:** H₀ con «=», H₁ con «>», «<» o «≠».
2. **Elegir el nivel de significancia α** (si no lo dan, se asume α = 5 %).
3. **Emplear la variante estadística** con base en el tamaño de la muestra, la varianza poblacional, etc.
4. **Decidir:** si la variante cae en la **Z.A.** se acepta H₀; si la variante cae en la **R.C.** se rechaza H₀; si el **p-valor ≤ α** se rechaza H₀.

**Tipos de prueba:**

| Tipo | Hipótesis | Región crítica | Puntos críticos |
|------|-----------|----------------|-----------------|
| a) Unilateral (derecha) | H₀: θ = θ′, H₁: θ > θ′ | a la derecha | P.C.S. |
| b) Unilateral a la izquierda | H₀: θ = θ′, H₁: θ < θ′ | a la izquierda | P.C.I. |
| c) Bilateral | H₀: θ = θ′, H₁: θ ≠ θ′ | en ambas colas | P.C.I. y P.C.S. |

Donde: **Z.A.** = zona de aceptación; **R.C.** = región crítica; **P.C.I.** = punto crítico inferior; **P.C.S.** = punto crítico superior.

**Tabla de valores Z de los apuntes:**

| N.S. (α) | Unilateral | Bilateral | SciPy unilateral `zQ(1 − α)` | SciPy bilateral `zQ(1 − α/2)` |
|----------|------------|-----------|------------------------------|-------------------------------|
| 1 % | 2.326 | 2.575 | 2.326348 | 2.575829 |
| 5 % | 1.645 | 1.96 | 1.644854 | 1.959964 |
| 10 % | 1.282 | 1.645 | 1.281552 | 1.644854 |

La app usa el cuantil exacto y cita el valor de tabla entre paréntesis (p. ej. «P.C.I. = −1.6449 (tabla: −1.645)»). Nota: el valor bilateral al 1 % de la tabla de clase es 2.575; el exacto 2.575829 redondea a 2.576 (el que usan los apuntes en los IC al 99 %). Es un redondeo de tabla, no un error de la app.

## 2. Aplicación al caso: θ = μ_A − μ_B

- **H₀:** μ_A − μ_B = δ₀ (por defecto δ₀ = 0).
- **H₁:** según el tipo elegido: μ_A − μ_B < δ₀ (unilateral a la izquierda), μ_A − μ_B > δ₀ (unilateral a la derecha) o μ_A − μ_B ≠ δ₀ (bilateral).
- **α** ∈ {1 %, 5 %, 10 %} en la UI (las de la tabla de clase); por defecto **5 %**. La función acepta cualquier α en (0, 1) para poder probar el caso de clase al 2 %.

### Variante estadística (paso 3), con la misma regla que el IC (docs/02)

La rama se elige con `diffMeansDistribution(n1, n2, sigmasKnown)` de `intervals.ts`:

| Caso | Variante | Origen |
|------|----------|--------|
| σ_A y σ_B conocidas | Z = [(x̄_A − x̄_B) − δ₀] / √(σ_A²/n_A + σ_B²/n_B) | Cuaderno (solo en funciones y pruebas; en la app σ nunca se conoce) |
| σ desconocidas, n_A ≥ 30 y n_B ≥ 30 | Z = [(x̄_A − x̄_B) − δ₀] / √(s_A²/n_A + s_B²/n_B) | Extensión derivada de la regla del cuaderno |
| σ desconocidas e iguales, n_A < 30 o n_B < 30 | t = [(x̄_A − x̄_B) − δ₀] / [Sp·√(1/n_A + 1/n_B)], gl = n_A + n_B − 2, Sp² = [(n_A − 1)s_A² + (n_B − 1)s_B²]/(n_A + n_B − 2) | Cuaderno (Sp y gl del Problema 3.1) |

### Puntos críticos y R.C. (paso 4)

| Tipo | Con Z | Con t (gl) | La variante cae en la R.C. si… |
|------|-------|-----------|-------------------------------|
| Izquierda (<) | P.C.I. = −`zQ(1 − α)` | P.C.I. = −`tQ(1 − α, gl)` | variante ≤ P.C.I. |
| Derecha (>) | P.C.S. = `zQ(1 − α)` | P.C.S. = `tQ(1 − α, gl)` | variante ≥ P.C.S. |
| Bilateral (≠) | P.C.I. = −`zQ(1 − α/2)`, P.C.S. = `zQ(1 − α/2)` | ±`tQ(1 − α/2, gl)` | variante ≤ P.C.I. o variante ≥ P.C.S. |

El borde pertenece a la R.C., para que la decisión por R.C. coincida siempre con «p-valor ≤ α».

### p-valor

Con la CDF de la normal (`zCdf`) o de la t (`tCdf`, gl = n_A + n_B − 2):

| Tipo | p-valor |
|------|---------|
| Izquierda | P(Z ≤ z) = `zCdf(z)` (con t: `tCdf(t, gl)`) |
| Derecha | P(Z ≥ z) = `zCdf(−z)` (con t: `tCdf(−t, gl)`); se usa la simetría para no perder precisión con `1 − cdf` |
| Bilateral | 2·P(Z ≥ \|z\|) = `2 · zCdf(−|z|)` (con t: `2 · tCdf(−|t|, gl)`) |

Formato en la UI: si p < 0.0001 se muestra «< 0.0001»; si no, 4 decimales.

## 3. Funciones TypeScript

### 3.1 `src/lib/stats/distributions.ts` (agregar)

```ts
/** CDF de la normal estándar: P(Z ≤ x). */
export function zCdf(x: number): number {
  return jstat.normal.cdf(x, 0, 1);
}

/** CDF de la t de Student: P(T ≤ x) con gl grados de libertad. */
export function tCdf(x: number, gl: number): number {
  return jstat.studentt.cdf(x, gl);
}

/** Densidad de la t de Student (solo para dibujar la curva). */
export function tPdf(x: number, gl: number): number {
  return jstat.studentt.pdf(x, gl);
}
```

`normalPdf(x, mu, sigma)` ya existe y dibuja la curva Z con `normalPdf(x, 0, 1)`.

`src/types/jstat.d.ts`: agregar `cdf` y `pdf` a la interfaz de distribución:

```ts
interface JStatDist {
  inv: (...args: number[]) => number;
  cdf: (...args: number[]) => number;
  pdf: (...args: number[]) => number;
}
```

(Tras docs/07 la declaración solo tiene `normal` y `studentt`.)

**Precisión de `zCdf` con colas extremas:** con z = −16.83 el p-valor exacto es ≈ 8.0 × 10⁻⁶⁴. `jstat` puede devolver 0 o un número subnormal; ambos se muestran «< 0.0001» y las pruebas solo verifican `pValue < 1e-4`. No reemplazar `jstat` por otra librería.

### 3.2 `src/lib/stats/hypothesis.ts` (nuevo; exportar desde `src/lib/stats/index.ts`)

```ts
import type { Distribution, Summary } from "./intervals";

export type Alternative = "menor" | "mayor" | "distinto";   // <, >, ≠
export type TestDecision = "acepta" | "rechaza";             // «se acepta H₀» / «se rechaza H₀»
export type DiffMeansTestKind = "diff-means-z-sigma" | "diff-means-z" | "diff-means-pooled";

export type DiffMeansTestInput = {
  a: Summary;
  b: Summary;
  delta0: number;               // δ₀, por defecto 0
  alternative: Alternative;
  alpha: number;                // 0.01 | 0.05 | 0.10 en la UI
  sigmas?: [number, number];    // σ conocidas (solo pruebas con ejemplos del cuaderno)
};

export type CriticalPoints = { pci?: number; pcs?: number };

export type DiffMeansTest = {
  kind: DiffMeansTestKind;
  distribution: Distribution;   // "z" | "t"
  alternative: Alternative;
  alpha: number;
  delta0: number;
  estimate: number;             // x̄_A − x̄_B
  standardError: number;        // denominador de la variante
  df?: number;                  // solo t: n_A + n_B − 2
  pooledVariance?: number;      // solo t: Sp²
  statistic: number;            // la variante (Z o t)
  pci?: number;                 // punto crítico inferior (menor y distinto)
  pcs?: number;                 // punto crítico superior (mayor y distinto)
  pValue: number;
  inCriticalRegion: boolean;    // la variante cae en la R.C.
  decision: TestDecision;       // "rechaza" si inCriticalRegion (equivale a pValue ≤ alpha)
};

/** Puntos críticos según el tipo de prueba (tabla de la sección 2). */
export function criticalPoints(
  distribution: Distribution,
  alternative: Alternative,
  alpha: number,
  df?: number,
): CriticalPoints;

/** p-valor con zCdf / tCdf (sección 2). */
export function pValueFor(
  statistic: number,
  distribution: Distribution,
  alternative: Alternative,
  df?: number,
): number;

/** Prueba completa: variante, P.C.I./P.C.S., R.C., p-valor y decisión. */
export function diffMeansTest(input: DiffMeansTestInput): DiffMeansTest;
```

Reglas de `diffMeansTest`:
- `distribution = diffMeansDistribution(a.n, b.n, sigmas !== undefined)`; `kind` como en `diffMeansCI` (docs/02).
- `standardError`: el mismo que usa `diffMeansCI` para esa rama (σ, s o Sp). Conviene extraer un helper interno compartido en `intervals.ts`, p. ej. `diffMeansStandardError(a, b, sigmas?)`, para que IC y prueba no diverjan.
- `inCriticalRegion` con la tabla de la sección 2 (borde incluido); `decision = inCriticalRegion ? "rechaza" : "acepta"`.
- No lanza excepciones; si `a.n < 2` o `b.n < 2` el panel ni se muestra (igual que la comparación hoy).

### 3.3 `src/lib/hypothesisText.ts` (nuevo; solo presentación)

> Nota: la firma real de `explainDiffMeansTest` es `(test, a, b)`, sin los nombres (decisión 49).

```ts
import type { Explanation } from "@/lib/ciText";   // { formula: string; steps: ExplanationStep[] } (docs/07)
import type { DiffMeansTest, Summary } from "@/lib/stats";

export function explainDiffMeansTest(
  test: DiffMeansTest, a: Summary, b: Summary, nameA: string, nameB: string,
): Explanation;

export function concludeDiffMeansTest(test: DiffMeansTest, nameA: string, nameB: string): string;

export const alternativeSymbol: Record<Alternative, "<" | ">" | "≠">;
export const alternativeLabel: Record<Alternative, string>;
// { menor: "Unilateral a la izquierda (H₁: <)", mayor: "Unilateral a la derecha (H₁: >)", distinto: "Bilateral (H₁: ≠)" }
export function formatPValue(p: number): string;   // "< 0.0001" o 4 decimales
```

`formula` de la explicación: la de la variante elegida, con `_{}` para subíndices (se muestra con `MathText`):
- Z con s: `Z = [(x̄_A − x̄_B) − δ₀] / √(s_A²/n_A + s_B²/n_B)`
- Z con σ: `Z = [(x̄_A − x̄_B) − δ₀] / √(σ_A²/n_A + σ_B²/n_B)`
- t: `t = [(x̄_A − x̄_B) − δ₀] / [Sp·√(1/n_A + 1/n_B)],  gl = n_A + n_B − 2`

### 3.4 Textos de los pasos (con sustitución numérica)

Formato: medias y δ₀ con 2 decimales, varianzas con 2, error estándar y variante con 4, puntos críticos con 4 (más el de tabla entre paréntesis cuando α ∈ {1, 5, 10 %} y la variante es Z), p-valor con `formatPValue`.

1. **Paso 1 · Plantear las hipótesis:** «H₀: μ_A − μ_B = {δ₀}; H₁: μ_A − μ_B {<|>|≠} {δ₀} (prueba {unilateral a la izquierda | unilateral a la derecha | bilateral}).»
2. **Paso 2 · Nivel de significancia:** «α = {α·100} % = {α}.»
3. **Paso 3 · Variante estadística:**
   - Z con s: «Como σ_A y σ_B son desconocidas y n_A = {n_A} ≥ 30, n_B = {n_B} ≥ 30, se usa Z con s en lugar de σ.»
   - t: «Como σ_A y σ_B son desconocidas y hay muestras pequeñas (n_A = {n_A}, n_B = {n_B}), se usa la t de Student con varianza agrupada (se supone σ_A = σ_B, como en los apuntes). Sp² = [({n_A} − 1)·{s_A²} + ({n_B} − 1)·{s_B²}]/({n_A} + {n_B} − 2) = {Sp²}; gl = {gl}.»
   - Sustitución Z: «Z = [({x̄_A} − {x̄_B}) − ({δ₀})] / √({s_A²}/{n_A} + {s_B²}/{n_B}) = {x̄_A − x̄_B − δ₀}/{EE} = {Z}.»
   - Sustitución t: «t = [({x̄_A} − {x̄_B}) − ({δ₀})] / [√{Sp²}·√(1/{n_A} + 1/{n_B})] = {numerador}/{EE} = {t}.»
4. **Paso 4 · Decisión:**
   - Puntos críticos: «P.C.I. = {pci} (tabla: {−valor})» y/o «P.C.S. = {pcs} (tabla: {valor})».
   - Zona: «{Z} {< | >} {punto} → la variante cae en la R.C. → se rechaza H₀.» o «{pci} < {Z} < {pcs} → la variante cae en la Z.A. → se acepta H₀.» (en unilaterales: «{Z} > {pci} → cae en la Z.A.»).
   - p-valor: «p-valor = P(Z ≤ {Z}) = {p} {≤ | >} {α} → {se rechaza | se acepta} H₀.» (P(Z ≥ {Z}) en derecha; 2·P(Z ≥ |{Z}|) en bilateral; con t se escribe P(t ≤ …)).

### 3.5 Plantillas de conclusión (`concludeDiffMeansTest`)

`{α}` en porcentaje. Frase de la afirmación según H₁:

| H₁ | δ₀ = 0 | δ₀ ≠ 0 |
|----|--------|--------|
| menor | «el tiempo medio de respuesta de {A} es menor que el de {B}» | «la diferencia de tiempos medios μ_A − μ_B es menor que {δ₀} ms» |
| mayor | «el tiempo medio de respuesta de {A} es mayor que el de {B}» | «la diferencia de tiempos medios μ_A − μ_B es mayor que {δ₀} ms» |
| distinto | «el tiempo medio de respuesta de {A} es distinto del de {B}» | «la diferencia de tiempos medios μ_A − μ_B es distinta de {δ₀} ms» |

- **Se rechaza H₀:** «Se rechaza H₀. Con α = {α}%, hay evidencia de que {afirmación}.»
- **Se acepta H₀:** «Se acepta H₀. Con α = {α}%, no hay evidencia para afirmar que {afirmación}; se acepta que μ_A − μ_B = {δ₀} ms.»

## 4. Interfaz en `/resultados`

Sección nueva **«Prueba de hipótesis: diferencia de medias (Unidad IV)»** en `src/app/resultados/page.tsx`, debajo de `ComparisonPanel` y antes de `Recommendation`. Solo se muestra cuando `results.comparison` existe (≥ 2 latencias válidas por API). Usa la fase seleccionada en la página. El selector de N.C. **no** afecta a α.

### 4.1 Esquema Zod (`src/lib/schemas.ts`, agregar)

```ts
export const ALPHA_LEVELS = [0.01, 0.05, 0.1] as const;
export type AlphaLevel = (typeof ALPHA_LEVELS)[number];

export const alternativeSchema = z.enum(["menor", "mayor", "distinto"]);

export const hypothesisFormSchema = z.object({
  delta0: z
    .number({ error: "Ingresa un número (ms)" })
    .min(-10000, "Mínimo −10000")
    .max(10000, "Máximo 10000"),
  alternative: alternativeSchema,
  alpha: z.union([z.literal(0.01), z.literal(0.05), z.literal(0.1)]),
});
export type HypothesisFormValues = z.infer<typeof hypothesisFormSchema>;

export const DEFAULT_HYPOTHESIS: HypothesisFormValues = { delta0: 0, alternative: "distinto", alpha: 0.05 };
```

El tipo `Alternative` de `hypothesis.ts` debe coincidir con `z.infer<typeof alternativeSchema>` (definirlo en `hypothesis.ts` y comprobarlo con una asignación de tipos, o derivarlo del esquema; `lib/stats` no debe importar Zod, así que se define en `hypothesis.ts` y el esquema lo replica).

Por defecto H₁ es bilateral (≠): es la opción neutral; la unilateral a la izquierda se elige en la demo (decisión 38).

### 4.2 Componentes (nuevos, en `src/components/results/`)

- **`HypothesisForm.tsx`** — TanStack Form (`useForm` con `validators: { onChange: hypothesisFormSchema }`, igual que `ExperimentForm`), con primitivas `Field`, `FieldLabel`, `Input`, `SimpleSelect` (no el `Form` de shadcn):
  - `delta0`: `Input` numérico, etiqueta «δ₀ (valor de H₀, ms)», descripción «0 = sin diferencia».
  - `alternative`: `SimpleSelect` con las 3 opciones de `alternativeLabel`.
  - `alpha`: grupo de botones 1 % / 5 % / 10 % (mismo patrón que `ConfidenceSelector`) o `SimpleSelect`.
  - Recalcula en vivo con valores válidos (`form.Subscribe` → `onChange(values)`); con valores inválidos muestra el error del campo y conserva el último resultado válido. Estado local de la página (no se persiste en `localStorage`).
- **`HypothesisCurve.tsx`** — gráfico con `ChartContainer` de shadcn (Recharts `ComposedChart` o `AreaChart`):
  - Curva de densidad de la variante: `normalPdf(x, 0, 1)` si Z, `tPdf(x, gl)` si t. Eje x de −4 a 4, 161 puntos (paso 0.05). Si un punto crítico supera ±4, ampliar el eje hasta ±(|punto| + 0.5).
  - Dos series de área: **Z.A.** (color `--chart-1` suave) y **R.C.** (color `--destructive`), cada una con `null` fuera de su zona.
  - `ReferenceLine` en P.C.I. y/o P.C.S. con etiqueta «P.C.I. = −1.6449» / «P.C.S. = 1.6449».
  - `ReferenceLine` en la variante, etiqueta «Z = −16.83» (o «t = …»). Si |variante| excede el eje, se dibuja en el borde con la etiqueta «Z = −16.83 (fuera del gráfico ←)» / «(→)».
  - Leyenda: «Z.A. (zona de aceptación)», «R.C. (región crítica)». `role="img"` y `aria-label` con la decisión.
- **`HypothesisPanel.tsx`** — `Card` que junta: el formulario, la curva, la fórmula y los 4 pasos (mismo renderizado de pasos que `CiCard`, con `MathText`), el resultado (variante, puntos críticos, p-valor) y la conclusión en negrita (`role="status"`). Recibe `results: Results` y calcula con `useMemo(() => diffMeansTest({ a: results.a.descriptive, b: results.b.descriptive, ...values }), …)`.

### 4.3 Otros textos
- `src/app/page.tsx`: agregar a la tabla `units` la fila `["IV · Pruebas de hipótesis", "Prueba de hipótesis para la diferencia de medias (H₀, H₁, α, Z.A./R.C., P.C.I./P.C.S., p-valor)", "Resultados → Prueba de hipótesis"]`. El paso 4 de «Cómo usar la app» pasa a «Intervalos de confianza, prueba de hipótesis, comparación A vs. B y recomendación.»
- La recomendación **no** cambia: sigue basada en los IC (docs/02). La prueba es una sección aparte.

## 5. Valores de prueba (SciPy 1.18)

Tolerancia `1e-3` salvo p-valores extremos (se verifica `< 1e-4`).

### 5.1 Funciones de distribución

| Llamada | Valor |
|---------|-------|
| `zCdf(0)` | 0.5 |
| `zCdf(-1.959964)` | 0.025 |
| `zCdf(-2.279011)` | 0.011333 |
| `tCdf(-5, 8)` | 0.000526 |
| `tCdf(1.757481, 25)` | 0.954462 |
| `criticalPoints("z", "menor", 0.05)` | `{ pci: -1.644854 }` |
| `criticalPoints("z", "distinto", 0.01)` | `{ pci: -2.575829, pcs: 2.575829 }` |
| `criticalPoints("z", "mayor", 0.10)` | `{ pcs: 1.281552 }` |
| `criticalPoints("t", "distinto", 0.05, 25)` | `{ pci: -2.059539, pcs: 2.059539 }` |

### 5.2 Caso de clase: Problema 2.2 como prueba bilateral al 2 %

`diffMeansTest({ a: { n: 60, mean: 125, variance: NaN }, b: { n: 70, mean: 134, variance: NaN }, delta0: 0, alternative: "distinto", alpha: 0.02, sigmas: [20, 25] })`

| | SciPy |
|-|-------|
| `kind` | `"diff-means-z-sigma"` |
| Error estándar √(400/60 + 625/70) | 3.949081 |
| Variante Z = −9/3.949081 | −2.279011 |
| P.C.I. ; P.C.S. (`zQ(0.99)`) | −2.326348 ; 2.326348 (cuaderno: 2.326, el de 98 %) |
| ¿R.C.? | No: −2.3263 < −2.2790 < 2.3263 → **Z.A.** |
| p-valor 2·P(Z ≥ 2.279011) | 0.022666 > 0.02 |
| Decisión | **se acepta H₀** |

Coherente con el IC 98 % de clase (−18.19 ≤ μ₁ − μ₂ ≤ 0.19), que contiene 0. (α = 2 % no está en la UI; se prueba solo en la función.)

### 5.3 Caso derivado del cuaderno con t (Problema 3.1 convertido en prueba)

No aparece en los apuntes como prueba; se usa solo para probar la rama t. `a = { n: 15, mean: 1240, variance: 85 ** 2 }`, `b = { n: 12, mean: 1180, variance: 92 ** 2 }`, δ₀ = 0, α = 0.05: Sp² = 7770.16, gl = 25, EE = 34.139772, t = 1.757481.

| H₁ | Puntos críticos | p-valor | Decisión |
|----|-----------------|---------|----------|
| distinto | ±2.059539 | 0.091077 | se acepta H₀ (coherente con el IC 95 % de clase, que contiene 0) |
| mayor | P.C.S. = 1.708141 | 0.045538 | se rechaza H₀ (t = 1.7575 ≥ 1.7081) |

### 5.4 Caso sintético (rama t con datos de la app)

`A = [10, 12, 14, 16, 18]`, `B = [20, 22, 24, 26, 28]`, δ₀ = 0, H₁: menor, α = 0.05 → t con Sp (n < 30), Sp² = 10, gl = 8, EE = 2, t = −5.000000, P.C.I. = −1.859548, p-valor = 0.000526 → se rechaza H₀. Bilateral: p-valor = 0.001053.

### 5.5 Dataset de respaldo (fase principal, n = 100 por API → Z con s)

x̄_A − x̄_B = −143.6983; EE = √(1934.1946/100 + 5360.0936/100) = 8.5407.

| Caso | H₀ / H₁ | α | Variante | Puntos críticos | p-valor | Decisión |
|------|---------|---|----------|-----------------|---------|----------|
| R1 · unilateral izquierda | μ_A − μ_B = 0 / < 0 | 5 % | Z = −143.6983/8.5407 = −16.825194 | P.C.I. = −1.644854 (tabla −1.645) | 7.98 × 10⁻⁶⁴ → «< 0.0001» | R.C. → **se rechaza H₀** |
| R2 · bilateral | = 0 / ≠ 0 | 5 % | −16.825194 | ±1.959964 (tabla ±1.96) | 1.60 × 10⁻⁶³ → «< 0.0001» | R.C. → **se rechaza H₀** |
| R3 · δ₀ = −150, bilateral | = −150 / ≠ −150 | 5 % | Z = (−143.6983 + 150)/8.5407 = 0.737851 | ±1.959964 | 0.460605 | Z.A. → **se acepta H₀** |
| R4 · δ₀ = −100, unilateral izquierda | = −100 / < −100 | 5 % | Z = (−143.6983 + 100)/8.5407 = −5.116497 | P.C.I. = −1.644854 | 1.56 × 10⁻⁷ → «< 0.0001» | R.C. → **se rechaza H₀** |

Conclusiones esperadas:
- R1: «Se rechaza H₀. Con α = 5%, hay evidencia de que el tiempo medio de respuesta de API A es menor que el de API B.»
- R3: «Se acepta H₀. Con α = 5%, no hay evidencia para afirmar que la diferencia de tiempos medios μ_A − μ_B es distinta de −150 ms; se acepta que μ_A − μ_B = −150 ms.» Coherente con que −150 está dentro del IC 95 % [−160.44 ; −126.96].
- R4: «Se rechaza H₀. Con α = 5%, hay evidencia de que la diferencia de tiempos medios μ_A − μ_B es menor que −100 ms.»

Propiedad a probar (coherencia IC–prueba en la rama Z): para la prueba bilateral con α = 1 − N.C., `decision === "acepta"` ⇔ `diffMeansCI(...).lower ≤ δ₀ ≤ diffMeansCI(...).upper`. Probar con δ₀ ∈ {0, −150, −100, −160.4, −126.9} al 95 %.

## 6. Pruebas (`tests/`)

- `tests/stats/hypothesis.test.ts` (nuevo): 5.1 a 5.4 y la propiedad de coherencia; `decision === "rechaza"` ⇔ `pValue ≤ alpha` en todos los casos.
- `tests/respaldo.test.ts` (creado en docs/07): agregar R1–R4 sobre `computeResults` del respaldo.
- `tests/hypothesisText.test.ts` (nuevo): textos de R1 (pasos 1–4 contienen «H₁: μ_A − μ_B < 0», «Z = [(90.51 − 234.21) − (0.00)]», «−16.8252», «P.C.I. = −1.6449 (tabla: −1.645)», «cae en la R.C.», «se rechaza H₀», «< 0.0001») y de R3 («cae en la Z.A.», «se acepta H₀», «0.4606»); y que **ningún** texto contiene «no se rechaza».
- `tests/schemas.test.ts` (nuevo o dentro de uno existente): `hypothesisFormSchema` acepta `DEFAULT_HYPOTHESIS`, rechaza `alpha: 0.02`, `delta0: NaN` y `alternative: "otra"`.

## 7. Criterios de aceptación

1. Con el dataset de respaldo, fase principal, H₁ «<», δ₀ = 0, α = 5 %: la UI muestra Z = −16.8252, P.C.I. = −1.6449 (tabla: −1.645), p-valor «< 0.0001», «la variante cae en la R.C.», «Se rechaza H₀…»; la curva marca P.C.I., sombrea la R.C. a la izquierda y dibuja la variante en el borde izquierdo con «fuera del gráfico ←».
2. Cambiar a bilateral muestra P.C.I. y P.C.S. (±1.9600) y R.C. en ambas colas.
3. δ₀ = −150 bilateral: Z = 0.7379, la línea de la variante queda dentro de la Z.A., p-valor 0.4606, «Se acepta H₀».
4. Cambiar α a 1 % o 10 % recalcula al instante los puntos críticos (2.3263 / 2.5758 y 1.2816 / 1.6449).
5. Un δ₀ vacío o no numérico muestra «Ingresa un número (ms)» y no rompe la página.
6. Ningún texto de la UI menciona errores tipo I/II, potencia ni «no se rechaza H₀».
7. Fase piloto (n = 30 → Z) funciona igual. Un CSV con n < 30 por API muestra la variante t con Sp, gl y la frase del supuesto σ_A = σ_B.
8. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pasan.

## 8. Hitos (después de los hitos 8–11 de docs/07)

| Hito | Trabajo | Terminado cuando |
|------|---------|------------------|
| **12 · Funciones** | `zCdf`, `tCdf`, `tPdf` en `distributions.ts`; `cdf`/`pdf` en `jstat.d.ts`; `hypothesis.ts` y su export en `index.ts`; helper compartido de error estándar en `intervals.ts`; `tests/stats/hypothesis.test.ts`; R1–R4 en `tests/respaldo.test.ts` | Pruebas 5.1–5.5 en verde; `lint`, `typecheck`, `test` pasan |
| **13 · Textos** | `src/lib/hypothesisText.ts`, `tests/hypothesisText.test.ts`; esquema `hypothesisFormSchema` y `DEFAULT_HYPOTHESIS` en `schemas.ts` con su prueba | Textos de R1 y R3 exactos; `lint`, `typecheck`, `test` pasan |
| **14 · UI** | `HypothesisForm.tsx`, `HypothesisCurve.tsx`, `HypothesisPanel.tsx`; sección en `/resultados`; fila IV en `src/app/page.tsx`; README (tabla de temas, estado) y `docs/decisiones.md` si surge algo ambiguo | Criterios de aceptación 1–8; `pnpm build` pasa; sin errores en consola |
