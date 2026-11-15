import { chiQ, fQ, tQ, zQ } from "./distributions";

export type IntervalKind =
  | "mean-t"
  | "mean-z"
  | "variance"
  | "sd"
  | "proportion"
  | "diff-means-welch"
  | "diff-means-pooled"
  | "variance-ratio"
  | "diff-proportions";

export type ConfidenceInterval = {
  kind: IntervalKind;
  confidence: number;
  estimate: number;
  lower: number;
  upper: number;
  margin?: number;
  standardError?: number;
  criticalValue: number | [number, number];
  df?: number | [number, number];
  warnings: string[];
};

/** Resumen mínimo de una muestra que necesitan los intervalos. */
export type Summary = {
  n: number;
  mean: number;
  variance: number;
  skewness: number;
};

export const NORMALITY_WARNING = "Este intervalo supone normalidad; los datos son asimétricos.";

const alpha = (confidence: number) => 1 - confidence;
const skewed = (g: number) => Number.isFinite(g) && Math.abs(g) > 1;

/** 1. Media, σ desconocida: x̄ ± t · s/√n */
export function meanT(s: Summary, confidence: number): ConfidenceInterval {
  const df = s.n - 1;
  const t = tQ(1 - alpha(confidence) / 2, df);
  const se = Math.sqrt(s.variance / s.n);
  const margin = t * se;
  const warnings: string[] = [];
  if (s.n < 30 && skewed(s.skewness)) {
    warnings.push(
      "Muestra pequeña (n < 30) con asimetría fuerte (|g₁| > 1): el IC de la media puede no ser confiable.",
    );
  }
  return {
    kind: "mean-t",
    confidence,
    estimate: s.mean,
    lower: s.mean - margin,
    upper: s.mean + margin,
    margin,
    standardError: se,
    criticalValue: t,
    df,
    warnings,
  };
}

/** 2. Media, aproximación normal: x̄ ± z · s/√n */
export function meanZ(s: Summary, confidence: number): ConfidenceInterval {
  const z = zQ(1 - alpha(confidence) / 2);
  const se = Math.sqrt(s.variance / s.n);
  const margin = z * se;
  return {
    kind: "mean-z",
    confidence,
    estimate: s.mean,
    lower: s.mean - margin,
    upper: s.mean + margin,
    margin,
    standardError: se,
    criticalValue: z,
    warnings: [],
  };
}

/** 3. Varianza: [(n−1)s²/χ²(1−α/2), (n−1)s²/χ²(α/2)] */
export function varianceCI(s: Summary, confidence: number): ConfidenceInterval {
  const a = alpha(confidence);
  const df = s.n - 1;
  const chiHi = chiQ(1 - a / 2, df);
  const chiLo = chiQ(a / 2, df);
  const warnings: string[] = [];
  if (skewed(s.skewness)) warnings.push(NORMALITY_WARNING);
  return {
    kind: "variance",
    confidence,
    estimate: s.variance,
    lower: (df * s.variance) / chiHi,
    upper: (df * s.variance) / chiLo,
    criticalValue: [chiLo, chiHi],
    df,
    warnings,
  };
}

/** 3b. Desviación estándar: raíz de los extremos del IC de la varianza. */
export function sdCI(s: Summary, confidence: number): ConfidenceInterval {
  const v = varianceCI(s, confidence);
  return {
    ...v,
    kind: "sd",
    estimate: Math.sqrt(s.variance),
    lower: Math.sqrt(v.lower),
    upper: Math.sqrt(v.upper),
  };
}

/** 4. Proporción: p̂ ± z · √(p̂(1−p̂)/n), recortada a [0, 1]. */
export function proportionCI(x: number, n: number, confidence: number): ConfidenceInterval {
  const p = n > 0 ? x / n : NaN;
  const z = zQ(1 - alpha(confidence) / 2);
  const se = Math.sqrt((p * (1 - p)) / n);
  const margin = z * se;
  const warnings: string[] = [];
  if (n * p < 5 || n * (1 - p) < 5) {
    warnings.push(
      "No se cumple n·p̂ ≥ 5 y n·(1−p̂) ≥ 5: la aproximación normal puede ser poco confiable.",
    );
  }
  return {
    kind: "proportion",
    confidence,
    estimate: p,
    lower: Math.max(0, p - margin),
    upper: Math.min(1, p + margin),
    margin,
    standardError: se,
    criticalValue: z,
    warnings,
  };
}

