/** Generador pseudoaleatorio con semilla (mulberry32). Devuelve valores en [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Distribución muestral de la media por remuestreo con reemplazo:
 * k réplicas, cada una con m valores tomados al azar de `data`.
 * Para la proporción se pasa un arreglo de 0/1 (la media es p̂).
 */
export function resampleMeans(data: number[], m: number, k: number, seed: number): number[] {
  if (data.length === 0) return [];
  const rand = mulberry32(seed);
  const n = data.length;
  const out: number[] = new Array<number>(k);
  for (let r = 0; r < k; r++) {
    let sum = 0;
    for (let i = 0; i < m; i++) sum += data[Math.floor(rand() * n)];
    out[r] = sum / m;
  }
  return out;
}

export type HistogramBin = { x0: number; x1: number; center: number; count: number; density: number };

/** Histograma con `bins` clases de igual ancho; `density` integra 1. */
export function histogram(
  data: number[],
  bins: number,
  range?: [number, number],
): HistogramBin[] {
  if (data.length === 0 || bins < 1) return [];
  let lo = range ? range[0] : Math.min(...data);
  let hi = range ? range[1] : Math.max(...data);
  if (hi === lo) {
    lo -= 0.5;
    hi += 0.5;
  }
  const width = (hi - lo) / bins;
  const counts = new Array<number>(bins).fill(0);
  for (const x of data) {
    if (x < lo || x > hi) continue;
    const idx = Math.min(bins - 1, Math.floor((x - lo) / width));
    counts[idx]++;
  }
  return counts.map((count, i) => ({
    x0: lo + i * width,
    x1: lo + (i + 1) * width,
    center: lo + (i + 0.5) * width,
    count,
    density: count / (data.length * width),
  }));
}
