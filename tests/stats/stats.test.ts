import { describe, expect, it } from "vitest";
import {
  describe as describeData,
  diffMeansCI,
  diffMeansDistribution,
  diffProportionsCI,
  histogram,
  meanCI,
  meanDistribution,
  pooledVariance,
  proportionCI,
  recommend,
  resampleMeans,
  sampleSizeMean,
  sampleSizeProportion,
  summaryFromSums,
  tQ,
  zQ,
  type ConfidenceInterval,
} from "@/lib/stats";

const close = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThan(1e-3);

const A = [10, 12, 14, 16, 18];
const B = [20, 22, 24, 26, 28];
const sA = describeData(A);
const sB = describeData(B);

describe("cuantiles", () => {
  it("zQ", () => {
    close(zQ(0.95), 1.644854);
    close(zQ(0.975), 1.959964);
    close(zQ(0.99), 2.326348);
    close(zQ(0.995), 2.575829);
  });
  it("tQ", () => {
    close(tQ(0.975, 19), 2.093024);
    close(tQ(0.995, 14), 2.976843);
    close(tQ(0.975, 25), 2.059539);
    close(tQ(0.975, 4), 2.776445);
    close(tQ(0.975, 8), 2.306004);
  });
});

describe("descriptivos", () => {
  it("muestra A", () => {
    close(sA.mean, 14);
    close(sA.variance, 10);
    close(sA.sd, 3.162278);
    close(sA.sum, 70);
    close(sA.sumSq, 1020);
    close(sA.ss, 40);
    expect(sA.min).toBe(10);
    expect(sA.max).toBe(18);
    expect(sA.median).toBe(14);
    expect(Math.abs(sA.skewness)).toBeLessThan(1e-3);
  });
  it("ss/(n − 1) coincide con la varianza", () => {
    close(sA.ss / (sA.n - 1), sA.variance);
    const d = describeData([3.2, 8.1, 5.5, 9.9, 1.4, 7.3]);
    close(d.ss / (d.n - 1), d.variance);
  });
  it("n = 0", () => {
    const d = describeData([]);
    expect(d.sum).toBe(0);
    expect(d.sumSq).toBe(0);
    expect(d.ss).toBeNaN();
  });
  it("asimetría positiva (descriptivo)", () => {
    expect(describeData([1, 1, 1, 2, 10]).skewness).toBeGreaterThan(1);
  });
  it("percentil 95 con interpolación lineal", () => {
    close(describeData([1, 2, 3, 4, 5]).p95, 4.8);
  });
});

describe("regla de la distribución", () => {
  it("una media: bordes n = 29 / 30", () => {
    expect(meanDistribution(29, false)).toBe("t");
    expect(meanDistribution(30, false)).toBe("z");
    expect(meanDistribution(5, true)).toBe("z");
  });
  it("dos medias: bordes n = 29 / 30", () => {
    expect(diffMeansDistribution(29, 100, false)).toBe("t");
    expect(diffMeansDistribution(100, 29, false)).toBe("t");
    expect(diffMeansDistribution(30, 30, false)).toBe("z");
    expect(diffMeansDistribution(5, 5, true)).toBe("z");
  });
});

describe("IC de la media", () => {
  it("A (n = 5 < 30 → t, gl = 4)", () => {
    const ci = meanCI(sA, 0.95);
    expect(ci.kind).toBe("mean-t");
    expect(ci.distribution).toBe("t");
    expect(ci.df).toBe(4);
    close(ci.lower, 10.073514);
    close(ci.upper, 17.926486);
    expect(ci.warnings).toEqual([]);
  });

  it("C1 · σ conocida", () => {
    const ci = meanCI({ n: 30, mean: 780, variance: NaN }, 0.95, 40);
    expect(ci.kind).toBe("mean-z-sigma");
    expect(ci.df).toBeUndefined();
    close(ci.standardError, 7.302967);
    close(ci.margin, 14.313553);
    close(ci.lower, 765.686447);
    close(ci.upper, 794.313553);
  });

  it("C2 · días sin accidentes (n = 20 → t, gl = 19)", () => {
    const s = summaryFromSums(20, 873, 39217);
    close(s.mean, 43.65);
    close(s.variance, 58.45);
    close(Math.sqrt(s.variance), 7.64526);
    const ci = meanCI(s, 0.95);
    expect(ci.kind).toBe("mean-t");
    expect(ci.df).toBe(19);
    close(ci.criticalValue, 2.093024);
    close(ci.standardError, 1.709532);
    close(ci.margin, 3.578092);
    close(ci.lower, 40.071908);
    close(ci.upper, 47.228092);
  });

  it("C3 · tiempo de respuesta (n = 15 → t, 99 %)", () => {
    const s = summaryFromSums(15, 3218, 693666);
    close(s.mean, 214.533333);
    close(s.variance, 235.552381);
    close(Math.sqrt(s.variance), 15.347716);
    const ci = meanCI(s, 0.99);
    expect(ci.kind).toBe("mean-t");
    expect(ci.df).toBe(14);
    close(ci.criticalValue, 2.976843);
    close(ci.standardError, 3.962763);
    close(ci.margin, 11.796523);
    close(ci.lower, 202.736811);
    close(ci.upper, 226.329856);
  });

  it("n ≥ 30 con σ desconocida usa Z con s", () => {
    const ci = meanCI({ n: 100, mean: 90.512, variance: 1934.1946 }, 0.95);
    expect(ci.kind).toBe("mean-z");
    expect(ci.distribution).toBe("z");
    expect(ci.df).toBeUndefined();
    close(ci.criticalValue, 1.959964);
    close(ci.standardError, 4.3979);
  });
});

