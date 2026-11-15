# 02 · Especificación estadística

Todas las funciones viven en `src/lib/stats/` como **funciones puras en TypeScript** (sin React) y se prueban con Vitest usando los valores de la sección final.

## Convenciones

- `α = 1 − confianza`. Confianzas permitidas: **0.90, 0.95, 0.99**.
- Se usan **funciones cuantil** (inversa de la acumulada) para evitar ambigüedades de notación:
  - `zQ(p)` = cuantil de la normal estándar. Ej.: `zQ(0.975) = 1.95996`
  - `tQ(p, gl)` = cuantil de la t de Student (admite `gl` no entero, necesario para Welch)
  - `chiQ(p, gl)` = cuantil de la χ²
  - `fQ(p, gl1, gl2)` = cuantil de la F
- Implementar estas funciones en `src/lib/stats/distributions.ts` envolviendo la librería **`jstat`** (`jStat.normal.inv`, `jStat.studentt.inv`, `jStat.chisquare.inv`, `jStat.centralF.inv`). Si no trae tipos, declarar un módulo mínimo en `src/types/jstat.d.ts`.
- **Datos que entran a cada cálculo:**
  - Latencia (`X`): solo mediciones con `ok = true` y `warmup = false`.
  - Proporción de incumplimiento del SLA (`S`): mediciones `ok = true` y `warmup = false`.
  - Proporción de fallos (`F`): todas las mediciones con `warmup = false`.
- Mostrar valores con 2 decimales (ms) y 4 decimales (proporciones y razones).

Cada función de intervalo devuelve un objeto común:

```ts
type ConfidenceInterval = {
  kind: string;          // 'mean-t' | 'mean-z' | 'variance' | 'sd' | 'proportion' | 'diff-means-welch' | 'diff-means-pooled' | 'variance-ratio' | 'diff-proportions'
  confidence: number;    // 0.90 | 0.95 | 0.99
  estimate: number;      // estimador puntual
  lower: number;
  upper: number;
  margin?: number;       // margen de error E (cuando el IC es simétrico)
  standardError?: number;
  criticalValue: number | [number, number];
  df?: number | [number, number];
  warnings: string[];    // condiciones no cumplidas (ver cada sección)
};
```

---

## Unidad I · Distribuciones muestrales

### Descriptivos (`descriptive.ts`)
`n`, media `x̄`, varianza muestral `s² = Σ(xᵢ − x̄)² / (n − 1)`, `s`, mínimo, máximo, mediana, percentil 95 (interpolación lineal), coeficiente de asimetría `g₁ = [n / ((n−1)(n−2))] · Σ((xᵢ − x̄)/s)³` y coeficiente de variación `s/x̄`.

### Simulación de la distribución muestral (`sampling.ts`)
Se toman los datos medidos como aproximación de la población (remuestreo con reemplazo):

1. Parámetros: tamaño `m` (slider de 2 a 100) y `k` réplicas (por defecto 1000). Usar un generador con semilla (ej. mulberry32) para que la simulación sea reproducible.
2. Por cada réplica se toman `m` latencias al azar con reemplazo y se guarda su media.
3. Mostrar el histograma de las **latencias originales** (sesgadas) junto al histograma de las **medias muestrales**, con la curva normal `N(x̄, s/√m)` superpuesta.
4. Mostrar la media de las medias (≈ `x̄`) y la desviación de las medias (≈ `s/√m`, el error estándar).
5. Repetir lo mismo con la proporción `p̂` de incumplimiento del SLA (normal `N(p, √(p(1−p)/m))`).

Mensaje didáctico: *"Aunque las latencias no son normales, la distribución de la media muestral se aproxima a la normal cuando m crece (TLC)."*

---

## Unidad II · Estimación y muestreo

### Estimación puntual
| Parámetro | Estimador | Error estándar |
|-----------|-----------|----------------|
| μ | `x̄` | `s/√n` |
| σ² | `s²` (insesgado, divide por n−1) | — |
| p | `p̂ = x/n` | `√(p̂(1−p̂)/n)` |

### Tamaño de muestra (`sampleSize.ts`). Redondear siempre hacia arriba.
- **Media:** `n = (zQ(1−α/2) · σ / E)²`. Usar como σ la `s` del piloto.
- **Proporción:** `n = zQ(1−α/2)² · p(1−p) / E²`. Usar `p̂` del piloto o `p = 0.5` (caso más conservador).
- **Población finita (opcional):** `n' = n / (1 + (n−1)/N)`.

En la app: después del piloto, botón **"Usar este n"** que precarga el experimento principal.

---

## Unidad III · Intervalos de confianza (`intervals.ts`)

### 1. Media, σ desconocida (principal)
`x̄ ± tQ(1−α/2, n−1) · s/√n`
- Advertencia si `n < 30` y `|g₁| > 1` (sesgo fuerte con muestra pequeña).

### 2. Media, aproximación normal (para comparar con el anterior)
`x̄ ± zQ(1−α/2) · s/√n`
- Mostrar al lado del IC con t e indicar que para n grande coinciden.

### 3. Varianza y desviación estándar
`[ (n−1)s² / chiQ(1−α/2, n−1) ,  (n−1)s² / chiQ(α/2, n−1) ]`
- Para la desviación estándar: raíz cuadrada de ambos extremos.
- Advertencia **siempre** si `|g₁| > 1`: "Este intervalo supone normalidad; los datos son asimétricos."

