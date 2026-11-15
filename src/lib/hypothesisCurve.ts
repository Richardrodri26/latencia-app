import { normalPdf, tPdf, type DiffMeansTest } from "@/lib/stats";

export type CurvePoint = {
  x: number;
  /** Densidad dentro de la zona de aceptación (null fuera de ella). */
  za: number | null;
  /** Densidad dentro de la región crítica (null fuera de ella). */
  rc: number | null;
};

export type CurveModel = {
  points: CurvePoint[];
  /** El eje x va de −limit a limit. */
  limit: number;
  /** Posición de la variante dentro del eje (en el borde si queda fuera). */
  statisticX: number;
  /** Lado por el que la variante sale del gráfico, o null si cae dentro. */
  outside: "left" | "right" | null;
  /** Marcas del eje x, simétricas respecto de 0 (−4, −2, 0, 2, 4 con el eje base). */
  ticks: number[];
};

/** Marcas simétricas: de 2 en 2 con el eje base y más espaciadas si el eje se amplió. */
export function axisTicks(limit: number): number[] {
  const stepSize = limit <= BASE_LIMIT ? 2 : Math.ceil(limit / 4);
  const m = Math.floor(limit / stepSize);
  return Array.from({ length: 2 * m + 1 }, (_, i) => (i - m) * stepSize);
}

/**
 * Posición de la etiqueta de la variante. En una ReferenceLine vertical (ancho 0) `insideBottomLeft`
 * escribe el texto hacia la derecha de la línea e `insideBottomRight` hacia la izquierda; se elige
 * el lado que deja el texto dentro del gráfico (hacia el centro).
 */
export function statisticLabelPosition(statisticX: number): "insideBottomLeft" | "insideBottomRight" {
  return statisticX > 0 ? "insideBottomRight" : "insideBottomLeft";
}

const STEP = 0.05;
const BASE_LIMIT = 4;

const density = (test: DiffMeansTest, x: number) =>
  test.distribution === "z" ? normalPdf(x, 0, 1) : tPdf(x, test.df ?? NaN);

/** Datos para dibujar la curva de la variante con la Z.A. y la R.C. (docs/06 §4.2). */
export function buildCurve(test: DiffMeansTest): CurveModel {
  const critical = [test.pci, test.pcs].filter((c): c is number => c !== undefined);
  const far = Math.max(0, ...critical.map(Math.abs));
  const limit = far > BASE_LIMIT ? far + 0.5 : BASE_LIMIT;

  const count = Math.round((2 * limit) / STEP);
  const xs = Array.from({ length: count + 1 }, (_, i) => -limit + (2 * limit * i) / count);
  // Los puntos críticos se agregan para que las dos zonas se toquen sin hueco.
  for (const c of critical) xs.push(c);
  xs.sort((p, q) => p - q);

  const inRc = (x: number) =>
    (test.pci !== undefined && x <= test.pci) || (test.pcs !== undefined && x >= test.pcs);
  const inZa = (x: number) =>
    (test.pci === undefined || x >= test.pci) && (test.pcs === undefined || x <= test.pcs);

  const points = xs.map((x) => {
    const y = density(test, x);
    return { x, za: inZa(x) ? y : null, rc: inRc(x) ? y : null };
  });

  const outside = test.statistic < -limit ? "left" : test.statistic > limit ? "right" : null;
  const statisticX = Math.min(limit, Math.max(-limit, test.statistic));
  return { points, limit, statisticX, outside, ticks: axisTicks(limit) };
}
