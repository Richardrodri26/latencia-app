import jstat from "jstat";

/** Cuantil de la normal estándar. */
export function zQ(p: number): number {
  return jstat.normal.inv(p, 0, 1);
}

/** Cuantil de la t de Student (admite gl no entero). */
export function tQ(p: number, gl: number): number {
  return jstat.studentt.inv(p, gl);
}

/** Cuantil de la chi-cuadrado. */
export function chiQ(p: number, gl: number): number {
  return jstat.chisquare.inv(p, gl);
}

/** Cuantil de la F de Fisher. */
export function fQ(p: number, gl1: number, gl2: number): number {
  return jstat.centralF.inv(p, gl1, gl2);
}

/** Densidad de la normal N(mu, sigma). */
export function normalPdf(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) return 0;
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}
