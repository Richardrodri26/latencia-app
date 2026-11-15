import type { Explanation, ExplanationStep } from "@/lib/ciText";
import type { Alternative, DiffMeansTest, Summary } from "@/lib/stats";

/** Textos de la prueba de hipótesis (solo presentación). Subíndices con `_{…}` o `_A`/`_B` (MathText). */

export const alternativeSymbol: Record<Alternative, "<" | ">" | "≠"> = {
  menor: "<",
  mayor: ">",
  distinto: "≠",
};

export const alternativeLabel: Record<Alternative, string> = {
  menor: "Unilateral a la izquierda (H₁: <)",
  mayor: "Unilateral a la derecha (H₁: >)",
  distinto: "Bilateral (H₁: ≠)",
};

const alternativeName: Record<Alternative, string> = {
  menor: "unilateral a la izquierda",
  mayor: "unilateral a la derecha",
  distinto: "bilateral",
};

/** Valores Z de la tabla de clase (α → unilateral / bilateral). */
const TABLE_Z: Record<string, { one: string; two: string }> = {
  "0.01": { one: "2.326", two: "2.575" },
  "0.05": { one: "1.645", two: "1.96" },
  "0.1": { one: "1.282", two: "1.645" },
};

const minus = (s: string) => s.replace(/-/g, "−");
const f2 = (x: number) => minus(x.toFixed(2));
const f4 = (x: number) => minus(x.toFixed(4));
/** Número con hasta 4 decimales, sin ceros sobrantes. */
const num = (x: number) => minus(String(Number(x.toFixed(4))));
const step = (k: number, name: string, text: string): ExplanationStep => ({
  title: `Paso ${k} · ${name}`,
  text,
});

/** «< 0.0001» o 4 decimales. */
export function formatPValue(p: number): string {
  return p < 0.0001 ? "< 0.0001" : p.toFixed(4);
}

function formulaOf(test: DiffMeansTest): string {
  if (test.kind === "diff-means-pooled") {
    return "t = [(x̄_A − x̄_B) − δ₀] / [Sp·√(1/n_A + 1/n_B)],  gl = n_A + n_B − 2";
  }
  const sd = test.kind === "diff-means-z-sigma" ? "σ" : "s";
  return `Z = [(x̄_A − x̄_B) − δ₀] / √(${sd}_A²/n_A + ${sd}_B²/n_B)`;
}

function variantStep(test: DiffMeansTest, a: Summary, b: Summary): ExplanationStep {
  const numerator = test.estimate - test.delta0;
  const head = `[(${f2(a.mean)} − ${f2(b.mean)}) − (${f2(test.delta0)})]`;
  const tail = `${f2(numerator)}/${f4(test.standardError)} = ${f4(test.statistic)}.`;

  if (test.kind === "diff-means-pooled") {
    const sp2 = test.pooledVariance ?? NaN;
    return step(
      3,
      "Variante estadística",
      `Como σ_A y σ_B son desconocidas y hay muestras pequeñas (n_A = ${a.n}, n_B = ${b.n}), se usa la t de Student con varianza agrupada (se supone σ_A = σ_B, como en los apuntes).\n` +
        `Sp² = [(${a.n} − 1)·${f2(a.variance)} + (${b.n} − 1)·${f2(b.variance)}]/(${a.n} + ${b.n} − 2) = ${f2(sp2)}; gl = ${test.df}.\n` +
        `t = ${head} / [√${f2(sp2)}·√(1/${a.n} + 1/${b.n})] = ${tail}`,
    );
  }
  if (test.kind === "diff-means-z-sigma") {
    return step(
      3,
      "Variante estadística",
      `Como σ_A y σ_B son conocidas, se usa la distribución normal Z.\n` +
        `Z = ${head} / √(σ_A²/${a.n} + σ_B²/${b.n}) = ${tail}`,
    );
  }
  return step(
    3,
    "Variante estadística",
    `Como σ_A y σ_B son desconocidas y n_A = ${a.n} ≥ 30, n_B = ${b.n} ≥ 30, se usa Z con s en lugar de σ.\n` +
      `Z = ${head} / √(${f2(a.variance)}/${a.n} + ${f2(b.variance)}/${b.n}) = ${tail}`,
  );
}

