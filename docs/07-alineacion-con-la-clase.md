# 07 · Alineación de la app con lo visto en clase (plan de cambios del código)

Plan para el agente implementador. **Va antes** de la prueba de hipótesis ([06-pruebas-de-hipotesis.md](06-pruebas-de-hipotesis.md)). La especificación de cada fórmula, texto y valor de prueba está en [02-especificacion-estadistica.md](02-especificacion-estadistica.md); aquí solo se dice **qué tocar y en qué orden**.

Principio rector: **«No añadir más de lo que nos han dado.»** Solo procedimientos, notación y redacción de los apuntes de clase. Las Unidades I y II se conservan.

## 0. Resumen

| Acción | Qué |
|--------|-----|
| **Eliminar** | IC de varianza y desviación (χ²), razón de varianzas (F), Welch, elección Welch/agrupado por F, advertencias de normalidad/asimetría, desempate por varianza |
| **Cambiar** | IC de la media: un solo intervalo elegido por la regla del cuaderno (Z con σ / Z con s si n ≥ 30 / t si n < 30). Diferencia de medias: Z si n₁, n₂ ≥ 30; t con Sp si hay muestras pequeñas. Textos en pasos (4 para la media, 6 para la proporción) y notación de clase. Proporción: si no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5, «no aplica». Recomendación: media → SLA → sin evidencia |
| **Conservar** | TLC y simulador, tamaño de muestra, descriptivos (incluida g₁ como dato), medición, experimento, datos, CSV/JSON, persistencia, diferencia de proporciones |
| **Agregar** | `summaryFromSums`, `meanDistribution`, `diffMeansDistribution`, `interpretMeanVsSla`, campos `sum`/`sumSq`/`ss` en `Descriptive`, componente `MathText`, prueba de integración con el respaldo |

CSV y exportaciones: **no cambian**. `src/lib/csv.ts`, `CsvImportExport.tsx` y el formato de `public/data/respaldo.csv` solo contienen mediciones, no resultados estadísticos.

## 1. Eliminar

### `src/lib/stats/distributions.ts`
- `chiQ(p, gl)` y `fQ(p, gl1, gl2)`.

### `src/types/jstat.d.ts`
- Las propiedades `chisquare` y `centralF` de `jStat`. (En el hito 12, docs/06, se agregan `cdf` y `pdf` a `JStatDist`.)

### `src/lib/stats/intervals.ts`
- Funciones: `varianceCI`, `sdCI`, `varianceRatioCI`, `diffMeansWelch`, `compareMeans`, `meanT`, `meanZ` (las dos últimas se sustituyen por `meanCI`).
- Tipos y constantes: `MeansComparison`, `NORMALITY_WARNING`, el helper `skewed`, y los valores `"variance" | "sd" | "variance-ratio" | "diff-means-welch" | "mean-t"/"mean-z"` antiguos de `IntervalKind` (el nuevo `IntervalKind` está en docs/02).
- En `ConfidenceInterval`: las variantes tupla `criticalValue: [number, number]` y `df: [number, number]` (ya no hay intervalos asimétricos).
- En `Summary`: el campo `skewness` (ya no se usa).
- La advertencia «Muestra pequeña (n < 30) con asimetría fuerte…».

### `src/lib/stats/interpret.ts`
- `interpretSd`, `interpretVariance`, `interpretVarianceRatio`.
- En `RecommendationInput`: el campo `varianceRatio`. En `RecommendationResult.criterion`: el valor `"varianza"`. La rama de desempate por varianza dentro de `recommend`.

### `src/lib/ciText.ts`
- `explainMeanT`, `explainMeanZ`, `explainVariance`, `explainSd`, `explainRatio`, `explainWelch`, `explainPooled` (lo agrupado pasa a `explainDiffMeans`). El campo `substitution` de `Explanation` se sustituye por `steps`.