describe("IC de una proporción", () => {
  it("C4 · EPP (123/150, 95 %)", () => {
    const ci = proportionCI(123, 150, 0.95);
    expect(ci.conditionMet).toBe(true);
    close(ci.estimate, 0.82);
    close(ci.standardError, 0.031369);
    close(ci.margin, 0.061482);
    close(ci.lower, 0.758518);
    close(ci.upper, 0.881482);
  });
  it("C5 · fallos (34/400, 99 %)", () => {
    const ci = proportionCI(34, 400, 0.99);
    close(ci.standardError, 0.013944);
    close(ci.margin, 0.035918);
    close(ci.lower, 0.049082);
    close(ci.upper, 0.120918);
  });
  it("C6 · 10/200 (95 %)", () => {
    const ci = proportionCI(10, 200, 0.95);
    close(ci.standardError, 0.015411);
    close(ci.margin, 0.030205);
    close(ci.lower, 0.019795);
    close(ci.upper, 0.080205);
  });
  it("20/100 (95 %)", () => {
    const ci = proportionCI(20, 100, 0.95);
    close(ci.lower, 0.121601);
    close(ci.upper, 0.278399);
    expect(ci.conditionMet).toBe(true);
    expect(ci.warnings).toHaveLength(0);
  });
  it("la condición n·p̂ ≥ 5 y n·q̂ ≥ 5 incluye el borde", () => {
    expect(proportionCI(5, 100, 0.95).conditionMet).toBe(true);
    expect(proportionCI(95, 100, 0.95).conditionMet).toBe(true);
    expect(proportionCI(4, 100, 0.95).conditionMet).toBe(false);
  });
  it("no se cumple la condición: aviso exacto y recorte a [0, 1]", () => {
    const ci = proportionCI(2, 100, 0.95);
    expect(ci.conditionMet).toBe(false);
    expect(ci.warnings).toEqual([
      "No se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5: no se puede usar la distribución normal, así que este intervalo no aplica.",
    ]);
    close(ci.lower, 0);
    close(ci.upper, 0.0474);
    expect(proportionCI(20, 20, 0.95).upper).toBeLessThanOrEqual(1);
  });
});

