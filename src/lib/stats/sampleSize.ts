import { zQ } from "./distributions";

export type SampleSizeResult = {
  /** Valor sin redondear. */
  raw: number;
  /** Redondeado hacia arriba. */
  n: number;
  /** Con corrección por población finita (si se dio N). */
  nFinite?: number;
  z: number;
};

// Tolerancia para que un valor "exacto" (p. ej. 100.0000000001) no suba un entero de más.
const ceil = (x: number) => Math.ceil(x - 1e-9);

function finite(raw: number, popSize?: number): number | undefined {
  if (popSize === undefined || popSize <= 0) return undefined;
  return ceil(raw / (1 + (raw - 1) / popSize));
}

/** n = (z · σ / E)² */
export function sampleSizeMean(
  sigma: number,
  margin: number,
  confidence: number,
  popSize?: number,
): SampleSizeResult {
  const z = zQ(1 - (1 - confidence) / 2);
  const raw = ((z * sigma) / margin) ** 2;
  return { raw, n: ceil(raw), nFinite: finite(raw, popSize), z };
}

/** n = z² · p(1−p) / E² */
export function sampleSizeProportion(
  p: number,
  margin: number,
  confidence: number,
  popSize?: number,
): SampleSizeResult {
  const z = zQ(1 - (1 - confidence) / 2);
  const raw = (z * z * p * (1 - p)) / (margin * margin);
  return { raw, n: ceil(raw), nFinite: finite(raw, popSize), z };
}
