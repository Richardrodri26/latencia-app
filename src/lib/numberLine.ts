/** Escala de la recta numérica de un IC (solo presentación; no cambia ningún cálculo). */

export type NumberLineScale = {
  min: number;
  max: number;
  /** Posición en % (0–100) de un valor dentro del eje. */
  pct: (v: number) => number;
};

/**
 * Eje que incluye el intervalo y la referencia. Deja un margen de 1/3 del rango a cada lado
 * (≈ 20 % del ancho) para que las etiquetas de los extremos, colocadas hacia afuera, quepan.
 */
export function numberLineScale(lower: number, upper: number, reference: number): NumberLineScale {
  const lo = Math.min(lower, reference);
  const hi = Math.max(upper, reference);
  const pad = (hi - lo) / 3 || 1;
  const min = lo - pad;
  const max = hi + pad;
  return { min, max, pct: (v) => ((v - min) / (max - min)) * 100 };
}

/** Máximo "redondo" y marcas del eje Y de las medias (0 hasta ≥ valor, pasos de 1, 2 o 5 × 10ⁿ). */
export function niceAxis(value: number, targetTicks = 5): { max: number; ticks: number[] } {
  const raw = Math.max(value, 1) / targetTicks;
  const base = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * base >= raw) ?? 10) * base;
  const max = Math.ceil(value / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step / 2; t += step) ticks.push(Math.round(t * 1e9) / 1e9);
  return { max, ticks };
}