### `src/lib/results.ts`
- En `ApiResults`: `meanT`, `meanZ`, `variance`, `sd` (se sustituyen por `mean`).
- En `Comparison`: `means: MeansComparison` (se sustituye por `diffMeans: ConfidenceInterval`).
- Importaciones de `compareMeans`, `meanT`, `meanZ`, `sdCI`, `varianceCI`, `MeansComparison`.

### `src/components/results/ApiSection.tsx`
- Tarjetas «Media μ (t de Student, σ desconocida)» y «Media μ (aproximación normal z)» (se unen en una), «Desviación estándar σ (χ²)» y «Varianza σ² (χ²)», y el texto «Para n grande este intervalo coincide prácticamente con el de la t.».

### `src/components/results/ComparisonPanel.tsx`
- Tarjeta «1. Razón de varianzas σ²(A) / σ²(B)» con su `NumberLine` de referencia 1 y el párrafo «El intervalo contiene 1… / no contiene 1… se usa el IC de Welch (gl no entero)».
- El `Badge` «Agrupado (elegido)» / «Welch (elegido)» y el `<details>` «Dato secundario: IC de Welch / agrupado».

### `src/components/results/Recommendation.tsx`
- El texto «…y luego menor varianza.» de `CardDescription`.

### `src/app/page.tsx`
- En `units`, la descripción «Media (t y z), varianza y desviación (χ²), proporción, razón de varianzas (F), diferencia de medias (Welch y agrupado), diferencia de proporciones».
- En la pregunta de investigación, «qué tan estable es» (la estabilidad se infería con χ² y F).

### Pruebas (`tests/`)
- `tests/stats/stats.test.ts`: casos `chiQ`, `fQ`; «varianza», «desviación», «razón de varianzas y elección agrupado», la parte Welch de «diferencia de medias agrupado y Welch», «Welch con varianzas distintas (gl no entero)», «advertencias de normalidad»; las importaciones de `chiQ`, `fQ`, `compareMeans`, `diffMeansWelch`, `sdCI`, `varianceCI`, `varianceRatioCI`, `meanT`.
- `tests/results.test.ts`: las expectativas de `variance`, `sd`, `means.ratio`, `means.equalVariances`, `means.welch`, `means.chosen`.
- `tests/interpret.test.ts`: `interpretSd`, `interpretVariance`, `interpretVarianceRatio`, el caso «desempata por varianza» y el campo `varianceRatio` en todas las llamadas a `recommend`.

## 2. Cambiar

### 2.1 `src/lib/stats/intervals.ts` (reescribir según docs/02)
Exportar exactamente:

```ts
export const LARGE_SAMPLE_N = 30;
export type Distribution = "z" | "t";
export type IntervalKind = "mean-z-sigma" | "mean-z" | "mean-t" | "proportion"
  | "diff-means-z-sigma" | "diff-means-z" | "diff-means-pooled" | "diff-proportions";
export type ConfidenceInterval = { kind; distribution; confidence; estimate; lower; upper;
  margin; standardError; criticalValue: number; df?: number; conditionMet?: boolean; warnings: string[] };
export type Summary = { n: number; mean: number; variance: number };

export function meanDistribution(n: number, sigmaKnown: boolean): Distribution;
export function diffMeansDistribution(n1: number, n2: number, sigmasKnown: boolean): Distribution;
export function summaryFromSums(n: number, sumX: number, sumX2: number): Summary;
export function meanCI(s: Summary, confidence: number, sigma?: number): ConfidenceInterval;
export function proportionCI(x: number, n: number, confidence: number): ConfidenceInterval;
export function pooledVariance(a: Summary, b: Summary): number;          // se conserva
export function diffMeansCI(a: Summary, b: Summary, confidence: number, sigmas?: [number, number]): ConfidenceInterval;
export function diffProportionsCI(x1: number, n1: number, x2: number, n2: number, confidence: number): ConfidenceInterval;
```

