import { pooledVariance, type ConfidenceInterval, type Summary } from "@/lib/stats";

/** Textos de fórmula y sustitución numérica de cada intervalo (solo presentación). */
export type Explanation = { formula: string; substitution: string };

const f2 = (x: number) => x.toFixed(2);
const f4 = (x: number) => x.toFixed(4);
const crit = (ci: ConfidenceInterval, i = 0) =>
  Array.isArray(ci.criticalValue) ? ci.criticalValue[i] : ci.criticalValue;
const dfNum = (ci: ConfidenceInterval, i = 0) => (Array.isArray(ci.df) ? ci.df[i] : (ci.df ?? NaN));
const alphaText = (ci: ConfidenceInterval) => `α = ${f4(1 - ci.confidence)}`;

export function explainMeanT(ci: ConfidenceInterval, s: Summary): Explanation {
  return {
    formula: "x̄ ± t(1−α/2, n−1) · s/√n",
    substitution: `${f2(s.mean)} ± ${f4(crit(ci))} · ${f2(Math.sqrt(s.variance))}/√${s.n} = ${f2(s.mean)} ± ${f2(ci.margin ?? NaN)}  (${alphaText(ci)}, gl = ${dfNum(ci)})`,
  };
}

export function explainMeanZ(ci: ConfidenceInterval, s: Summary): Explanation {
  return {
    formula: "x̄ ± z(1−α/2) · s/√n",
    substitution: `${f2(s.mean)} ± ${f4(crit(ci))} · ${f2(Math.sqrt(s.variance))}/√${s.n} = ${f2(s.mean)} ± ${f2(ci.margin ?? NaN)}  (${alphaText(ci)})`,
  };
}

export function explainVariance(ci: ConfidenceInterval, s: Summary): Explanation {
  const df = s.n - 1;
  return {
    formula: "[ (n−1)s² / χ²(1−α/2, n−1) ; (n−1)s² / χ²(α/2, n−1) ]",
    substitution: `[ ${df}·${f2(s.variance)} / ${f4(crit(ci, 1))} ; ${df}·${f2(s.variance)} / ${f4(crit(ci, 0))} ] = [ ${f2(ci.lower)} ; ${f2(ci.upper)} ]  (${alphaText(ci)})`,
  };
}

export function explainSd(ci: ConfidenceInterval, s: Summary): Explanation {
  const df = s.n - 1;
  return {
    formula: "[ √((n−1)s² / χ²(1−α/2, n−1)) ; √((n−1)s² / χ²(α/2, n−1)) ]",
    substitution: `[ √(${df}·${f2(s.variance)} / ${f4(crit(ci, 1))}) ; √(${df}·${f2(s.variance)} / ${f4(crit(ci, 0))}) ] = [ ${f2(ci.lower)} ; ${f2(ci.upper)} ]`,
  };
}

export function explainProportion(ci: ConfidenceInterval, x: number, n: number): Explanation {
  const p = x / n;
  return {
    formula: "p̂ ± z(1−α/2) · √(p̂(1−p̂)/n)",
    substitution: `${f4(p)} ± ${f4(crit(ci))} · √(${f4(p)}·${f4(1 - p)}/${n}) = ${f4(p)} ± ${f4(ci.margin ?? NaN)}  (p̂ = ${x}/${n}; recortado a [0, 1])`,
  };
}

export function explainRatio(ci: ConfidenceInterval, a: Summary, b: Summary): Explanation {
  const r = a.variance / b.variance;
  return {
    formula: "[ (s₁²/s₂²) / F(1−α/2, n₁−1, n₂−1) ; (s₁²/s₂²) · F(1−α/2, n₂−1, n₁−1) ]",
    substitution: `[ ${f4(r)} / ${f4(crit(ci, 0))} ; ${f4(r)} · ${f4(crit(ci, 1))} ] = [ ${f4(ci.lower)} ; ${f4(ci.upper)} ]  (s₁² = ${f2(a.variance)}, s₂² = ${f2(b.variance)})`,
  };
}

export function explainWelch(ci: ConfidenceInterval, a: Summary, b: Summary): Explanation {
  return {
    formula: "(x̄₁ − x̄₂) ± t(1−α/2, ν) · √(s₁²/n₁ + s₂²/n₂),  ν = (s₁²/n₁ + s₂²/n₂)² / [ (s₁²/n₁)²/(n₁−1) + (s₂²/n₂)²/(n₂−1) ]",
    substitution: `(${f2(a.mean)} − ${f2(b.mean)}) ± ${f4(crit(ci))} · √(${f2(a.variance)}/${a.n} + ${f2(b.variance)}/${b.n}) = ${f2(ci.estimate)} ± ${f2(ci.margin ?? NaN)}  (ν = ${f4(dfNum(ci))}, sin redondear)`,
  };
}

export function explainPooled(ci: ConfidenceInterval, a: Summary, b: Summary): Explanation {
  const sp2 = pooledVariance(a, b);
  return {
    formula: "(x̄₁ − x̄₂) ± t(1−α/2, n₁+n₂−2) · sₚ · √(1/n₁ + 1/n₂),  sₚ² = [(n₁−1)s₁² + (n₂−1)s₂²] / (n₁+n₂−2)",
    substitution: `(${f2(a.mean)} − ${f2(b.mean)}) ± ${f4(crit(ci))} · √${f2(sp2)} · √(1/${a.n} + 1/${b.n}) = ${f2(ci.estimate)} ± ${f2(ci.margin ?? NaN)}  (gl = ${dfNum(ci)}, sₚ² = ${f2(sp2)})`,
  };
}

export function explainDiffProportions(
  ci: ConfidenceInterval,
  x1: number,
  n1: number,
  x2: number,
  n2: number,
): Explanation {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  return {
    formula: "(p̂₁ − p̂₂) ± z(1−α/2) · √(p̂₁(1−p̂₁)/n₁ + p̂₂(1−p̂₂)/n₂)",
    substitution: `(${f4(p1)} − ${f4(p2)}) ± ${f4(crit(ci))} · √(${f4(p1)}·${f4(1 - p1)}/${n1} + ${f4(p2)}·${f4(1 - p2)}/${n2}) = ${f4(ci.estimate)} ± ${f4(ci.margin ?? NaN)}`,
  };
}
