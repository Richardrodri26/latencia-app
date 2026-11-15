import { minus } from "@/lib/format";
import {
  pooledVariance,
  type ConfidenceInterval,
  type Descriptive,
  type Summary,
} from "@/lib/stats";

/**
 * Textos de fórmula y pasos de clase con sustitución numérica (solo presentación).
 * Las expresiones con subíndice usan `_{…}` (se muestran con `MathText`).
 * El paso de interpretación no se genera aquí: lo agrega la tarjeta con `interpret.ts`.
 */
export type ExplanationStep = { title: string; text: string };
export type Explanation = { formula: string; steps: ExplanationStep[] };

const f2 = (x: number) => minus(x.toFixed(2));
const f4 = (x: number) => minus(x.toFixed(4));
/** Número con hasta 4 decimales, sin ceros sobrantes (α, α/2, n·p̂). */
const num = (x: number) => minus(String(Number(x.toFixed(4))));
const confText = (c: number) => `${Math.round(c * 100)} %`;
const step = (k: number, name: string, text: string): ExplanationStep => ({
  title: `Paso ${k} · ${name}`,
  text,
});

const CLASS_TABLE_Z: Record<string, string> = {
  "0.9": "1.645",
  "0.95": "1.96",
  "0.98": "2.326",
  "0.99": "2.576",
};

/** Valor de Z_{α/2} de la tabla de clase para ese nivel de confianza (o null). */
export function classTableZ(confidence: number): string | null {
  return CLASS_TABLE_Z[String(Number(confidence.toFixed(4)))] ?? null;
}

/** «α = 0.05, α/2 = 0.025, 1 − α/2 = 0.975 → valor de tabla: Z_{α/2} = 1.9600 (tabla: 1.96)» */
function criticalLine(ci: ConfidenceInterval): string {
  const alpha = 1 - ci.confidence;
  const head = `α = ${num(alpha)}, α/2 = ${num(alpha / 2)}, 1 − α/2 = ${num(1 - alpha / 2)} → valor de tabla: `;
  if (ci.distribution === "t") return `${head}t_{α/2} = ${f4(ci.criticalValue)}`;
  const table = classTableZ(ci.confidence);
  return `${head}Z_{α/2} = ${f4(ci.criticalValue)}${table ? ` (tabla: ${table})` : ""}`;
}

const critSymbol = (ci: ConfidenceInterval) => (ci.distribution === "t" ? "t_{α/2}" : "Z_{α/2}");

/** IC de la media: devuelve los pasos 1 a 3 (el 4 es la interpretación, que agrega la tarjeta). */
export function explainMean(ci: ConfidenceInterval, d: Descriptive): Explanation {
  const sigmaKnown = ci.kind === "mean-z-sigma";
  const sym = critSymbol(ci);
  const sdSym = sigmaKnown ? "σ" : "s";
  const formula = `(x̄ − ${sym}·${sdSym}/√n ≤ μ ≤ x̄ + ${sym}·${sdSym}/√n) = (1 − α)100 %`;

  const step1 = step(
    1,
    "Media muestral",
    `x̄ = Σx/n = ${f2(d.sum)}/${d.n} = ${f2(d.mean)} ms`,
  );
  const step2 = step(
    2,
    "Desviación estándar muestral",
    `SS = Σx² − (Σx)²/n = ${f2(d.sumSq)} − ${f2(d.sum)}²/${d.n} = ${f2(d.ss)}\n` +
      `s² = SS/(n − 1) = ${f2(d.ss)}/${d.n - 1} = ${f2(d.variance)}\n` +
      `s = √${f2(d.variance)} = ${f2(d.sd)} ms`,
  );

  const lines: string[] = [];
  if (sigmaKnown) lines.push("Como σ es conocida, se usa la distribución normal Z.");
  else if (ci.distribution === "z") {
    lines.push("Como σ es desconocida y n ≥ 30, se usa la distribución normal Z con s en lugar de σ.");
  } else lines.push("Como σ es desconocida y n < 30, se usa la distribución T de Student.");
  if (ci.df !== undefined) lines.push(`gl = n − 1 = ${ci.df}`);
  lines.push(criticalLine(ci));
  lines.push(
    sigmaKnown
      ? `Error estándar = σ/√n = ${f4(ci.standardError * Math.sqrt(d.n))}/√${d.n} = ${f4(ci.standardError)}`
      : `Error estándar = s/√n = ${f2(d.sd)}/√${d.n} = ${f4(ci.standardError)}`,
  );
  lines.push(
    `Margen de error E = ${sym}·${sdSym}/√n
E = ${f4(ci.criticalValue)} × ${f4(ci.standardError)} = ${f2(ci.margin)}`,
  );
  lines.push(
    `IC = x̄ ± E = ${f2(ci.estimate)} ± ${f2(ci.margin)} → (${f2(ci.lower)} ≤ μ ≤ ${f2(ci.upper)}) = ${confText(ci.confidence)}`,
  );
  const step3 = step(sigmaKnown ? 2 : 3, "Intervalo de confianza", lines.join("\n"));

  return { formula, steps: sigmaKnown ? [step1, step3] : [step1, step2, step3] };
}

