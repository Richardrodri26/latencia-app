import type { ConfidenceLevel, Measurement, Phase, TargetId } from "@/lib/schemas";
import {
  compareMeans,
  describe,
  diffProportionsCI,
  meanT,
  meanZ,
  proportionCI,
  recommend,
  sdCI,
  varianceCI,
  type ConfidenceInterval,
  type Descriptive,
  type MeansComparison,
  type RecommendationResult,
} from "@/lib/stats";

export type Counted = { x: number; n: number; ci: ConfidenceInterval | null };

export type ApiResults = {
  id: TargetId;
  name: string;
  /** Latencias válidas (ok = true, warmup = false). */
  latencies: number[];
  descriptive: Descriptive;
  /** Los IC de media/varianza requieren al menos 2 datos. */
  enough: boolean;
  meanT: ConfidenceInterval | null;
  meanZ: ConfidenceInterval | null;
  variance: ConfidenceInterval | null;
  sd: ConfidenceInterval | null;
  /** Proporción de peticiones válidas con latencia > SLA. */
  sla: Counted;
  /** Proporción de fallos sobre todas las mediciones sin calentamiento. */
  failures: Counted;
};

export type Comparison = {
  means: MeansComparison;
  diffSla: ConfidenceInterval;
  recommendation: RecommendationResult;
};

export type Results = {
  phase: Phase;
  confidence: ConfidenceLevel;
  slaMs: number;
  total: number;
  a: ApiResults;
  b: ApiResults;
  comparison: Comparison | null;
};

function countedProportion(x: number, n: number, confidence: number): Counted {
  return { x, n, ci: n > 0 ? proportionCI(x, n, confidence) : null };
}

function buildApi(
  id: TargetId,
  name: string,
  rows: Measurement[],
  slaMs: number,
  confidence: number,
): ApiResults {
  const own = rows.filter((m) => m.target === id && !m.warmup);
  const latencies = own.filter((m) => m.ok && m.latencyMs !== null).map((m) => m.latencyMs as number);
  const d = describe(latencies);
  const enough = latencies.length >= 2;
  return {
    id,
    name,
    latencies,
    descriptive: d,
    enough,
    meanT: enough ? meanT(d, confidence) : null,
    meanZ: enough ? meanZ(d, confidence) : null,
    variance: enough ? varianceCI(d, confidence) : null,
    sd: enough ? sdCI(d, confidence) : null,
    sla: countedProportion(latencies.filter((x) => x > slaMs).length, latencies.length, confidence),
    failures: countedProportion(own.filter((m) => !m.ok).length, own.length, confidence),
  };
}

/** Cálculo puro de todos los resultados de una fase (lo usa el hook useResults). */
export function computeResults(
  measurements: Measurement[],
  phase: Phase,
  confidence: ConfidenceLevel,
  slaMs: number,
  nameA: string,
  nameB: string,
): Results {
  const rows = measurements.filter((m) => m.phase === phase);
  const a = buildApi("A", nameA, rows, slaMs, confidence);
  const b = buildApi("B", nameB, rows, slaMs, confidence);

  let comparison: Comparison | null = null;
  if (a.enough && b.enough && a.sla.n > 0 && b.sla.n > 0) {
    const means = compareMeans(a.descriptive, b.descriptive, confidence);
    const diffCi = diffProportionsCI(a.sla.x, a.sla.n, b.sla.x, b.sla.n, confidence);
    comparison = {
      means,
      diffSla: diffCi,
      recommendation: recommend({
        nameA,
        nameB,
        diffMeans: means.chosen,
        diffSla: diffCi,
        varianceRatio: means.ratio,
      }),
    };
  }
  return { phase, confidence, slaMs, total: rows.length, a, b, comparison };
}
