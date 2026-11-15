import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import { computeResults } from "@/lib/results";
import type { ConfidenceLevel } from "@/lib/schemas";
import { diffMeansTest, type Alternative } from "@/lib/stats";

const close = (actual: number | undefined, expected: number) =>
  expect(Math.abs((actual ?? NaN) - expected)).toBeLessThan(1e-3);

const { valid, errors } = parseCsv(readFileSync(join(process.cwd(), "public", "data", "respaldo.csv"), "utf-8"));
const compute = (phase: "piloto" | "principal", c: ConfidenceLevel) =>
  computeResults(valid, phase, c, 300, "API A", "API B");

describe("dataset de respaldo (docs/02)", () => {
  it("el CSV se lee completo", () => {
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(272);
  });

  describe("fase principal (n = 100 → Z con s)", () => {
    const r95 = compute("principal", 0.95);

    it("descriptivos", () => {
      expect(r95.a.latencies).toHaveLength(100);
      expect(r95.b.latencies).toHaveLength(100);
      close(r95.a.descriptive.sum, 9051.1986);
      close(r95.a.descriptive.sumSq, 1010727.2239);
      close(r95.a.descriptive.ss, 191485.263);
      close(r95.a.descriptive.mean, 90.512);
      close(r95.a.descriptive.variance, 1934.1946);
      close(r95.a.descriptive.sd, 43.9795);
      close(r95.b.descriptive.mean, 234.2103);
      close(r95.b.descriptive.variance, 5360.0936);
      close(r95.b.descriptive.sd, 73.2127);
      close(r95.a.descriptive.median, 83.7448);
      close(r95.b.descriptive.p95, 248.4669);
      close(r95.a.descriptive.skewness, 6.8592);
      close(r95.b.descriptive.cv, 0.3126);
    });

    it.each([
      [0.9, [83.278, 97.746, 7.234], [222.1678, 246.2527, 12.0424]],
      [0.95, [81.8922, 99.1318, 8.6198], [219.8608, 248.5597, 14.3494]],
      [0.99, [79.1836, 101.8403, 11.3284], [215.3519, 253.0686, 18.8583]],
    ] as const)("IC de la media al %s", (c, a, b) => {
      const r = compute("principal", c);
      expect(r.a.mean?.kind).toBe("mean-z");
      expect(r.a.mean?.df).toBeUndefined();
      close(r.a.mean?.lower, a[0]);
      close(r.a.mean?.upper, a[1]);
      close(r.a.mean?.margin, a[2]);
      close(r.b.mean?.lower, b[0]);
      close(r.b.mean?.upper, b[1]);
      close(r.b.mean?.margin, b[2]);
    });

    it("error estándar", () => {
      close(r95.a.mean?.standardError, 4.3979);
      close(r95.b.mean?.standardError, 7.3213);
    });

    it("proporción que incumple el SLA", () => {
      expect(r95.a.sla).toMatchObject({ x: 2, n: 100 });
      expect(r95.a.sla.ci?.conditionMet).toBe(false);
      close(r95.a.sla.ci?.lower, 0);
      close(r95.a.sla.ci?.upper, 0.0474);
      expect(r95.b.sla).toMatchObject({ x: 5, n: 100 });
      expect(r95.b.sla.ci?.conditionMet).toBe(true);
      close(r95.b.sla.ci?.standardError, 0.02179);
      close(r95.b.sla.ci?.margin, 0.04272);
      close(r95.b.sla.ci?.lower, 0.0073);
      close(r95.b.sla.ci?.upper, 0.0927);
    });

    it("fallos 0/100: no aplica", () => {
      expect(r95.a.failures).toMatchObject({ x: 0, n: 100 });
      expect(r95.b.failures).toMatchObject({ x: 0, n: 100 });
      expect(r95.a.failures.ci?.conditionMet).toBe(false);
      expect(r95.b.failures.ci?.conditionMet).toBe(false);
    });

    it.each([
      [0.9, 14.0481, -157.7464, -129.6501, 0.04261, -0.0726, 0.0126],
      [0.95, 16.7394, -160.4377, -126.9589, 0.05077, -0.0808, 0.0208],
      [0.99, 21.9993, -165.6976, -121.699, 0.06672, -0.0967, 0.0367],
    ] as const)("comparación al %s", (c, e, lo, hi, eP, loP, hiP) => {
      const cmp = compute("principal", c).comparison;
      expect(cmp).not.toBeNull();
      if (!cmp) return;
      expect(cmp.diffMeans.kind).toBe("diff-means-z");
      close(cmp.diffMeans.estimate, -143.6983);
      close(cmp.diffMeans.standardError, 8.5407);
      close(cmp.diffMeans.margin, e);
      close(cmp.diffMeans.lower, lo);
      close(cmp.diffMeans.upper, hi);
      close(cmp.diffSla.estimate, -0.03);
      close(cmp.diffSla.standardError, 0.0259);
      close(cmp.diffSla.margin, eP);
      close(cmp.diffSla.lower, loP);
      close(cmp.diffSla.upper, hiP);
      expect(cmp.diffSla.conditionMet).toBe(false);
      expect(cmp.recommendation).toMatchObject({ winner: "A", criterion: "media" });
    });
  });

  describe("prueba de hipótesis de μ_A − μ_B (docs/06 §5.5, fase principal)", () => {
    const r = compute("principal", 0.95);
    const run = (delta0: number, alternative: Alternative) =>
      diffMeansTest({ a: r.a.descriptive, b: r.b.descriptive, delta0, alternative, alpha: 0.05 });

    it("R1 · izquierda, δ₀ = 0", () => {
      const t = run(0, "menor");
      expect(t.kind).toBe("diff-means-z");
      close(t.standardError, 8.5407);
      close(t.statistic, -16.825194);
      close(t.pci, -1.644854);
      expect(t.pValue).toBeLessThan(1e-4);
      expect(t.inCriticalRegion).toBe(true);
      expect(t.decision).toBe("rechaza");
    });
    it("R2 · bilateral, δ₀ = 0", () => {
      const t = run(0, "distinto");
      close(t.pci, -1.959964);
      close(t.pcs, 1.959964);
      expect(t.pValue).toBeLessThan(1e-4);
      expect(t.decision).toBe("rechaza");
    });
    it("R3 · bilateral, δ₀ = −150", () => {
      const t = run(-150, "distinto");
      close(t.statistic, 0.737851);
      close(t.pValue, 0.460605);
      expect(t.inCriticalRegion).toBe(false);
      expect(t.decision).toBe("acepta");
    });
    it("R4 · izquierda, δ₀ = −100", () => {
      const t = run(-100, "menor");
      close(t.statistic, -5.116497);
      expect(t.pValue).toBeLessThan(1e-4);
      expect(t.decision).toBe("rechaza");
    });
    it("coherencia con el IC 95 % de la diferencia de medias", () => {
      const ci = r.comparison!.diffMeans;
      for (const d of [0, -150, -100, -160.4, -126.9]) {
        const t = run(d, "distinto");
        expect(t.decision === "acepta").toBe(ci.lower <= d && d <= ci.upper);
      }
    });
  });

  describe("fase piloto (n = 30 → Z con s), 95 %", () => {
    const r = compute("piloto", 0.95);
    it("IC de la media y SLA", () => {
      expect(r.a.latencies).toHaveLength(30);
      expect(r.a.mean?.kind).toBe("mean-z");
      close(r.a.descriptive.mean, 78.3964);
      close(r.a.descriptive.sd, 6.4733);
      close(r.a.mean?.lower, 76.08);
      close(r.a.mean?.upper, 80.7128);
      close(r.b.descriptive.mean, 243.5815);
      close(r.b.descriptive.sd, 79.346);
      close(r.b.mean?.lower, 215.1884);
      close(r.b.mean?.upper, 271.9746);
      expect(r.a.sla).toMatchObject({ x: 0, n: 30 });
      expect(r.a.sla.ci?.conditionMet).toBe(false);
      expect(r.b.sla).toMatchObject({ x: 2, n: 30 });
      expect(r.b.sla.ci?.conditionMet).toBe(false);
    });
    it("diferencia de medias", () => {
      close(r.comparison?.diffMeans.estimate, -165.1851);
      close(r.comparison?.diffMeans.standardError, 14.5347);
      close(r.comparison?.diffMeans.lower, -193.6725);
      close(r.comparison?.diffMeans.upper, -136.6977);
    });
  });
});