function criticalLines(test: DiffMeansTest): string[] {
  const table = test.distribution === "z" ? TABLE_Z[String(test.alpha)] : undefined;
  const ref = table ? (test.alternative === "distinto" ? table.two : table.one) : undefined;
  const lines: string[] = [];
  if (test.pci !== undefined) {
    lines.push(`P.C.I. = ${f4(test.pci)}${ref ? ` (tabla: −${ref})` : ""}`);
  }
  if (test.pcs !== undefined) {
    lines.push(`P.C.S. = ${f4(test.pcs)}${ref ? ` (tabla: ${ref})` : ""}`);
  }
  return lines;
}

function zoneLine(test: DiffMeansTest): string {
  const v = f4(test.statistic);
  const verdict = test.inCriticalRegion
    ? "la variante cae en la R.C. → se rechaza H₀."
    : "la variante cae en la Z.A. → se acepta H₀.";
  const pci = test.pci !== undefined ? f4(test.pci) : "";
  const pcs = test.pcs !== undefined ? f4(test.pcs) : "";
  if (test.alternative === "menor") return `${v} ${test.inCriticalRegion ? "≤" : ">"} ${pci} → ${verdict}`;
  if (test.alternative === "mayor") return `${v} ${test.inCriticalRegion ? "≥" : "<"} ${pcs} → ${verdict}`;
  if (!test.inCriticalRegion) return `${pci} < ${v} < ${pcs} → ${verdict}`;
  return `${v} ${test.statistic <= (test.pci ?? NaN) ? `≤ ${pci}` : `≥ ${pcs}`} → ${verdict}`;
}

function pValueLine(test: DiffMeansTest): string {
  const sym = test.distribution === "z" ? "Z" : "t";
  const v = f4(test.statistic);
  const prob =
    test.alternative === "menor"
      ? `P(${sym} ≤ ${v})`
      : test.alternative === "mayor"
        ? `P(${sym} ≥ ${v})`
        : `2·P(${sym} ≥ |${v}|)`;
  const p = test.pValue < 0.0001 ? "< 0.0001" : `= ${test.pValue.toFixed(4)}`;
  const rel = test.pValue <= test.alpha ? "≤" : ">";
  const verdict = test.pValue <= test.alpha ? "se rechaza H₀" : "se acepta H₀";
  return `p-valor = ${prob} ${p} ${rel} ${num(test.alpha)} → ${verdict}.`;
}

/** Fórmula y los 4 pasos de clase con sustitución numérica. */
export function explainDiffMeansTest(test: DiffMeansTest, a: Summary, b: Summary): Explanation {
  const d0 = num(test.delta0);
  const sym = alternativeSymbol[test.alternative];
  return {
    formula: formulaOf(test),
    steps: [
      step(
        1,
        "Plantear las hipótesis",
        `H₀: μ_A − μ_B = ${d0}; H₁: μ_A − μ_B ${sym} ${d0} (prueba ${alternativeName[test.alternative]}).`,
      ),
      step(2, "Nivel de significancia", `α = ${num(test.alpha * 100)} % = ${num(test.alpha)}.`),
      variantStep(test, a, b),
      step(
        4,
        "Decisión",
        [...criticalLines(test), zoneLine(test), pValueLine(test)].join("\n"),
      ),
    ],
  };
}

function claim(test: DiffMeansTest, nameA: string, nameB: string): string {
  const d0 = num(test.delta0);
  if (test.delta0 === 0) {
    const rel = {
      menor: "es menor que el de",
      mayor: "es mayor que el de",
      distinto: "es distinto del de",
    }[test.alternative];
    return `el tiempo medio de respuesta de ${nameA} ${rel} ${nameB}`;
  }
  const rel = { menor: "es menor que", mayor: "es mayor que", distinto: "es distinta de" }[test.alternative];
  return `la diferencia de tiempos medios μ_A − μ_B ${rel} ${d0} ms`;
}

/** Conclusión con la redacción de clase: «se acepta H₀» / «se rechaza H₀». */
export function concludeDiffMeansTest(test: DiffMeansTest, nameA: string, nameB: string): string {
  const alpha = num(test.alpha * 100);
  const text = claim(test, nameA, nameB);
  if (test.decision === "rechaza") {
    return `Se rechaza H₀. Con α = ${alpha}%, hay evidencia de que ${text}.`;
  }
  return `Se acepta H₀. Con α = ${alpha}%, no hay evidencia para afirmar que ${text}; se acepta que μ_A − μ_B = ${num(test.delta0)} ms.`;
}
