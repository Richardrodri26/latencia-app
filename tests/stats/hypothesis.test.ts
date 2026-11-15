import { describe, expect, it } from "vitest";
import {
  canTestDiffMeans,
  criticalPoints,
  diffMeansCI,
  diffMeansTest,
  tCdf,
  tPdf,
  zCdf,
  type Alternative,
} from "@/lib/stats";

const close = (actual: number | undefined, expected: number, tol = 1e-3) =>
  expect(Math.abs((actual ?? NaN) - expected)).toBeLessThan(tol);

describe("distribuciones (docs/06 §5.1)", () => {
  it("zCdf", () => {
    close(zCdf(0), 0.5);
    close(zCdf(-1.959964), 0.025);
    close(zCdf(-2.279011), 0.011333);
  });
  it("tCdf", () => {
    close(tCdf(-5, 8), 0.000526);
    close(tCdf(1.757481, 25), 0.954462);
  });
  it("tPdf (solo para dibujar): valor en 0 con gl = 8", () => {
    close(tPdf(0, 8), 0.386699);
  });
});

describe("canTestDiffMeans (error estándar 0)", () => {
  const flat = { n: 5, mean: 100, variance: 0 };
  it("no hay prueba si ambas muestras tienen variabilidad 0 (rama t y rama Z)", () => {
    expect(canTestDiffMeans(flat, { ...flat, mean: 120 })).toBe(false);
    expect(canTestDiffMeans({ ...flat, n: 40 }, { ...flat, n: 40 })).toBe(false);
    expect(canTestDiffMeans(flat, flat, [0, 0])).toBe(false);
  });
  it("sí hay prueba si alguna muestra varía o si las σ son positivas", () => {
    expect(canTestDiffMeans(flat, { ...flat, variance: 4 })).toBe(true);
    expect(canTestDiffMeans(flat, flat, [2, 3])).toBe(true);
  });
});

describe("criticalPoints (docs/06 §5.1)", () => {
  it("Z", () => {
    const l = criticalPoints("z", "menor", 0.05);
    close(l.pci, -1.644854);
    expect(l.pcs).toBeUndefined();
    const d = criticalPoints("z", "distinto", 0.01);
    close(d.pci, -2.575829);
    close(d.pcs, 2.575829);
    const r = criticalPoints("z", "mayor", 0.1);
    close(r.pcs, 1.281552);
    expect(r.pci).toBeUndefined();
  });
  it("t", () => {
    const d = criticalPoints("t", "distinto", 0.05, 25);
    close(d.pci, -2.059539);
    close(d.pcs, 2.059539);
    close(criticalPoints("t", "mayor", 0.05, 25).pcs, 1.708141);
    close(criticalPoints("t", "menor", 0.05, 8).pci, -1.859548);
  });
});

describe("Problema 2.2 como prueba bilateral al 2 % (σ conocidas)", () => {
  const t = diffMeansTest({
    a: { n: 60, mean: 125, variance: NaN },
    b: { n: 70, mean: 134, variance: NaN },
    delta0: 0,
    alternative: "distinto",
    alpha: 0.02,
    sigmas: [20, 25],
  });
  it("variante, puntos críticos y decisión", () => {
    expect(t.kind).toBe("diff-means-z-sigma");
    expect(t.distribution).toBe("z");
    close(t.standardError, 3.949081);
    close(t.statistic, -2.279011);
    close(t.pci, -2.326348);
    close(t.pcs, 2.326348);
    expect(t.inCriticalRegion).toBe(false);
    close(t.pValue, 0.022666);
    expect(t.decision).toBe("acepta");
  });
});

describe("rama t derivada del Problema 3.1 (α = 5 %)", () => {
  const a = { n: 15, mean: 1240, variance: 85 ** 2 };
  const b = { n: 12, mean: 1180, variance: 92 ** 2 };
  const run = (alternative: Alternative) => diffMeansTest({ a, b, delta0: 0, alternative, alpha: 0.05 });

  it("bilateral: se acepta H₀", () => {
    const t = run("distinto");
    expect(t.kind).toBe("diff-means-pooled");
    expect(t.distribution).toBe("t");
    expect(t.df).toBe(25);
    close(t.pooledVariance, 7770.16);
    close(t.standardError, 34.139772);
    close(t.statistic, 1.757481);
    close(t.pci, -2.059539);
    close(t.pcs, 2.059539);
    close(t.pValue, 0.091077);
    expect(t.decision).toBe("acepta");
  });
  it("derecha: se rechaza H₀", () => {
    const t = run("mayor");
    close(t.pcs, 1.708141);
    close(t.pValue, 0.045538);
    expect(t.inCriticalRegion).toBe(true);
    expect(t.decision).toBe("rechaza");
  });
});

