import { tCdf, tQ, zCdf, zQ } from "./distributions";
import {
  diffMeansDistribution,
  diffMeansStandardError,
  pooledVariance,
  type Distribution,
  type Summary,
} from "./intervals";

/** H₁: «<» (izquierda), «>» (derecha) o «≠» (bilateral). */
export type Alternative = "menor" | "mayor" | "distinto";
/** «Se acepta H₀» / «se rechaza H₀» (redacción de clase). */
export type TestDecision = "acepta" | "rechaza";
export type DiffMeansTestKind = "diff-means-z-sigma" | "diff-means-z" | "diff-means-pooled";

export type DiffMeansTestInput = {
  a: Summary;
  b: Summary;
  /** δ₀: valor de μ_A − μ_B en H₀ (por defecto 0). */
  delta0: number;
  alternative: Alternative;
  /** Nivel de significancia α (0.01, 0.05 o 0.10 en la UI). */
  alpha: number;
  /** σ conocidas (solo para reproducir ejemplos del cuaderno). */
  sigmas?: [number, number];
};

export type CriticalPoints = { pci?: number; pcs?: number };

export type DiffMeansTest = {
  kind: DiffMeansTestKind;
  distribution: Distribution;
  alternative: Alternative;
  alpha: number;
  delta0: number;
  /** x̄_A − x̄_B */
  estimate: number;
  /** Denominador de la variante (σ, s o Sp). */
  standardError: number;
  /** Solo t: n_A + n_B − 2. */
  df?: number;
  /** Solo t: Sp². */
  pooledVariance?: number;
  /** La variante estadística (Z o t). */
  statistic: number;
  /** Punto crítico inferior (menor y distinto). */
  pci?: number;
  /** Punto crítico superior (mayor y distinto). */
  pcs?: number;
  pValue: number;
  /** La variante cae en la región crítica (el borde pertenece a la R.C.). */
  inCriticalRegion: boolean;
  decision: TestDecision;
};

/** Cuantil de la distribución elegida (Z o t con gl). */
function quantile(distribution: Distribution, p: number, df?: number): number {
  return distribution === "z" ? zQ(p) : tQ(p, df ?? NaN);
}

/** P.C.I. y/o P.C.S. según el tipo de prueba. */
export function criticalPoints(
  distribution: Distribution,
  alternative: Alternative,
  alpha: number,
  df?: number,
): CriticalPoints {
  if (alternative === "menor") return { pci: -quantile(distribution, 1 - alpha, df) };
  if (alternative === "mayor") return { pcs: quantile(distribution, 1 - alpha, df) };
  const c = quantile(distribution, 1 - alpha / 2, df);
  return { pci: -c, pcs: c };
}

/** p-valor con zCdf / tCdf (se usa la simetría para no perder precisión en las colas). */
export function pValueFor(
  statistic: number,
  distribution: Distribution,
  alternative: Alternative,
  df?: number,
): number {
  const cdf = (x: number) => (distribution === "z" ? zCdf(x) : tCdf(x, df ?? NaN));
  if (alternative === "menor") return cdf(statistic);
  if (alternative === "mayor") return cdf(-statistic);
  return 2 * cdf(-Math.abs(statistic));
}

/**
 * La variante solo se puede calcular si el denominador (σ, s o Sp) es positivo y finito.
 * Con variabilidad 0 en ambas muestras da 0/0 o ±∞ y no hay prueba que mostrar.
 */
export function canTestDiffMeans(a: Summary, b: Summary, sigmas?: [number, number]): boolean {
  const se = diffMeansStandardError(a, b, sigmas);
  return Number.isFinite(se) && se > 0;
}

/** Prueba de hipótesis para μ_A − μ_B: variante, P.C.I./P.C.S., R.C., p-valor y decisión. */
export function diffMeansTest(input: DiffMeansTestInput): DiffMeansTest {
  const { a, b, delta0, alternative, alpha, sigmas } = input;
  const distribution = diffMeansDistribution(a.n, b.n, sigmas !== undefined);
  const kind: DiffMeansTestKind = sigmas
    ? "diff-means-z-sigma"
    : distribution === "z"
      ? "diff-means-z"
      : "diff-means-pooled";
  const standardError = diffMeansStandardError(a, b, sigmas);
  const estimate = a.mean - b.mean;
  const statistic = (estimate - delta0) / standardError;
  const df = distribution === "t" ? a.n + b.n - 2 : undefined;

  const { pci, pcs } = criticalPoints(distribution, alternative, alpha, df);
  const inCriticalRegion =
    (pci !== undefined && statistic <= pci) || (pcs !== undefined && statistic >= pcs);

  return {
    kind,
    distribution,
    alternative,
    alpha,
    delta0,
    estimate,
    standardError,
    ...(df !== undefined ? { df, pooledVariance: pooledVariance(a, b) } : {}),
    statistic,
    ...(pci !== undefined ? { pci } : {}),
    ...(pcs !== undefined ? { pcs } : {}),
    pValue: pValueFor(statistic, distribution, alternative, df),
    inCriticalRegion,
    decision: inCriticalRegion ? "rechaza" : "acepta",
  };
}