/**
 * IC de una proporción: pasos 1 a 5 (el 6 es la interpretación, que agrega la tarjeta).
 * Si no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5 devuelve solo los pasos 1 y 2.
 */
export function explainProportion(ci: ConfidenceInterval, x: number, n: number): Explanation {
  const p = x / n;
  const q = 1 - p;
  const formula = "(p̂ − Z_{α/2}·√(p̂q̂/n) ≤ p ≤ p̂ + Z_{α/2}·√(p̂q̂/n)) = (1 − α)100 %";
  const met = ci.conditionMet !== false;

  const step1 = step(
    1,
    "Proporción muestral",
    `p̂ = x/n = ${x}/${n} = ${f4(p)}\nq̂ = 1 − p̂ = ${f4(q)}`,
  );
  const step2 = step(
    2,
    "Verificar que se puede usar la normal",
    `n·p̂ ≥ 5 y n·q̂ ≥ 5\n${n} × ${f4(p)} = ${num(n * p)}\n${n} × ${f4(q)} = ${num(n * q)}\n` +
      (met ? "Sí se cumple." : "No se cumple: el intervalo no aplica."),
  );
  if (!met) return { formula, steps: [step1, step2] };

  const alpha = 1 - ci.confidence;
  const table = classTableZ(ci.confidence);
  return {
    formula,
    steps: [
      step1,
      step2,
      step(
        3,
        "Valor crítico",
        `${confText(ci.confidence)}, α/2 = ${num(alpha / 2)}, tabla z = ${f4(ci.criticalValue)}${table ? ` (tabla: ${table})` : ""}`,
      ),
      step(
        4,
        "Error estándar",
        `SE = √(p̂q̂/n) = √(${f4(p)} × ${f4(q)}/${n}) = ${f4(ci.standardError)}`,
      ),
      step(
        5,
        "Margen de error e intervalo",
        `E = ${f4(ci.criticalValue)} × ${f4(ci.standardError)} = ${f4(ci.margin)}\n` +
          `IC = ${f4(p)} ± ${f4(ci.margin)} → IC ${confText(ci.confidence)} [${f4(ci.lower)} ; ${f4(ci.upper)}]`,
      ),
    ],
  };
}

