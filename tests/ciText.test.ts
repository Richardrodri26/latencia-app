import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classTableZ,
  explainDiffMeans,
  explainDiffProportions,
  explainMean,
  explainProportion,
} from "@/lib/ciText";
import { parseCsv } from "@/lib/csv";
import { computeResults } from "@/lib/results";
import { describe as describeData, diffMeansCI, meanCI, proportionCI } from "@/lib/stats";

const { valid } = parseCsv(readFileSync(join(process.cwd(), "public", "data", "respaldo.csv"), "utf-8"));
const r = computeResults(valid, "principal", 0.95, 300, "API A", "API B");
const all = (e: { steps: { text: string }[] }) => e.steps.map((s) => s.text).join("\n");

describe("classTableZ", () => {
  it("valores de la tabla de clase", () => {
    expect(classTableZ(0.9)).toBe("1.645");
    expect(classTableZ(0.95)).toBe("1.96");
    expect(classTableZ(0.98)).toBe("2.326");
    expect(classTableZ(0.99)).toBe("2.576");
    expect(classTableZ(0.85)).toBeNull();
  });
});

describe("explainMean", () => {
  it("respaldo A principal (Z con s): 3 pasos generados", () => {
    const ex = explainMean(r.a.mean!, r.a.descriptive);
    const text = all(ex);
    expect(ex.steps).toHaveLength(3);
    expect(ex.steps.map((s) => s.title)).toEqual([
      "Paso 1 · Media muestral",
      "Paso 2 · Desviación estándar muestral",
      "Paso 3 · Intervalo de confianza",
    ]);
    expect(ex.formula).toBe("(x̄ − Z_{α/2}·s/√n ≤ μ ≤ x̄ + Z_{α/2}·s/√n) = (1 − α)100 %");
    expect(text).toContain("x̄ = Σx/n = 9051.20/100 = 90.51");
    expect(text).toContain("Como σ es desconocida y n ≥ 30, se usa la distribución normal Z con s en lugar de σ");
    expect(text).toContain("Z_{α/2} = 1.9600 (tabla: 1.96)");
    expect(text).toContain("Error estándar = s/√n = 43.98/√100 = 4.3979");
    expect(text).toContain("E = 1.9600 × 4.3979 = 8.62");
    expect(text).toContain("(81.89 ≤ μ ≤ 99.13) = 95 %");
    expect(text).not.toContain("gl =");
  });

  it("A = [10, …, 18] (t con gl = 4)", () => {
    const d = describeData([10, 12, 14, 16, 18]);
    const text = all(explainMean(meanCI(d, 0.95), d));
    expect(text).toContain("= 1020.00 − 70.00²/5 = 40.00");
    expect(text).toContain("T de Student");
    expect(text).toContain("gl = n − 1 = 4");
    expect(text).toContain("t_{α/2} = 2.7764");
    expect(text).not.toContain("(tabla:");
  });
});

describe("explainProportion", () => {
  it("5/100: 5 pasos generados (el 6 es la interpretación)", () => {
    const ex = explainProportion(proportionCI(5, 100, 0.95), 5, 100);
    expect(ex.steps).toHaveLength(5);
    const text = all(ex);
    expect(text).toContain("p̂ = x/n = 5/100 = 0.0500");
    expect(text).toContain("Sí se cumple");
    expect(text).toContain("SE = √(p̂q̂/n) = √(0.0500 × 0.9500/100) = 0.0218");
    expect(text).toContain("IC 95 % [0.0073 ; 0.0927]");
  });

  it("2/100: se corta en el paso 2 con «no aplica»", () => {
    const ex = explainProportion(proportionCI(2, 100, 0.95), 2, 100);
    expect(ex.steps).toHaveLength(2);
    expect(ex.steps[1].text).toContain("No se cumple: el intervalo no aplica.");
  });
});

describe("explainDiffMeans", () => {
  it("respaldo (Z con s₁², s₂²)", () => {
    const ex = explainDiffMeans(r.comparison!.diffMeans, r.a.descriptive, r.b.descriptive);
    expect(ex.steps).toHaveLength(5);
    const text = all(ex);
    expect(text).toContain("n_A, n_B ≥ 30");
    expect(text).toContain("√(1934.19/100 + 5360.09/100) = 8.5407");
    expect(text).toContain("(−160.44 ≤ μ₁ − μ₂ ≤ −126.96) = 95 %");
  });

  it("muestras pequeñas (t con Sp, gl = 8)", () => {
    const a = describeData([10, 12, 14, 16, 18]);
    const b = describeData([20, 22, 24, 26, 28]);
    const text = all(explainDiffMeans(diffMeansCI(a, b, 0.95), a, b));
    expect(text).toContain("Sp");
    expect(text).toContain("Se supone σ₁ = σ₂, como en los apuntes.");
    expect(text).toContain("gl = n₁ + n₂ − 2 = 5 + 5 − 2 = 8");
  });
});

describe("explainDiffProportions", () => {
  it("4 pasos generados", () => {
    const c = r.comparison!.diffSla;
    const ex = explainDiffProportions(c, r.a.sla.x, r.a.sla.n, r.b.sla.x, r.b.sla.n);
    expect(ex.steps).toHaveLength(4);
    expect(all(ex)).toContain("(−0.0808 ≤ p₁ − p₂ ≤ 0.0208) = 95 %");
  });
});