describe("IC de la diferencia de medias", () => {
  it("C7 · σ conocidas (90 %)", () => {
    const ci = diffMeansCI(
      { n: 10, mean: 87.6, variance: NaN },
      { n: 12, mean: 74.5, variance: NaN },
      0.9,
      [1.0, 1.5],
    );
    expect(ci.kind).toBe("diff-means-z-sigma");
    close(ci.estimate, 13.1);
    close(ci.standardError, 0.53619);
    close(ci.margin, 0.881955);
    close(ci.lower, 12.218045);
    close(ci.upper, 13.981955);
  });
  it("C8 · Problema 2.2 (σ conocidas, 98 %)", () => {
    const ci = diffMeansCI(
      { n: 60, mean: 125, variance: NaN },
      { n: 70, mean: 134, variance: NaN },
      0.98,
      [20, 25],
    );
    expect(ci.kind).toBe("diff-means-z-sigma");
    close(ci.criticalValue, 2.326348);
    close(ci.standardError, 3.949081);
    close(ci.margin, 9.186935);
    close(ci.lower, -18.186935);
    close(ci.upper, 0.186935);
  });
  it("C9 · Problema 3.1 (t con Sp, gl = 25)", () => {
    const a = { n: 15, mean: 1240, variance: 85 ** 2 };
    const b = { n: 12, mean: 1180, variance: 92 ** 2 };
    close(pooledVariance(a, b), 7770.16);
    const ci = diffMeansCI(a, b, 0.95);
    expect(ci.kind).toBe("diff-means-pooled");
    expect(ci.distribution).toBe("t");
    expect(ci.df).toBe(25);
    close(ci.criticalValue, 2.059539);
    close(ci.standardError, 34.139772);
    close(ci.margin, 70.312176);
    close(ci.lower, -10.312176);
    close(ci.upper, 130.312176);
  });
  it("A − B (muestras pequeñas → t con Sp, gl = 8)", () => {
    const ci = diffMeansCI(sA, sB, 0.95);
    expect(ci.kind).toBe("diff-means-pooled");
    expect(ci.df).toBe(8);
    close(ci.lower, -14.612008);
    close(ci.upper, -5.387992);
  });
  it("n₁, n₂ ≥ 30 → Z con s₁², s₂²", () => {
    const a = { n: 100, mean: 90.5120, variance: 1934.1946 };
    const b = { n: 100, mean: 234.2103, variance: 5360.0936 };
    const ci = diffMeansCI(a, b, 0.95);
    expect(ci.kind).toBe("diff-means-z");
    expect(ci.df).toBeUndefined();
    close(ci.standardError, 8.5407);
    close(ci.lower, -160.4377);
    close(ci.upper, -126.9589);
  });
  it("una muestra pequeña basta para usar t con Sp", () => {
    const ci = diffMeansCI({ n: 29, mean: 10, variance: 4 }, { n: 100, mean: 12, variance: 4 }, 0.95);
    expect(ci.kind).toBe("diff-means-pooled");
    expect(ci.df).toBe(127);
  });
});

describe("IC de la diferencia de proporciones", () => {
  it("C10 · 75/1000 vs. 80/2500 (90 %)", () => {
    const ci = diffProportionsCI(75, 1000, 80, 2500, 0.9);
    close(ci.estimate, 0.043);
    close(ci.standardError, 0.009042);
    close(ci.margin, 0.014873);
    close(ci.lower, 0.028127);
    close(ci.upper, 0.057873);
    expect(ci.conditionMet).toBe(true);
  });
  it("C11 · Problema 1.2 (15/250 vs. 8/300, 99 %)", () => {
    const ci = diffProportionsCI(15, 250, 8, 300, 0.99);
    close(ci.estimate, 0.033333);
    close(ci.standardError, 0.017667);
    close(ci.margin, 0.045507);
    close(ci.lower, -0.012174);
    close(ci.upper, 0.07884);
    expect(ci.conditionMet).toBe(true);
  });
  it("20/100 − 10/100 (95 %)", () => {
    const ci = diffProportionsCI(20, 100, 10, 100, 0.95);
    close(ci.lower, 0.002002);
    close(ci.upper, 0.197998);
  });
  it("aviso genérico si falla la condición en algún grupo", () => {
    const ci = diffProportionsCI(2, 100, 5, 100, 0.95);
    expect(ci.conditionMet).toBe(false);
    expect(ci.warnings).toEqual(["En alguno de los grupos no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5."]);
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
  const ci = (lower: number, upper: number): ConfidenceInterval => ({
    kind: "diff-means-z",
    distribution: "z",
    confidence: 0.95,
    estimate: (lower + upper) / 2,
    lower,
    upper,
    margin: (upper - lower) / 2,
    standardError: 1,
    criticalValue: 2,
    warnings: [],
  });
  it("gana A por la media si la diferencia es negativa", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: ci(-20, -5), diffSla: ci(-1, 1) });
    expect(r.winner).toBe("A");
    expect(r.criterion).toBe("media");
  });
  it("gana B por la media si la diferencia es positiva", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: ci(5, 20), diffSla: ci(-1, 1) });
    expect(r).toMatchObject({ winner: "B", criterion: "media" });
  });
  it("si la media contiene 0, decide el SLA", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: ci(-5, 5), diffSla: ci(0.1, 0.2) });
    expect(r).toMatchObject({ winner: "B", criterion: "sla" });
  });
  it("el 0 en el borde cuenta como contenido", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: ci(-5, 0), diffSla: ci(0, 0.2) });
    expect(r.winner).toBeNull();
  });
  it("sin evidencia", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: ci(-5, 5), diffSla: ci(-1, 1) });
    expect(r.winner).toBeNull();
    expect(r.criterion).toBeNull();
  });
});