/** 5. Razón de varianzas σ₁²/σ₂². */
export function varianceRatioCI(a: Summary, b: Summary, confidence: number): ConfidenceInterval {
  const al = alpha(confidence);
  const df1 = a.n - 1;
  const df2 = b.n - 1;
  const ratio = a.variance / b.variance;
  const fHi = fQ(1 - al / 2, df1, df2);
  const fHi2 = fQ(1 - al / 2, df2, df1);
  const warnings: string[] = [];
  if (skewed(a.skewness) || skewed(b.skewness)) warnings.push(NORMALITY_WARNING);
  return {
    kind: "variance-ratio",
    confidence,
    estimate: ratio,
    lower: ratio / fHi,
    upper: ratio * fHi2,
    criticalValue: [fHi, fHi2],
    df: [df1, df2],
    warnings,
  };
}

/** 6a. Diferencia de medias, Welch (gl no entero, sin redondear). */
export function diffMeansWelch(a: Summary, b: Summary, confidence: number): ConfidenceInterval {
  const v1 = a.variance / a.n;
  const v2 = b.variance / b.n;
  const se = Math.sqrt(v1 + v2);
  const nu = (v1 + v2) ** 2 / (v1 ** 2 / (a.n - 1) + v2 ** 2 / (b.n - 1));
  const t = tQ(1 - alpha(confidence) / 2, nu);
  const diff = a.mean - b.mean;
  const margin = t * se;
  return {
    kind: "diff-means-welch",
    confidence,
    estimate: diff,
    lower: diff - margin,
    upper: diff + margin,
    margin,
    standardError: se,
    criticalValue: t,
    df: nu,
    warnings: [],
  };
}

/** Varianza agrupada sp². */
export function pooledVariance(a: Summary, b: Summary): number {
  return ((a.n - 1) * a.variance + (b.n - 1) * b.variance) / (a.n + b.n - 2);
}

/** 6b. Diferencia de medias, agrupado (varianzas iguales). */
export function diffMeansPooled(a: Summary, b: Summary, confidence: number): ConfidenceInterval {
  const df = a.n + b.n - 2;
  const sp2 = pooledVariance(a, b);
  const se = Math.sqrt(sp2) * Math.sqrt(1 / a.n + 1 / b.n);
  const t = tQ(1 - alpha(confidence) / 2, df);
  const diff = a.mean - b.mean;
  const margin = t * se;
  return {
    kind: "diff-means-pooled",
    confidence,
    estimate: diff,
    lower: diff - margin,
    upper: diff + margin,
    margin,
    standardError: se,
    criticalValue: t,
    df,
    warnings: [],
  };
}

/** 7. Diferencia de proporciones p₁ − p₂. */
export function diffProportionsCI(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  confidence: number,
): ConfidenceInterval {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const z = zQ(1 - alpha(confidence) / 2);
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const margin = z * se;
  const warnings: string[] = [];
  const ok = (n: number, p: number) => n * p >= 5 && n * (1 - p) >= 5;
  if (!ok(n1, p1) || !ok(n2, p2)) {
    warnings.push(
      "No se cumple n·p̂ ≥ 5 y n·(1−p̂) ≥ 5 en alguno de los grupos: la aproximación normal puede ser poco confiable.",
    );
  }
  const diff = p1 - p2;
  return {
    kind: "diff-proportions",
    confidence,
    estimate: diff,
    lower: diff - margin,
    upper: diff + margin,
    margin,
    standardError: se,
    criticalValue: z,
    warnings,
  };
}

export type MeansComparison = {
  ratio: ConfidenceInterval;
  /** true si el IC de la razón contiene 1 (se usa el IC agrupado). */
  equalVariances: boolean;
  welch: ConfidenceInterval;
  pooled: ConfidenceInterval;
  chosen: ConfidenceInterval;
};

/** Aplica la regla: razón de varianzas → elección Welch / agrupado. */
export function compareMeans(a: Summary, b: Summary, confidence: number): MeansComparison {
  const ratio = varianceRatioCI(a, b, confidence);
  const equalVariances = ratio.lower <= 1 && ratio.upper >= 1;
  const welch = diffMeansWelch(a, b, confidence);
  const pooled = diffMeansPooled(a, b, confidence);
  return { ratio, equalVariances, welch, pooled, chosen: equalVariances ? pooled : welch };
}