/** IC de μ₁ − μ₂ (A − B): pasos 1 a 5 (el 6 es la interpretación, que agrega la tarjeta). */
export function explainDiffMeans(ci: ConfidenceInterval, a: Summary, b: Summary): Explanation {
  const sym = critSymbol(ci);
  const sigmaKnown = ci.kind === "diff-means-z-sigma";
  const pooled = ci.kind === "diff-means-pooled";
  const formula = pooled
    ? `((x̄₁ − x̄₂) − ${sym}·Sp·√(1/n₁ + 1/n₂) ≤ μ₁ − μ₂ ≤ (x̄₁ − x̄₂) + ${sym}·Sp·√(1/n₁ + 1/n₂)) = (1 − α)100 %`
    : `((x̄₁ − x̄₂) − ${sym}·√(${sigmaKnown ? "σ₁²" : "s₁²"}/n₁ + ${sigmaKnown ? "σ₂²" : "s₂²"}/n₂) ≤ μ₁ − μ₂ ≤ (x̄₁ − x̄₂) + ${sym}·√(${sigmaKnown ? "σ₁²" : "s₁²"}/n₁ + ${sigmaKnown ? "σ₂²" : "s₂²"}/n₂)) = (1 − α)100 %`;

  const data = sigmaKnown
    ? `Muestra 1 (A): n₁ = ${a.n}, x̄₁ = ${f2(a.mean)} ms\nMuestra 2 (B): n₂ = ${b.n}, x̄₂ = ${f2(b.mean)} ms`
    : `Muestra 1 (A): n₁ = ${a.n}, x̄₁ = ${f2(a.mean)} ms, s₁² = ${f2(a.variance)}\n` +
      `Muestra 2 (B): n₂ = ${b.n}, x̄₂ = ${f2(b.mean)} ms, s₂² = ${f2(b.variance)}`;
  const step1 = step(1, "Datos de cada API", data);

  const dist: string[] = [];
  if (sigmaKnown) dist.push("Como σ₁ y σ₂ son conocidas, se usa la distribución normal Z.");
  else if (pooled) {
    const sp2 = pooledVariance(a, b);
    dist.push(
      "Como σ₁ y σ₂ son desconocidas y hay muestras pequeñas (n < 30), se usa la distribución T de Student con la desviación estándar agrupada Sp.",
      "Se supone σ₁ = σ₂, como en los apuntes.",
      `gl = n₁ + n₂ − 2 = ${a.n} + ${b.n} − 2 = ${ci.df}`,
      `Sp² = [(n₁ − 1)s₁² + (n₂ − 1)s₂²]/(n₁ + n₂ − 2) = [${a.n - 1} × ${f2(a.variance)} + ${b.n - 1} × ${f2(b.variance)}]/${a.n + b.n - 2} = ${f2(sp2)}`,
      `Sp = √${f2(sp2)} = ${f2(Math.sqrt(sp2))}`,
    );
  } else {
    dist.push(
      "Como σ₁ y σ₂ son desconocidas y n_A, n_B ≥ 30, se usa la distribución normal Z con s₁², s₂² en lugar de σ₁², σ₂².",
    );
  }
  const step2 = step(2, "Distribución", dist.join("\n"));
  const step3 = step(3, "Valor crítico", criticalLine(ci));

  let se: string;
  if (sigmaKnown) {
    se = `Error estándar = √(σ₁²/n₁ + σ₂²/n₂) = ${f4(ci.standardError)}`;
  } else if (pooled) {
    const sp = Math.sqrt(pooledVariance(a, b));
    se = `Error estándar = Sp·√(1/n₁ + 1/n₂) = ${f2(sp)} × √(1/${a.n} + 1/${b.n}) = ${f4(ci.standardError)}`;
  } else {
    se = `Error estándar = √(s₁²/n₁ + s₂²/n₂) = √(${f2(a.variance)}/${a.n} + ${f2(b.variance)}/${b.n}) = ${f4(ci.standardError)}`;
  }
  const step4 = step(4, "Error estándar", se);
  const step5 = step(
    5,
    "Margen de error e intervalo",
    `E = ${sym}·Error estándar = ${f4(ci.criticalValue)} × ${f4(ci.standardError)} = ${f2(ci.margin)}\n` +
      `IC = (x̄₁ − x̄₂) ± E = ${f2(ci.estimate)} ± ${f2(ci.margin)} → (${f2(ci.lower)} ≤ μ₁ − μ₂ ≤ ${f2(ci.upper)}) = ${confText(ci.confidence)}`,
  );
  return { formula, steps: [step1, step2, step3, step4, step5] };
}

/** IC de p₁ − p₂: pasos 1 a 4 (el 5 es la interpretación, que agrega la tarjeta). */
export function explainDiffProportions(
  ci: ConfidenceInterval,
  x1: number,
  n1: number,
  x2: number,
  n2: number,
): Explanation {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const alpha = 1 - ci.confidence;
  const table = classTableZ(ci.confidence);
  return {
    formula:
      "((p̂₁ − p̂₂) − Z_{α/2}·√(p̂₁q̂₁/n₁ + p̂₂q̂₂/n₂) ≤ p₁ − p₂ ≤ (p̂₁ − p̂₂) + Z_{α/2}·√(p̂₁q̂₁/n₁ + p̂₂q̂₂/n₂)) = (1 − α)100 %",
    steps: [
      step(
        1,
        "Proporciones muestrales",
        `p̂₁ = ${x1}/${n1} = ${f4(p1)}; q̂₁ = ${f4(1 - p1)}\np̂₂ = ${x2}/${n2} = ${f4(p2)}; q̂₂ = ${f4(1 - p2)}`,
      ),
      step(
        2,
        "Valor crítico",
        `${confText(ci.confidence)}, α/2 = ${num(alpha / 2)}, tabla z = ${f4(ci.criticalValue)}${table ? ` (tabla: ${table})` : ""}`,
      ),
      step(
        3,
        "Error estándar",
        `SE = √(p̂₁q̂₁/n₁ + p̂₂q̂₂/n₂) = √(${f4(p1)} × ${f4(1 - p1)}/${n1} + ${f4(p2)} × ${f4(1 - p2)}/${n2}) = ${f4(ci.standardError)}`,
      ),
      step(
        4,
        "Margen de error e intervalo",
        `E = ${f4(ci.criticalValue)} × ${f4(ci.standardError)} = ${f4(ci.margin)}\n` +
          `IC = (p̂₁ − p̂₂) ± E = ${f4(ci.estimate)} ± ${f4(ci.margin)} → (${f4(ci.lower)} ≤ p₁ − p₂ ≤ ${f4(ci.upper)}) = ${confText(ci.confidence)}`,
      ),
    ],
  };
}