- Regla: `meanDistribution` = `sigmaKnown || n >= 30 ? "z" : "t"`; `diffMeansDistribution` = `sigmasKnown || (n1 >= 30 && n2 >= 30) ? "z" : "t"`.
- `proportionCI`: `conditionMet` y el aviso exacto «No se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5: no se puede usar la distribución normal, así que este intervalo no aplica.» Conserva el recorte a [0, 1].
- `diffProportionsCI`: `conditionMet` (ambos grupos) y aviso «En {grupo} no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5.» → como la función no conoce nombres, el aviso genérico es «En alguno de los grupos no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5.» y `ComparisonPanel` lo concreta con el nombre de la API.
- Recomendado (lo usa también docs/06): helper interno `diffMeansStandardError(a, b, sigmas?)`.

### 2.2 `src/lib/stats/descriptive.ts`
- Agregar a `Descriptive` y a `describe`: `sum` (Σx), `sumSq` (Σx²), `ss` (= `sumSq − sum²/n`). `variance` sigue con dos pasadas. Con `n = 0`: `sum = 0`, `sumSq = 0`, `ss = NaN`.
- `skewness` y `cv` se conservan como descriptivos.

### 2.3 `src/lib/stats/interpret.ts`
- Reescribir `interpretMean`, `interpretSla`, `interpretDiffMeans`, `interpretDiffProportions` con las plantillas de docs/02 («promedio real», «contiene al cero: … no hay diferencias», lectura complementaria con q̂).
- Agregar `interpretMeanVsSla(ci: ConfidenceInterval, api: string, slaMs: number): string`.
- `interpretFailures` se conserva.
- `recommend` (regla nueva, decisión 35):

```ts
export type RecommendationInput = { nameA: string; nameB: string; diffMeans: ConfidenceInterval; diffSla: ConfidenceInterval };
export type RecommendationResult = { winner: "A" | "B" | null; criterion: "media" | "sla" | null; text: string };
```

  1. `diffMeans` sin 0 → gana la más rápida (`"media"`). 2. Si no, `diffSla` sin 0 → gana la que incumple menos (`"sla"`). 3. Si no, `null` con el texto actual «No hay evidencia suficiente para preferir una API; aumentar n o considerar otros criterios.». Textos exactos en docs/02.

### 2.4 `src/lib/ciText.ts` (reescribir)

```ts
export type ExplanationStep = { title: string; text: string };   // title: «Paso 1 · Media muestral»
export type Explanation = { formula: string; steps: ExplanationStep[] };

export function explainMean(ci: ConfidenceInterval, d: Descriptive): Explanation;          // 4 pasos
export function explainProportion(ci: ConfidenceInterval, x: number, n: number): Explanation; // 6 pasos
export function explainDiffMeans(ci: ConfidenceInterval, a: Descriptive, b: Descriptive): Explanation;
export function explainDiffProportions(ci: ConfidenceInterval, x1: number, n1: number, x2: number, n2: number): Explanation;
export function classTableZ(confidence: number): string | null;   // "1.645" | "1.96" | "2.326" | "2.576" o null
```

- Textos y formatos: docs/02, secciones 1–4. Notación con `_{}` (`Z_{α/2}`, `t_{α/2}`), intervalo final en la forma de clase «(θ̂ᵢ ≤ μ ≤ θ̂ₛ) = 95 %» con los números sustituidos.
- El paso de interpretación no se genera aquí: `ApiSection`/`ComparisonPanel` lo agregan con `interpret.ts` (así `ciText` no duplica plantillas). Por eso `explainMean` devuelve 3 pasos y la tarjeta pinta el cuarto («Paso 4 · Interpretación») con `interpretation`; igual con el paso 6 de la proporción (`explainProportion` devuelve 5) y con el último paso de las diferencias.
- `explainProportion` con `conditionMet === false`: devuelve los pasos 1 y 2 (el 2 termina en «no se cumple: el intervalo no aplica») y nada más.

