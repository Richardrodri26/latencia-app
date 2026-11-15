import { tQ, zQ } from "./distributions";

/** n ≥ 30 → «muestra grande» (regla del cuaderno). */
export const LARGE_SAMPLE_N = 30;

export type Distribution = "z" | "t";

export type IntervalKind =
  | "mean-z-sigma" // media, σ conocida → Z con σ
  | "mean-z" // media, σ desconocida y n ≥ 30 → Z con s
  | "mean-t" // media, σ desconocida y n < 30 → t (gl = n − 1)
  | "proportion"
  | "diff-means-z-sigma" // dos medias, σ₁ y σ₂ conocidas → Z
  | "diff-means-z" // dos medias, σ desconocidas, n₁ ≥ 30 y n₂ ≥ 30 → Z con s₁², s₂²
  | "diff-means-pooled" // dos medias, σ desconocidas e iguales, muestras pequeñas → t con Sp
  | "diff-proportions";

export type ConfidenceInterval = {
  kind: IntervalKind;
  distribution: Distribution;
  confidence: number;
  /** Estimador puntual (x̄, p̂, x̄₁ − x̄₂ o p̂₁ − p̂₂). */
  estimate: number;
  /** θ̂ᵢ */
  lower: number;
  /** θ̂ₛ */
  upper: number;
  /** Margen de error E. */
  margin: number;
  standardError: number;
  /** Z_{α/2} o t_{α/2} (cuantil exacto). */
  criticalValue: number;
  /** Grados de libertad, solo con t. */
  df?: number;
  /** Solo proporciones: n·p̂ ≥ 5 y n·q̂ ≥ 5 (en diferencias, en ambos grupos). */
  conditionMet?: boolean;
  warnings: string[];
};

/** Lo mínimo que necesitan los intervalos de medias. */
export type Summary = { n: number; mean: number; variance: number };

export const PROPORTION_CONDITION_WARNING =
  "No se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5: no se puede usar la distribución normal, así que este intervalo no aplica.";
export const DIFF_PROPORTIONS_CONDITION_WARNING =
  "En alguno de los grupos no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5.";

const alpha = (confidence: number) => 1 - confidence;
const zAlpha2 = (confidence: number) => zQ(1 - alpha(confidence) / 2);
const tAlpha2 = (confidence: number, df: number) => tQ(1 - alpha(confidence) / 2, df);
const normalConditionMet = (n: number, p: number) => n * p >= 5 && n * (1 - p) >= 5;

/** Distribución para una media: σ conocida o n ≥ 30 → Z; si no, t. */
export function meanDistribution(n: number, sigmaKnown: boolean): Distribution {
  return sigmaKnown || n >= LARGE_SAMPLE_N ? "z" : "t";
}

/** Distribución para dos medias: σ conocidas o n₁, n₂ ≥ 30 → Z; si no, t con Sp. */
export function diffMeansDistribution(n1: number, n2: number, sigmasKnown: boolean): Distribution {
  return sigmasKnown || (n1 >= LARGE_SAMPLE_N && n2 >= LARGE_SAMPLE_N) ? "z" : "t";
}

/** Resumen a partir de Σx y Σx²: x̄ = Σx/n y s² = (Σx² − (Σx)²/n)/(n − 1). */
export function summaryFromSums(n: number, sumX: number, sumX2: number): Summary {
  return {
    n,
    mean: sumX / n,
    variance: (sumX2 - (sumX * sumX) / n) / (n - 1),
  };
}

/** IC para la media μ (σ conocida → Z; σ desconocida: n ≥ 30 → Z con s, n < 30 → t). */
export function meanCI(s: Summary, confidence: number, sigma?: number): ConfidenceInterval {
  const sigmaKnown = sigma !== undefined;
  const distribution = meanDistribution(s.n, sigmaKnown);
  const sd = sigmaKnown ? sigma : Math.sqrt(s.variance);
  const standardError = sd / Math.sqrt(s.n);
  const df = s.n - 1;
  const criticalValue = distribution === "z" ? zAlpha2(confidence) : tAlpha2(confidence, df);
  const margin = criticalValue * standardError;
  const kind: IntervalKind = sigmaKnown ? "mean-z-sigma" : distribution === "z" ? "mean-z" : "mean-t";
  return {
    kind,
    distribution,
    confidence,
    estimate: s.mean,
    lower: s.mean - margin,
    upper: s.mean + margin,
    margin,
    standardError,
    criticalValue,
    ...(distribution === "t" ? { df } : {}),
    warnings: [],
  };
}