### 4. Proporción (incumplimiento del SLA y tasa de fallos)
`p̂ ± zQ(1−α/2) · √(p̂(1−p̂)/n)`
- Condición: `n·p̂ ≥ 5` y `n·(1−p̂) ≥ 5`. Si no se cumple, agregar advertencia.
- Recortar los extremos a [0, 1].

### 5. Razón de varianzas σ₁²/σ₂²
`[ (s₁²/s₂²) / fQ(1−α/2, n₁−1, n₂−1) ,  (s₁²/s₂²) · fQ(1−α/2, n₂−1, n₁−1) ]`
- Si el intervalo **contiene 1**, las varianzas pueden considerarse iguales y se usa el IC agrupado (6b). Si no, se usa Welch (6a).
- Misma advertencia de normalidad que en el punto 3.

### 6. Diferencia de medias μ₁ − μ₂ (A − B)
**6a. Welch (varianzas distintas). Es el que se muestra por defecto.**
`(x̄₁ − x̄₂) ± tQ(1−α/2, ν) · √(s₁²/n₁ + s₂²/n₂)`
con `ν = (s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁−1) + (s₂²/n₂)²/(n₂−1) ]`. ν no se redondea.

**6b. Agrupado (varianzas iguales)**
`sₚ² = [(n₁−1)s₁² + (n₂−1)s₂²] / (n₁+n₂−2)`
`(x̄₁ − x̄₂) ± tQ(1−α/2, n₁+n₂−2) · sₚ · √(1/n₁ + 1/n₂)`

La app muestra cuál de los dos se eligió según el punto 5, y el otro se ve como dato secundario.

### 7. Diferencia de proporciones p₁ − p₂
`(p̂₁ − p̂₂) ± zQ(1−α/2) · √(p̂₁(1−p̂₁)/n₁ + p̂₂(1−p̂₂)/n₂)`
- Aplicar la misma condición de `n·p̂ ≥ 5` a cada grupo.

---

## Interpretación automática (`interpret.ts`)

Plantillas en español. Los valores entre llaves se reemplazan con los resultados:

- **Media:** "Con {conf}% de confianza, el tiempo medio de respuesta de {api} está entre {lower} ms y {upper} ms."
- **Desviación:** "Con {conf}% de confianza, la desviación estándar del tiempo de respuesta de {api} está entre {lower} ms y {upper} ms."
- **Proporción SLA:** "Con {conf}% de confianza, entre el {lower}% y el {upper}% de las peticiones a {api} superan {sla} ms."
- **Diferencia de medias:**
  - Si el IC está totalmente **por debajo de 0**: "{A} es más rápida que {B}: en promedio responde entre {|upper|} y {|lower|} ms antes."
  - Si está totalmente **por encima de 0**: el mensaje simétrico, con B como la más rápida.
  - Si **contiene 0**: "Con {conf}% de confianza no hay evidencia de diferencia en el tiempo medio."
- **Razón de varianzas:** si contiene 1, "estabilidad similar"; si no, indicar cuál API es más estable (la de menor varianza).
- **Diferencia de proporciones:** misma lógica que la diferencia de medias, respecto a 0.
- **Recomendación final:** gana la API con mejor media (IC de la diferencia sin 0). Si hay empate, desempata por menor proporción de incumplimiento del SLA y luego por menor varianza. Si no hay ninguna diferencia clara: "No hay evidencia suficiente para preferir una API; aumentar n o considerar otros criterios."

---

## Valores de prueba (verificados con SciPy)

Usar tolerancia `1e-3` en las pruebas unitarias.

**Cuantiles**
| Llamada | Valor |
|---------|-------|
| `zQ(0.975)` | 1.959964 |
| `zQ(0.95)` | 1.644854 |
| `zQ(0.995)` | 2.575829 |
| `tQ(0.975, 4)` | 2.776445 |
| `tQ(0.975, 8)` | 2.306004 |
| `tQ(0.975, 29)` | 2.045230 |
| `tQ(0.975, 99)` | 1.984217 |
| `chiQ(0.025, 4)` / `chiQ(0.975, 4)` | 0.484419 / 11.143287 |
| `chiQ(0.025, 29)` / `chiQ(0.975, 29)` | 16.047072 / 45.722286 |
| `fQ(0.975, 4, 4)` | 9.604530 |

**Casos (confianza 95%)**. Datos: `A = [10, 12, 14, 16, 18]`, `B = [20, 22, 24, 26, 28]`.
| Prueba | Resultado esperado |
|--------|--------------------|
| Descriptivos de A | x̄ = 14, s² = 10, s = 3.162278 |
| IC media (t) de A | [10.073514, 17.926486] |
| IC varianza de A | [3.589605, 82.573220] |
| IC desviación de A | [1.894625, 9.086981] |
| IC razón de varianzas A/B | [0.104118, 9.604530] → contiene 1 → agrupado |
| IC diferencia de medias A−B (agrupado y Welch, ν = 8) | [−14.612008, −5.387992] |
| IC proporción p̂ = 0.2, n = 100 | [0.121601, 0.278399] |
| IC diferencia de proporciones 0.2 − 0.1 (n₁ = n₂ = 100) | [0.002002, 0.197998] |
| Tamaño de muestra, media: σ = 50, E = 10 | 96.04 → **97** |
| Tamaño de muestra, proporción: p = 0.5, E = 0.05 | 384.15 → **385** |

**Welch con varianzas distintas** (gl no entero):
`X = [100, 120, 110, 130, 90, 105]`, `Y = [150, 170, 140, 200, 160, 180, 155]` → diferencia = −55.833333, ν = 10.680473, IC 95% = [−77.063297, −34.603370].