### 2.5 `src/components/results/MathText.tsx` (nuevo)
- `MathText({ text }: { text: string })`: convierte cada `_{…}` en `<sub>…</sub>` y deja el resto igual. Sin dependencias nuevas.

### 2.6 `src/components/results/CiCard.tsx`
- Props: igual, pero `explanation?: Explanation` con `steps`. Renderiza: «Fórmula» (con `MathText`), lista ordenada de pasos (título en negrita + texto con `MathText`), el paso final «Interpretación» si hay `interpretation` (título «Paso {k} · Interpretación»), el resultado «({lower} ≤ θ ≤ {upper}) = {N.C.} %», avisos y `children`.
- Prop nueva opcional `notApplicable?: boolean`: si es `true`, no muestra el resultado ni la interpretación; muestra el aviso y un `<details>` «Cálculo de referencia (no aplica)» con `[lower ; upper]`.

### 2.7 `src/lib/results.ts`

```ts
export type ApiResults = { id; name; latencies; descriptive: Descriptive; enough: boolean;
  mean: ConfidenceInterval | null; sla: Counted; failures: Counted };
export type Comparison = { diffMeans: ConfidenceInterval; diffSla: ConfidenceInterval; recommendation: RecommendationResult };
```

- `mean = enough ? meanCI(d, confidence) : null` (sin `sigma`: en la app σ es desconocida).
- `comparison.diffMeans = diffMeansCI(a.descriptive, b.descriptive, confidence)`; `recommend({ nameA, nameB, diffMeans, diffSla })`.
- `src/hooks/useResults.ts` no cambia (re-exporta los tipos).

### 2.8 `src/components/results/ApiSection.tsx`
Tarjetas, en este orden:
1. «IC para la media μ ({Z con s, n ≥ 30 | t de Student, n < 30})» → `api.mean`, `explainMean`, interpretación = `interpretMean` + espacio + `interpretMeanVsSla(…, slaMs)`. Requiere pasar `slaMs` (ya llega por props).
2. «IC para la proporción que incumple el SLA (> {slaMs} ms)» → `explainProportion`, `interpretSla`, `notApplicable={ci.conditionMet === false}`.
3. «IC para la tasa de fallos» → igual con `interpretFailures`.

### 2.9 `src/components/results/ComparisonPanel.tsx`
1. «1. IC para la diferencia de medias μ(A) − μ(B)» → `comparison.diffMeans`, `explainDiffMeans`, `interpretDiffMeans`, `Badge` informativo: «Z (n_A, n_B ≥ 30)» o «t con Sp (muestras pequeñas)»; `NumberLine` con referencia 0.
2. «2. IC para la diferencia de proporciones que incumplen el SLA p(A) − p(B)» → `explainDiffProportions`, `interpretDiffProportions`, `NumberLine` con 0; si `conditionMet === false`, aviso con el nombre de la API afectada (la de `n·p̂ < 5` o `n·q̂ < 5`).

### 2.10 `src/components/results/NumberLine.tsx`
- Solo el comentario de `reference`: «0 para diferencias» (quitar «1 para razones»). La prop se mantiene.

### 2.11 `src/components/results/CiForestChart.tsx`
- Usar `r.mean` en lugar de `r.meanT`.
- En `src/app/resultados/page.tsx`, la descripción de la tarjeta pasa a «Las barras de error muestran el IC de la media (Z si n ≥ 30, t si n < 30); la línea roja es el SLA.»

### 2.12 `src/components/results/Recommendation.tsx`
- `CardDescription`: «Criterio: diferencia de medias (si su IC no contiene al cero, gana la más rápida); si lo contiene, diferencia de proporciones que incumplen el SLA; si ambos contienen al cero, no hay evidencia suficiente.»