/** IC para una proporción: p̂ ± Z_{α/2}·√(p̂q̂/n), recortado a [0, 1]. */
export function proportionCI(x: number, n: number, confidence: number): ConfidenceInterval {
  const p = n > 0 ? x / n : NaN;
  const criticalValue = zAlpha2(confidence);
  const standardError = Math.sqrt((p * (1 - p)) / n);
  const margin = criticalValue * standardError;
  const conditionMet = normalConditionMet(n, p);
  return {
    kind: "proportion",
    distribution: "z",
    confidence,
    estimate: p,
    lower: Math.max(0, p - margin),
    upper: Math.min(1, p + margin),
    margin,
    standardError,
    criticalValue,
    conditionMet,
    warnings: conditionMet ? [] : [PROPORTION_CONDITION_WARNING],
  };
}

/** Varianza agrupada Sp² = [(n₁ − 1)s₁² + (n₂ − 1)s₂²]/(n₁ + n₂ − 2). */
export function pooledVariance(a: Summary, b: Summary): number {
  return ((a.n - 1) * a.variance + (b.n - 1) * b.variance) / (a.n + b.n - 2);
}

/** Error estándar de x̄₁ − x̄₂ según la distribución elegida (σ conocidas, Z con s² o t con Sp). */
export function diffMeansStandardError(
  a: Summary,
  b: Summary,
  sigmas?: [number, number],
): number {
  if (sigmas) return Math.sqrt(sigmas[0] ** 2 / a.n + sigmas[1] ** 2 / b.n);
  if (diffMeansDistribution(a.n, b.n, false) === "z") {
    return Math.sqrt(a.variance / a.n + b.variance / b.n);
  }
  return Math.sqrt(pooledVariance(a, b)) * Math.sqrt(1 / a.n + 1 / b.n);
}

/** IC para μ₁ − μ₂ (A − B). */
export function diffMeansCI(
  a: Summary,
  b: Summary,
  confidence: number,
  sigmas?: [number, number],
): ConfidenceInterval {
  const distribution = diffMeansDistribution(a.n, b.n, sigmas !== undefined);
  const standardError = diffMeansStandardError(a, b, sigmas);
  const df = a.n + b.n - 2;
  const criticalValue = distribution === "z" ? zAlpha2(confidence) : tAlpha2(confidence, df);
  const margin = criticalValue * standardError;
  const estimate = a.mean - b.mean;
  const kind: IntervalKind = sigmas
    ? "diff-means-z-sigma"
    : distribution === "z"
      ? "diff-means-z"
      : "diff-means-pooled";
  return {
    kind,
    distribution,
    confidence,
    estimate,
    lower: estimate - margin,
    upper: estimate + margin,
    margin,
    standardError,
    criticalValue,
    ...(distribution === "t" ? { df } : {}),
    warnings: [],
  };
}

/** IC para p₁ − p₂: (p̂₁ − p̂₂) ± Z_{α/2}·√(p̂₁q̂₁/n₁ + p̂₂q̂₂/n₂). Sin recorte. */
export function diffProportionsCI(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  confidence: number,
): ConfidenceInterval {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const criticalValue = zAlpha2(confidence);
  const standardError = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const margin = criticalValue * standardError;
  const conditionMet = normalConditionMet(n1, p1) && normalConditionMet(n2, p2);
  const estimate = p1 - p2;
  return {
    kind: "diff-proportions",
    distribution: "z",
    confidence,
    estimate,
    lower: estimate - margin,
    upper: estimate + margin,
    margin,
    standardError,
    criticalValue,
    conditionMet,
    warnings: conditionMet ? [] : [DIFF_PROPORTIONS_CONDITION_WARNING],
  };
}
