import { describe, expect, it } from "vitest";
import {
  chiQ,
  compareMeans,
  describe as describeData,
  diffMeansPooled,
  diffMeansWelch,
  diffProportionsCI,
  fQ,
  histogram,
  meanT,
  proportionCI,
  recommend,
  resampleMeans,
  sampleSizeMean,
  sampleSizeProportion,
  sdCI,
  tQ,
  varianceCI,
  varianceRatioCI,
  zQ,
} from "@/lib/stats";

const TOL = 3; // toBeCloseTo(x, 3) => |diff| < 0.0005; la especificación pide 1e-3
const close = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThan(1e-3);

const A = [10, 12, 14, 16, 18];
const B = [20, 22, 24, 26, 28];
const sA = describeData(A);
const sB = describeData(B);

describe("cuantiles", () => {
  it("zQ", () => {
    close(zQ(0.975), 1.959964);
    close(zQ(0.95), 1.644854);
    close(zQ(0.995), 2.575829);
  });
  it("tQ", () => {
    close(tQ(0.975, 4), 2.776445);
    close(tQ(0.975, 8), 2.306004);
    close(tQ(0.975, 29), 2.04523);
    close(tQ(0.975, 99), 1.984217);
  });
  it("chiQ", () => {
    close(chiQ(0.025, 4), 0.484419);
    close(chiQ(0.975, 4), 11.143287);
    close(chiQ(0.025, 29), 16.047072);
    close(chiQ(0.975, 29), 45.722286);
  });
  it("fQ", () => {
    close(fQ(0.975, 4, 4), 9.60453);
  });
});

describe("descriptivos", () => {
  it("muestra A", () => {
    close(sA.mean, 14);
    close(sA.variance, 10);
    close(sA.sd, 3.162278);
    expect(sA.min).toBe(10);
    expect(sA.max).toBe(18);
    expect(sA.median).toBe(14);
    expect(sA.skewness).toBeCloseTo(0, TOL);
  });
  it("asimetría positiva", () => {
    expect(describeData([1, 1, 1, 2, 10]).skewness).toBeGreaterThan(1);
  });
  it("percentil 95 con interpolación lineal", () => {
    close(describeData([1, 2, 3, 4, 5]).p95, 4.8);
  });
});

describe("intervalos de confianza (95%)", () => {
  it("media t", () => {
    const ci = meanT(sA, 0.95);
    close(ci.lower, 10.073514);
    close(ci.upper, 17.926486);
  });
  it("varianza", () => {
    const ci = varianceCI(sA, 0.95);
    close(ci.lower, 3.589605);
    close(ci.upper, 82.57322);
  });
  it("desviación", () => {
    const ci = sdCI(sA, 0.95);
    close(ci.lower, 1.894625);
    close(ci.upper, 9.086981);
  });
  it("razón de varianzas y elección agrupado", () => {
    const ci = varianceRatioCI(sA, sB, 0.95);
    close(ci.lower, 0.104118);
    close(ci.upper, 9.60453);
    const cmp = compareMeans(sA, sB, 0.95);
    expect(cmp.equalVariances).toBe(true);
    expect(cmp.chosen.kind).toBe("diff-means-pooled");
  });
  it("diferencia de medias agrupado y Welch", () => {
    for (const ci of [diffMeansPooled(sA, sB, 0.95), diffMeansWelch(sA, sB, 0.95)]) {
      close(ci.lower, -14.612008);
      close(ci.upper, -5.387992);
    }
    close(diffMeansWelch(sA, sB, 0.95).df as number, 8);
  });
  it("proporción", () => {
    const ci = proportionCI(20, 100, 0.95);
    close(ci.lower, 0.121601);
    close(ci.upper, 0.278399);
    expect(ci.warnings).toHaveLength(0);
  });
  it("proporción: advertencia y recorte a [0, 1]", () => {
    const ci = proportionCI(1, 20, 0.95);
    expect(ci.warnings.length).toBe(1);
    expect(ci.lower).toBeGreaterThanOrEqual(0);
    expect(proportionCI(20, 20, 0.95).upper).toBeLessThanOrEqual(1);
  });
  it("diferencia de proporciones", () => {
    const ci = diffProportionsCI(20, 100, 10, 100, 0.95);
    close(ci.lower, 0.002002);
    close(ci.upper, 0.197998);
  });
  it("Welch con varianzas distintas (gl no entero)", () => {
    const X = describeData([100, 120, 110, 130, 90, 105]);
    const Y = describeData([150, 170, 140, 200, 160, 180, 155]);
    const ci = diffMeansWelch(X, Y, 0.95);
    close(ci.estimate, -55.833333);
    close(ci.df as number, 10.680473);
    close(ci.lower, -77.063297);
    close(ci.upper, -34.60337);
  });
  it("advertencias de normalidad", () => {
    const skewed = describeData([1, 1, 1, 2, 10]);
    expect(varianceCI(skewed, 0.95).warnings.length).toBe(1);
    expect(meanT(skewed, 0.95).warnings.length).toBe(1);
    expect(varianceCI(sA, 0.95).warnings.length).toBe(0);
  });
});

describe("tamaño de muestra", () => {
  it("media", () => {
    const r = sampleSizeMean(50, 10, 0.95);
    expect(r.raw).toBeCloseTo(96.04, 1); // la especificación redondea a 2 decimales
    expect(r.n).toBe(97);
  });
  it("proporción", () => {
    const r = sampleSizeProportion(0.5, 0.05, 0.95);
    expect(r.raw).toBeCloseTo(384.15, 1);
    expect(r.n).toBe(385);
  });
  it("población finita", () => {
    const r = sampleSizeProportion(0.5, 0.05, 0.95, 1000);
    expect(r.nFinite).toBeLessThan(r.n);
  });
});

describe("remuestreo", () => {
  const data = [100, 110, 120, 130, 400, 90, 105];
  it("es reproducible con la misma semilla", () => {
    expect(resampleMeans(data, 10, 50, 42)).toEqual(resampleMeans(data, 10, 50, 42));
    expect(resampleMeans(data, 10, 50, 42)).not.toEqual(resampleMeans(data, 10, 50, 43));
  });
  it("las medias se concentran alrededor de x̄", () => {
    const means = resampleMeans(data, 50, 2000, 1);
    const m = means.reduce((a, b) => a + b, 0) / means.length;
    expect(Math.abs(m - describeData(data).mean)).toBeLessThan(3);
  });
  it("histograma suma n", () => {
    const h = histogram(data, 5);
    expect(h.reduce((a, b) => a + b.count, 0)).toBe(data.length);
  });
});

describe("recomendación", () => {
  const ci = (lower: number, upper: number) => ({
    kind: "diff-means-welch" as const,
    confidence: 0.95,
    estimate: (lower + upper) / 2,
    lower,
    upper,
    criticalValue: 2,
    warnings: [],
  });
  it("gana A si la diferencia es negativa", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: ci(-20, -5), diffSla: ci(-1, 1), varianceRatio: ci(0.5, 2) });
    expect(r.winner).toBe("A");
  });
  it("desempata por SLA", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: ci(-5, 5), diffSla: ci(0.1, 0.2), varianceRatio: ci(0.5, 2) });
    expect(r.winner).toBe("B");
    expect(r.criterion).toBe("sla");
  });
  it("sin evidencia", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: ci(-5, 5), diffSla: ci(-1, 1), varianceRatio: ci(0.5, 2) });
    expect(r.winner).toBeNull();
  });
});