### 2.13 `src/app/page.tsx`
- Fila III de `units`: «IC para la media (Z con σ conocida; Z con s si n ≥ 30; t si n < 30), para la proporción, para la diferencia de medias (Z o t con Sp) y para la diferencia de proporciones».
- Pregunta de investigación: «desde nuestra red, ¿cuál es el tiempo medio de respuesta real de cada API, qué proporción de peticiones incumple el SLA y existe una diferencia real entre A y B?»
- (La fila IV se agrega en el hito 14 de docs/06.)

### 2.14 Sin cambios (verificar que compilan)
`src/components/results/DescriptiveTable.tsx` (sigue mostrando s², s, g₁, CV y error estándar; opcional: filas «Σx» y «Σx²»), `Histogram.tsx`, `ConfidenceSelector.tsx`, `src/components/sampling/*`, `src/app/muestreo/page.tsx`, `src/lib/stats/sampleSize.ts`, `src/lib/stats/sampling.ts`, `src/lib/csv.ts`, `src/lib/measure.server.ts`, `src/app/api/measure/route.ts`, `src/context/ExperimentContext.tsx`, `src/hooks/useRunExperiment.ts`, `src/components/experiment/*`, `src/components/data/*`.

## 3. Pruebas

| Archivo | Acción |
|---------|--------|
| `tests/stats/stats.test.ts` | Reescribir: cuantiles `zQ`/`tQ` de docs/02; descriptivos de A con `sum`, `sumSq`, `ss`; `meanCI` (A con t; C1 σ conocida; C2 y C3 con `summaryFromSums`, incluidos x̄, SS, s², s, crit, SE, E, IC); `meanDistribution` y `diffMeansDistribution` en los bordes n = 29/30; `proportionCI` C4–C6, `proportionCI(20, 100)`, y `conditionMet === false` con `proportionCI(2, 100, 0.95)`; `diffMeansCI` C7–C9 y A−B (t con Sp, gl 8); `diffProportionsCI` C10–C11 y 0.2 − 0.1; tamaño de muestra y remuestreo sin cambios; `recommend` con la regla nueva |
| `tests/results.test.ts` | Ajustar: `r.a.mean` (kind `"mean-t"`, n = 5), sin `variance`/`sd`; `comparison.diffMeans` kind `"diff-means-pooled"`, [−14.612008 ; −5.387992]; recomendación A por `"media"` |
| `tests/interpret.test.ts` | Ajustar textos nuevos; agregar `interpretMeanVsSla` (C3 con SLA 220 → «cae dentro del intervalo»; respaldo A con SLA 300 → «por debajo»); `recommend` sin `varianceRatio`: media, SLA, sin evidencia |
| `tests/ciText.test.ts` (nuevo) | `explainMean` con `describe` del respaldo A principal (contiene «x̄ = Σx/n = 9051.20/100 = 90.51», «Como σ es desconocida y n ≥ 30, se usa la distribución normal Z con s en lugar de σ», «Z_{α/2} = 1.9600 (tabla: 1.96)», «Error estándar = s/√n = 43.98/√100 = 4.3979», «E = 1.9600 × 4.3979 = 8.62», «(81.89 ≤ μ ≤ 99.13) = 95 %») y con los datos A = [10, …, 18] («SS = 1020.00 − 70.00²/5 = 40.00», «T de Student», «gl = n − 1 = 4»); `explainProportion` con 5/100 (5 pasos generados + interpretación en la tarjeta) y con 2/100 (se corta en el paso 2 con «no aplica»); `explainDiffMeans` con el respaldo («n_A, n_B ≥ 30», «√(1934.19/100 + 5360.09/100) = 8.5407») |
| `tests/respaldo.test.ts` (nuevo) | Leer `public/data/respaldo.csv` con `fs.readFileSync` + `parseCsv`; `computeResults(…, "principal", c, 300, "API A", "API B")` para c = 0.90/0.95/0.99 y comparar con las tablas del respaldo de docs/02 (medias, s, IC de la media, SLA, diferencia de medias, diferencia de proporciones, recomendación A por media); fase piloto al 95 % |
| `tests/csv.test.ts`, `tests/measure.test.ts`, `tests/measurements.test.ts`, `tests/api-measure.test.ts` | Sin cambios |

