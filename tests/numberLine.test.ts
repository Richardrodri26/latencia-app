import { describe, expect, it } from "vitest";
import { niceAxis, numberLineScale } from "@/lib/numberLine";

describe("numberLineScale", () => {
  it("incluye intervalo y referencia con margen de 1/3 del rango", () => {
    const s = numberLineScale(-0.0808, 0.0208, 0);
    expect(s.min).toBeLessThan(-0.0808);
    expect(s.max).toBeGreaterThan(0.0208);
    expect(s.pct(s.min)).toBeCloseTo(0);
    expect(s.pct(s.max)).toBeCloseTo(100);
    expect(s.pct(-0.0808)).toBeCloseTo(20, 5);
    expect(s.pct(0.0208)).toBeCloseTo(80, 5);
  });

  it("amplía el eje hasta la referencia cuando el intervalo no la contiene", () => {
    const s = numberLineScale(-160.44, -126.96, 0);
    expect(s.pct(0)).toBeCloseTo(80, 5);
    expect(s.pct(-160.44)).toBeCloseTo(20, 5);
  });

  it("no divide entre 0 si todo coincide", () => {
    const s = numberLineScale(0, 0, 0);
    expect(Number.isFinite(s.pct(0))).toBe(true);
  });
});

describe("niceAxis", () => {
  it("da un máximo y marcas redondas", () => {
    expect(niceAxis(330)).toEqual({ max: 400, ticks: [0, 100, 200, 300, 400] });
    expect(niceAxis(95).ticks).toEqual([0, 20, 40, 60, 80, 100]);
  });
  it("el máximo siempre cubre el valor", () => {
    for (const v of [1, 7, 49, 330, 1234.5]) expect(niceAxis(v).max).toBeGreaterThanOrEqual(v);
  });
});
