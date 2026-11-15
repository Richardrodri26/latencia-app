import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import {
  alternativeLabel,
  alternativeSymbol,
  concludeDiffMeansTest,
  explainDiffMeansTest,
  formatPValue,
} from "@/lib/hypothesisText";
import { computeResults } from "@/lib/results";
import { DEFAULT_HYPOTHESIS, hypothesisFormSchema } from "@/lib/schemas";
import { diffMeansTest, type Alternative } from "@/lib/stats";

const { valid } = parseCsv(readFileSync(join(process.cwd(), "public", "data", "respaldo.csv"), "utf-8"));
const r = computeResults(valid, "principal", 0.95, 300, "API A", "API B");
const run = (delta0: number, alternative: Alternative, alpha = 0.05) =>
  diffMeansTest({ a: r.a.descriptive, b: r.b.descriptive, delta0, alternative, alpha });
const steps = (t: ReturnType<typeof run>) =>
  explainDiffMeansTest(t, r.a.descriptive, r.b.descriptive).steps.map((s) => s.title + "\n" + s.text);

describe("textos de la prueba (R1, izquierda, δ₀ = 0)", () => {
  const t = run(0, "menor");
  const ex = explainDiffMeansTest(t, r.a.descriptive, r.b.descriptive);
  const [s1, s2, s3, s4] = steps(t);

  it("fórmula y 4 pasos", () => {
    expect(ex.formula).toBe("Z = [(x̄_A − x̄_B) − δ₀] / √(s_A²/n_A + s_B²/n_B)");
    expect(ex.steps).toHaveLength(4);
    expect(s1).toContain("Paso 1 · Plantear las hipótesis");
    expect(s1).toContain("H₁: μ_A − μ_B < 0");
    expect(s1).toContain("unilateral a la izquierda");
    expect(s2).toContain("α = 5 % = 0.05.");
    expect(s3).toContain("n_A = 100 ≥ 30");
    expect(s3).toContain("Z = [(90.51 − 234.21) − (0.00)]");
    expect(s3).toContain("−16.8252");
    expect(s4).toContain("P.C.I. = −1.6449 (tabla: −1.645)");
    expect(s4).toContain("cae en la R.C.");
    expect(s4).toContain("se rechaza H₀");
    expect(s4).toContain("< 0.0001");
  });

  it("conclusión", () => {
    expect(concludeDiffMeansTest(t, "API A", "API B")).toBe(
      "Se rechaza H₀. Con α = 5%, hay evidencia de que el tiempo medio de respuesta de API A es menor que el de API B.",
    );
  });
});

describe("textos de la prueba (R3, bilateral, δ₀ = −150)", () => {
  const t = run(-150, "distinto");
  const [, , , s4] = steps(t);
  it("Z.A. y se acepta H₀", () => {
    expect(s4).toContain("cae en la Z.A.");
    expect(s4).toContain("se acepta H₀");
    expect(s4).toContain("0.4606");
    expect(s4).toContain("P.C.S. = 1.9600 (tabla: 1.96)");
    expect(concludeDiffMeansTest(t, "API A", "API B")).toBe(
      "Se acepta H₀. Con α = 5%, no hay evidencia para afirmar que la diferencia de tiempos medios μ_A − μ_B es distinta de −150 ms; se acepta que μ_A − μ_B = −150 ms.",
    );
  });
});

describe("R4 (δ₀ = −100, izquierda)", () => {
  it("conclusión", () => {
    expect(concludeDiffMeansTest(run(-100, "menor"), "API A", "API B")).toBe(
      "Se rechaza H₀. Con α = 5%, hay evidencia de que la diferencia de tiempos medios μ_A − μ_B es menor que −100 ms.",
    );
  });
});

describe("rama t", () => {
  const A = { n: 15, mean: 1240, variance: 85 ** 2 };
  const B = { n: 12, mean: 1180, variance: 92 ** 2 };
  const t = diffMeansTest({ a: A, b: B, delta0: 0, alternative: "mayor", alpha: 0.05 });
  const ex = explainDiffMeansTest(t, A, B);
  it("muestra Sp², gl y el supuesto σ_A = σ_B", () => {
    expect(ex.formula).toContain("gl = n_A + n_B − 2");
    const s3 = ex.steps[2].text;
    expect(s3).toContain("se supone σ_A = σ_B");
    expect(s3).toContain("Sp² = [(15 − 1)·7225.00 + (12 − 1)·8464.00]/(15 + 12 − 2) = 7770.16; gl = 25.");
    expect(s3).toContain("1.7575");
    expect(ex.steps[3].text).toContain("P(t ≥ 1.7575)");
  });
});

describe("redacción de clase", () => {
  it("ningún texto dice «no se rechaza» ni habla de errores tipo I/II o potencia", () => {
    const all: string[] = [];
    for (const alt of ["menor", "mayor", "distinto"] as const) {
      for (const d0 of [0, -150, 20]) {
        const t = run(d0, alt);
        all.push(...steps(t), concludeDiffMeansTest(t, "API A", "API B"));
      }
    }
    const joined = all.join("\n").toLowerCase();
    for (const w of ["no se rechaza", "error tipo", "potencia"]) expect(joined).not.toContain(w);
  });
  it("etiquetas, símbolos y formato del p-valor", () => {
    expect(alternativeSymbol.distinto).toBe("≠");
    expect(alternativeLabel.menor).toBe("Unilateral a la izquierda (H₁: <)");
    expect(formatPValue(0.00001)).toBe("< 0.0001");
    expect(formatPValue(0.460605)).toBe("0.4606");
  });
});

describe("hypothesisFormSchema", () => {
  it("acepta el valor por defecto", () => {
    expect(hypothesisFormSchema.safeParse(DEFAULT_HYPOTHESIS).success).toBe(true);
  });
  it("rechaza α = 0.02, δ₀ = NaN y una alternativa desconocida", () => {
    expect(hypothesisFormSchema.safeParse({ ...DEFAULT_HYPOTHESIS, alpha: 0.02 }).success).toBe(false);
    expect(hypothesisFormSchema.safeParse({ ...DEFAULT_HYPOTHESIS, delta0: NaN }).success).toBe(false);
    expect(hypothesisFormSchema.safeParse({ ...DEFAULT_HYPOTHESIS, alternative: "otra" }).success).toBe(false);
    expect(hypothesisFormSchema.safeParse({ ...DEFAULT_HYPOTHESIS, delta0: 20000 }).success).toBe(false);
  });
});