## 4. Documentación al terminar
- README: tabla de temas (ya actualizada en docs; verificar que coincide con la UI) y el número de pruebas en «Estado del proyecto».
- `docs/decisiones.md`: solo si aparece algo ambiguo no cubierto por las decisiones 30–42.

## 5. Hitos

Cada hito termina con `pnpm lint && pnpm typecheck && pnpm test` en verde (y `pnpm build` en el último). No pasar al siguiente sin cumplirlo.

| Hito | Trabajo | Definición de terminado |
|------|---------|-------------------------|
| **8 · Estadística pura** | §1 y §2.1–2.3 en `distributions.ts`, `jstat.d.ts`, `intervals.ts`, `descriptive.ts`, `interpret.ts`; reescribir `tests/stats/stats.test.ts` e `tests/interpret.test.ts` | Todos los valores C1–C11 y sintéticos de docs/02 en verde con tolerancia 1e-3; `grep -rn "chiQ\|fQ\|Welch\|varianceRatio\|sdCI\|varianceCI" src tests` no encuentra nada; lint, typecheck y test pasan (la UI puede no compilar todavía: si `typecheck` falla solo por componentes, hacer el hito 9 en el mismo commit) |
| **9 · Resultados y textos** | §2.4, §2.7 (`ciText.ts`, `results.ts`); `tests/results.test.ts`, `tests/ciText.test.ts`, `tests/respaldo.test.ts` | Cifras del respaldo de docs/02 en verde; lint, typecheck y test pasan |
| **10 · UI** | §2.5, §2.6, §2.8–2.13 (`MathText`, `CiCard`, `ApiSection`, `ComparisonPanel`, `NumberLine`, `CiForestChart`, `Recommendation`, `/resultados`, `/`) | Con el respaldo cargado: por API una sola tarjeta de media con 4 pasos y «Z con s, n ≥ 30»; SLA de A muestra «no se cumple… no aplica» sin interpretación; SLA de B con 6 pasos y [0.0073 ; 0.0927]; comparación con 2 tarjetas (medias [−160.44 ; −126.96] al 95 %, proporciones [−0.0808 ; 0.0208] con la nota de A); recomendación «Se recomienda API A…»; ningún texto con χ², F, Welch, «razón de varianzas» ni «más estable»; lint, typecheck, test y build pasan |
| **11 · Cierre** | README («Estado del proyecto», número de pruebas), revisión de consola en `/`, `/resultados` y `/muestreo` | Definición de terminado de AGENTS.md; luego seguir con los hitos 12–14 de docs/06 |

## 6. Riesgos y notas para el implementador
- **Cifras del respaldo con Z, no con t:** con n = 100 ya no aparece t (gl = 99). Si alguna prueba antigua o captura usa 1.9842, está desactualizada.
- **Proporción «no aplica»:** el respaldo hace que la tarjeta SLA de A y las de fallos (0/100) queden en «no aplica». Es el comportamiento pedido (los apuntes no dan otro método); no agregar Wilson, Clopper-Pearson ni corrección de continuidad.
- **t con Sp en la app:** solo aparece si una API tiene menos de 30 latencias válidas (p. ej. un CSV recortado o un experimento cancelado). Se supone σ iguales, como en los apuntes; no agregar Welch ni F para «verificarlo».
- **`Summary` sin `skewness`:** `Descriptive` sigue teniendo `skewness`, así que los llamadores no cambian; solo deja de pedirse en las funciones de intervalo.
- **Subíndices:** no usar librerías de LaTeX/KaTeX; `MathText` basta.
- **Números en los textos:** fijar en las pruebas el redondeo que muestra la UI (2 decimales en ms: x̄, s, s², SS, Σx, Σx², E y límites; 4 decimales en error estándar, valores críticos, variantes y proporciones) para que los textos coincidan con docs/02 y con la presentación.
