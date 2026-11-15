import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HypothesisPanel } from "@/components/results/HypothesisPanel";
import { MathText } from "@/components/results/MathText";
import { parseCsv } from "@/lib/csv";
import { axisTicks, buildCurve, statisticLabelPosition } from "@/lib/hypothesisCurve";
import { computeResults } from "@/lib/results";
import { diffMeansTest } from "@/lib/stats";

const { valid } = parseCsv(readFileSync(join(process.cwd(), "public", "data", "respaldo.csv"), "utf-8"));
const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

describe("MathText con subíndices A/B", () => {
  it("convierte _A y _B en subíndice", () => {
    expect(renderToStaticMarkup(<MathText text="μ_A − μ_B" />)).toBe("μ<sub>A</sub> − μ<sub>B</sub>");
    expect(renderToStaticMarkup(<MathText text="Z_{α/2} y n_A" />)).toBe("Z<sub>α/2</sub> y n<sub>A</sub>");
  });
});

describe("HypothesisPanel con el respaldo (valores por defecto: bilateral, δ₀ = 0, α = 5 %)", () => {
  const r = computeResults(valid, "principal", 0.95, 300, "API A", "API B");
  const t = text(renderToStaticMarkup(<HypothesisPanel results={r} />));

  it("muestra los 4 pasos, la variante y la conclusión", () => {
    expect(t).toContain("Prueba de hipótesis: diferencia de medias (Unidad IV)");
    for (const k of [1, 2, 3, 4]) expect(t).toContain(`Paso ${k} ·`);
    expect(t).toContain("−16.8252");
    expect(t).toContain("P.C.I. = −1.9600 (tabla: −1.96)");
    expect(t).toContain("P.C.S. = 1.9600 (tabla: 1.96)");
    expect(t).toContain("< 0.0001");
    expect(t).toContain("Se rechaza H₀. Con α = 5%");
  });

  it("no menciona errores tipo I/II, potencia ni «no se rechaza»", () => {
    const low = t.toLowerCase();
    for (const w of ["error tipo", "potencia", "no se rechaza"]) expect(low).not.toContain(w);
  });
});

describe("HypothesisPanel con variabilidad 0 en ambas muestras", () => {
  const r = computeResults(valid, "principal", 0.95, 300, "API A", "API B");
  const flat = (x: typeof r.a) => ({ ...x, descriptive: { ...x.descriptive, variance: 0 } });
  const t = text(renderToStaticMarkup(<HypothesisPanel results={{ ...r, a: flat(r.a), b: flat(r.b) }} />));

  it("avisa y no muestra números ni decisión", () => {
    expect(t).toContain("No se puede calcular el estadístico: la variabilidad de ambas muestras es 0.");
    expect(t).not.toContain("NaN");
    expect(t).not.toContain("Infinity");
    expect(t).not.toContain("Se acepta H₀");
    expect(t).not.toContain("Paso 1 ·");
  });
});

describe("HypothesisPanel: subíndices en el encabezado", () => {
  it("muestra μ_A − μ_B y n_A con <sub>", () => {
    const r = computeResults(valid, "principal", 0.95, 300, "API A", "API B");
    const html = renderToStaticMarkup(<HypothesisPanel results={r} />);
    expect(html).toContain("μ<sub>A</sub> − μ<sub>B</sub>");
    expect(html).toContain("n<sub>A</sub>, n<sub>B</sub> ≥ 30");
  });
});

describe("buildCurve", () => {
  const r = computeResults(valid, "principal", 0.95, 300, "API A", "API B");
  const base = { a: r.a.descriptive, b: r.b.descriptive, alpha: 0.05 };

  it("R1: la variante queda fuera por la izquierda y se dibuja en el borde", () => {
    const c = buildCurve(diffMeansTest({ ...base, delta0: 0, alternative: "menor" }));
    expect(c.limit).toBe(4);
    expect(c.outside).toBe("left");
    expect(c.statisticX).toBe(-4);
    expect(c.points).toHaveLength(161 + 1); // 161 puntos + el punto crítico
    // R.C. solo a la izquierda del P.C.I.; Z.A. solo a su derecha.
    expect(c.points.filter((p) => p.rc !== null).every((p) => p.x <= -1.6448)).toBe(true);
    expect(c.points.filter((p) => p.za !== null).every((p) => p.x >= -1.6449)).toBe(true);
  });

  it("R3: la variante cae dentro del eje (Z.A.)", () => {
    const c = buildCurve(diffMeansTest({ ...base, delta0: -150, alternative: "distinto" }));
    expect(c.outside).toBeNull();
    expect(c.statisticX).toBeCloseTo(0.737851, 3);
  });

  it("la etiqueta de la variante apunta hacia el centro en ambos bordes", () => {
    const left = buildCurve(diffMeansTest({ ...base, delta0: 0, alternative: "menor" }));
    const right = buildCurve(diffMeansTest({ ...base, delta0: -300, alternative: "mayor" }));
    expect(left.outside).toBe("left");
    expect(right.outside).toBe("right");
    expect(right.statisticX).toBe(4);
    // Línea vertical de ancho 0: «insideBottomLeft» escribe a la derecha de la línea, «insideBottomRight» a la izquierda.
    expect(statisticLabelPosition(left.statisticX)).toBe("insideBottomLeft");
    expect(statisticLabelPosition(right.statisticX)).toBe("insideBottomRight");
  });

  it("las marcas del eje son simétricas (−4, −2, 0, 2, 4 con el eje base)", () => {
    expect(axisTicks(4)).toEqual([-4, -2, 0, 2, 4]);
    const wide = axisTicks(17.3);
    expect(wide).toEqual(wide.map((v) => 0 - v).reverse());
    expect(wide.includes(0)).toBe(true);
    expect(Math.max(...wide)).toBeLessThanOrEqual(17.3);
  });

  it("amplía el eje si un punto crítico supera ±4", () => {
    const t = diffMeansTest({ ...base, delta0: 0, alternative: "distinto", alpha: 1e-6 });
    expect(buildCurve(t).limit).toBeGreaterThan(4.5);
  });
});
