import { describe, expect, it } from "vitest";
import { computeResults } from "@/lib/results";
import type { Measurement, Phase, TargetId } from "@/lib/schemas";
import { proportionCI } from "@/lib/stats";

const TOL = 3; // toBeCloseTo(x, 3) ~ 1e-3

let counter = 0;
function row(
  target: TargetId,
  latencyMs: number | null,
  opts: { ok?: boolean; warmup?: boolean; phase?: Phase } = {},
): Measurement {
  const ok = opts.ok ?? true;
  counter++;
  return {
    id: `r-${counter}`,
    runId: "r",
    phase: opts.phase ?? "principal",
    target,
    seq: counter,
    startedAt: "2026-01-01T00:00:00.000Z",
    latencyMs,
    status: ok ? 200 : null,
    ok,
    bytes: ok ? 10 : null,
    error: ok ? null : "network",
    warmup: opts.warmup ?? false,
  };
}

const A = [10, 12, 14, 16, 18];
const B = [20, 22, 24, 26, 28];

function dataset(): Measurement[] {
  return [
    ...A.map((x) => row("A", x)),
    ...B.map((x) => row("B", x)),
    // Calentamiento (ok = true) con latencias absurdas: deben excluirse.
    row("A", 999, { warmup: true }),
    row("B", 999, { warmup: true }),
    // Fallo en calentamiento: no cuenta ni como latencia ni como fallo.
    row("A", null, { ok: false, warmup: true }),
    // Fallo normal de A: no entra a las latencias, sí a la tasa de fallos.
    row("A", null, { ok: false }),
    // Fallo con latencia registrada (p. ej. HTTP 500): tampoco entra a las latencias.
    row("B", 5000, { ok: false }),
    // Otra fase: no debe mezclarse.
    row("A", 1, { phase: "piloto" }),
    row("B", 2, { phase: "piloto" }),
  ];
}

describe("computeResults (pipeline de useResults) con los datos de prueba de la especificación", () => {
  const r = computeResults(dataset(), "principal", 0.95, 15, "API A", "API B");

  it("filtra ok && !warmup y la fase", () => {
    expect(r.a.latencies).toEqual(A);
    expect(r.b.latencies).toEqual(B);
    expect(r.total).toBe(5 + 5 + 3 + 2);
    expect(r.a.latencies).not.toContain(999);
    expect(r.b.latencies).not.toContain(5000);
    expect(r.a.latencies).not.toContain(1);
  });

  it("cuenta los fallos sobre las mediciones sin calentamiento", () => {
    expect(r.a.failures.x).toBe(1);
    expect(r.a.failures.n).toBe(6);
    expect(r.b.failures.x).toBe(1);
    expect(r.b.failures.n).toBe(6);
    const expected = proportionCI(1, 6, 0.95);
    expect(r.a.failures.ci?.lower).toBeCloseTo(expected.lower, 10);
    expect(r.a.failures.ci?.upper).toBeCloseTo(expected.upper, 10);
  });

  it("la proporción SLA usa solo latencias válidas", () => {
    expect(r.a.sla).toMatchObject({ x: 2, n: 5 }); // 16 y 18 > 15
    expect(r.b.sla).toMatchObject({ x: 5, n: 5 });
  });

  it("descriptivos de A", () => {
    expect(r.a.descriptive.mean).toBeCloseTo(14, TOL);
    expect(r.a.descriptive.variance).toBeCloseTo(10, TOL);
    expect(r.a.descriptive.sd).toBeCloseTo(3.162278, TOL);
  });

  it("IC de la media de A (n = 5 < 30 → t)", () => {
    expect(r.a.mean?.kind).toBe("mean-t");
    expect(r.a.mean?.df).toBe(4);
    expect(r.a.mean?.lower).toBeCloseTo(10.073514, TOL);
    expect(r.a.mean?.upper).toBeCloseTo(17.926486, TOL);
    expect(r.a.descriptive.sum).toBeCloseTo(70, TOL);
    expect(r.a.descriptive.ss).toBeCloseTo(40, TOL);
  });

  it("diferencia de medias (t con Sp, gl = 8)", () => {
    const c = r.comparison;
    expect(c).not.toBeNull();
    if (!c) return;
    expect(c.diffMeans.kind).toBe("diff-means-pooled");
    expect(c.diffMeans.df).toBe(8);
    expect(c.diffMeans.lower).toBeCloseTo(-14.612008, TOL);
    expect(c.diffMeans.upper).toBeCloseTo(-5.387992, TOL);
  });

  it("recomienda A (IC de la diferencia de medias solo negativo)", () => {
    expect(r.comparison?.recommendation.winner).toBe("A");
    expect(r.comparison?.recommendation.criterion).toBe("media");
  });

  it("recalcula con otra confianza sin cambiar los datos", () => {
    const r99 = computeResults(dataset(), "principal", 0.99, 15, "API A", "API B");
    expect(r99.a.latencies).toEqual(A);
    expect(r99.a.mean!.upper - r99.a.mean!.lower).toBeGreaterThan(r.a.mean!.upper - r.a.mean!.lower);
  });

  it("sin latencias válidas no hay IC ni comparación", () => {
    const onlyBad = [row("A", 999, { warmup: true }), row("A", null, { ok: false }), row("B", null, { ok: false })];
    const e = computeResults(onlyBad, "principal", 0.95, 15, "A", "B");
    expect(e.a.latencies).toEqual([]);
    expect(e.a.enough).toBe(false);
    expect(e.a.mean).toBeNull();
    expect(e.a.sla.ci).toBeNull();
    expect(e.a.failures).toMatchObject({ x: 1, n: 1 });
    expect(e.comparison).toBeNull();
  });
});
