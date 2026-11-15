export type Descriptive = {
  n: number;
  mean: number;
  variance: number;
  sd: number;
  min: number;
  max: number;
  median: number;
  p95: number;
  /** Coeficiente de asimetría g1 (NaN si n < 3). */
  skewness: number;
  /** Coeficiente de variación s / media. */
  cv: number;
  /** Σx */
  sum: number;
  /** Σx² */
  sumSq: number;
  /** Suma de cuadrados SS = Σx² − (Σx)²/n (NaN si n = 0). */
  ss: number;
};

/** Percentil con interpolación lineal (p entre 0 y 1) sobre datos ya ordenados. */
export function percentileSorted(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const pos = p * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function percentile(data: number[], p: number): number {
  return percentileSorted([...data].sort((a, b) => a - b), p);
}

export function mean(data: number[]): number {
  if (data.length === 0) return NaN;
  return data.reduce((acc, x) => acc + x, 0) / data.length;
}

/** Varianza muestral s² = Σ(xi − x̄)² / (n − 1). */
export function sampleVariance(data: number[]): number {
  const n = data.length;
  if (n < 2) return NaN;
  const m = mean(data);
  return data.reduce((acc, x) => acc + (x - m) ** 2, 0) / (n - 1);
}

/** g1 = [n / ((n−1)(n−2))] · Σ((xi − x̄)/s)³ */
export function skewness(data: number[]): number {
  const n = data.length;
  if (n < 3) return NaN;
  const m = mean(data);
  const s = Math.sqrt(sampleVariance(data));
  if (s === 0) return 0;
  const sum = data.reduce((acc, x) => acc + ((x - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

export function describe(data: number[]): Descriptive {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(data);
  const variance = sampleVariance(data);
  const sd = Math.sqrt(variance);
  const sum = data.reduce((acc, x) => acc + x, 0);
  const sumSq = data.reduce((acc, x) => acc + x * x, 0);
  return {
    n,
    mean: m,
    variance,
    sd,
    min: n ? sorted[0] : NaN,
    max: n ? sorted[n - 1] : NaN,
    median: percentileSorted(sorted, 0.5),
    p95: percentileSorted(sorted, 0.95),
    skewness: skewness(data),
    cv: sd / m,
    sum,
    sumSq,
    ss: n ? sumSq - (sum * sum) / n : NaN,
  };
}
