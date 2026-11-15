import jstat from "jstat";

/** Cuantil de la normal estándar. */
export function zQ(p: number): number {
  return jstat.normal.inv(p, 0, 1);
}

/** Cuantil de la t de Student. */
export function tQ(p: number, gl: number): number {
  return jstat.studentt.inv(p, gl);
}

/** CDF de la normal estándar: P(Z ≤ x). */
export function zCdf(x: number): number {
  return jstat.normal.cdf(x, 0, 1);
}

/** CDF de la t de Student: P(T ≤ x) con gl grados de libertad. */
export function tCdf(x: number, gl: number): number {
  return jstat.studentt.cdf(x, gl);
}

/** Densidad de la t de Student (solo para dibujar la curva). */
export function tPdf(x: number, gl: number): number {
  return jstat.studentt.pdf(x, gl);
}

/** Densidad de la normal N(mu, sigma). */
export function normalPdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}