describe("caso sintético A < B (rama t)", () => {
  const A = { n: 5, mean: 14, variance: 10 };
  const B = { n: 5, mean: 24, variance: 10 };
  it("izquierda", () => {
    const t = diffMeansTest({ a: A, b: B, delta0: 0, alternative: "menor", alpha: 0.05 });
    expect(t.kind).toBe("diff-means-pooled");
    close(t.pooledVariance, 10);
    expect(t.df).toBe(8);
    close(t.standardError, 2);
    close(t.statistic, -5);
    close(t.pci, -1.859548);
    close(t.pValue, 0.000526);
    expect(t.decision).toBe("rechaza");
  });
  it("bilateral", () => {
    const t = diffMeansTest({ a: A, b: B, delta0: 0, alternative: "distinto", alpha: 0.05 });
    close(t.pValue, 0.001053);
  });
});

describe("decisión por R.C. ⇔ p-valor ≤ α", () => {
  const cases: Array<[Parameters<typeof diffMeansTest>[0]]> = [];
  const A = { n: 100, mean: 90.511986, variance: 1934.1946 };
  const B = { n: 100, mean: 234.210254, variance: 5360.0936 };
  for (const alternative of ["menor", "mayor", "distinto"] as const) {
    for (const alpha of [0.01, 0.05, 0.1]) {
      for (const delta0 of [0, -150, -100, -140, 50]) cases.push([{ a: A, b: B, delta0, alternative, alpha }]);
    }
  }
  it.each(cases)("caso %#", (input) => {
    const t = diffMeansTest(input);
    expect(t.decision === "rechaza").toBe(t.pValue <= t.alpha);
  });
});

describe("coherencia IC–prueba (bilateral, α = 1 − N.C., rama Z)", () => {
  const A = { n: 100, mean: 90.511986, variance: 1934.1946 };
  const B = { n: 100, mean: 234.210254, variance: 5360.0936 };
  const ci = diffMeansCI(A, B, 0.95);
  it.each([0, -150, -100, -160.4, -126.9])("δ₀ = %s", (delta0) => {
    const t = diffMeansTest({ a: A, b: B, delta0, alternative: "distinto", alpha: 0.05 });
    const inside = ci.lower <= delta0 && delta0 <= ci.upper;
    expect(t.decision === "acepta").toBe(inside);
  });
});

describe("dataset de respaldo (docs/06 §5.5), cálculo directo", () => {
  const A = { n: 100, mean: 90.511986, variance: 1934.1946 };
  const B = { n: 100, mean: 234.210254, variance: 5360.0936 };
  it("R1 · izquierda: Z = −16.8252, p < 1e-4", () => {
    const t = diffMeansTest({ a: A, b: B, delta0: 0, alternative: "menor", alpha: 0.05 });
    expect(t.kind).toBe("diff-means-z");
    close(t.standardError, 8.5407);
    close(t.statistic, -16.825194);
    close(t.pci, -1.644854);
    expect(t.pValue).toBeLessThan(1e-4);
    expect(t.decision).toBe("rechaza");
  });
  it("R2 · bilateral", () => {
    const t = diffMeansTest({ a: A, b: B, delta0: 0, alternative: "distinto", alpha: 0.05 });
    close(t.pci, -1.959964);
    close(t.pcs, 1.959964);
    expect(t.pValue).toBeLessThan(1e-4);
    expect(t.decision).toBe("rechaza");
  });
  it("R3 · δ₀ = −150, bilateral: se acepta H₀", () => {
    const t = diffMeansTest({ a: A, b: B, delta0: -150, alternative: "distinto", alpha: 0.05 });
    close(t.statistic, 0.737851);
    close(t.pValue, 0.460605);
    expect(t.decision).toBe("acepta");
  });
  it("R4 · δ₀ = −100, izquierda: se rechaza H₀", () => {
    const t = diffMeansTest({ a: A, b: B, delta0: -100, alternative: "menor", alpha: 0.05 });
    close(t.statistic, -5.116497);
    expect(t.pValue).toBeLessThan(1e-4);
    expect(t.decision).toBe("rechaza");
  });
});
