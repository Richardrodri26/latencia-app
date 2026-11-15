import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApiSection } from "@/components/results/ApiSection";
import { ComparisonPanel } from "@/components/results/ComparisonPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MathText } from "@/components/results/MathText";
import { Recommendation } from "@/components/results/Recommendation";
import { parseCsv } from "@/lib/csv";
import { computeResults } from "@/lib/results";

const { valid } = parseCsv(readFileSync(join(process.cwd(), "public", "data", "respaldo.csv"), "utf-8"));
const r = computeResults(valid, "principal", 0.95, 300, "API A", "API B");
const text = (html: string) => html.replace(/<[^>]+>/g, "");

describe("MathText", () => {
  it("convierte _{…} en subíndice", () => {
    expect(renderToStaticMarkup(<MathText text="Z_{α/2} = 1.96" />)).toBe("Z<sub>α/2</sub> = 1.96");
    expect(renderToStaticMarkup(<MathText text="sin subíndices" />)).toBe("sin subíndices");
  });
});

describe("/resultados con el respaldo (render en servidor)", () => {
  const a = renderToStaticMarkup(<ApiSection api={r.a} slaMs={300} />);
  const b = renderToStaticMarkup(<ApiSection api={r.b} slaMs={300} />);
  const cmp = renderToStaticMarkup(<ComparisonPanel results={r} comparison={r.comparison!} />);
  const rec = renderToStaticMarkup(<Recommendation comparison={r.comparison!} />);

  it("por API: una sola tarjeta de media con «Z con s, n ≥ 30» y 4 pasos", () => {
    expect(text(a).match(/IC para la media/g)).toHaveLength(1);
    expect(text(a)).toContain("IC para la media μ (Z con s, n ≥ 30)");
    expect(text(a)).toContain("Paso 4 · Interpretación");
    expect(text(a)).toContain("(81.89 ms ≤ μ ≤ 99.13 ms) = 95 %");
  });

  it("SLA de A: no aplica, sin interpretación", () => {
    const t = text(a);
    expect(t).toContain("este intervalo no aplica");
    expect(t).toContain("Cálculo de referencia (no aplica)");
    expect(t).not.toContain("Paso 6 · Interpretación");
    expect(t).not.toContain("superan 300 ms");
  });

  it("SLA de B: 6 pasos e IC [0.0073 ; 0.0927]", () => {
    const t = text(b);
    expect(t).toContain("Paso 6 · Interpretación");
    expect(t).toContain("[0.0073 ; 0.0927]");
  });

  it("comparación: 2 tarjetas con las cifras del caso y la nota de A", () => {
    const t = text(cmp);
    expect(t).toContain("1. IC para la diferencia de medias");
    expect(t).toContain("2. IC para la diferencia de proporciones");
    expect(t).toContain("(−160.44 ms ≤ μ₁ − μ₂ ≤ −126.96 ms) = 95 %");
    expect(t).toContain("(−0.0808 ≤ p₁ − p₂ ≤ 0.0208) = 95 %");
    expect(t).toContain("En API A no se cumple n·p̂ ≥ 5 y n·q̂ ≥ 5.");
    expect(t).not.toContain("En API B no se cumple");
  });

  it("rectas numéricas: etiquetas y aria-label con «−» (U+2212)", () => {
    expect(cmp).toContain("−160.44");
    expect(cmp).toContain("−0.0808");
    expect(cmp).toContain('aria-label="Diferencia de medias: intervalo de −160.44 a −126.96;');
    expect(cmp).not.toMatch(/>-\d/);
    expect(cmp).not.toMatch(/de -\d/);
  });

  it("botón de tema: etiqueta neutra hasta montar (sin desfase en la hidratación)", () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain('aria-label="Cambiar tema"');
    expect(text(html)).toBe("Tema");
  });

  it("recomendación: API A", () => {
    expect(text(rec)).toContain("Se recomienda API A");
  });

  it("ningún texto con χ², F, Welch, razón de varianzas ni «más estable»", () => {
    const all = text(a + b + cmp + rec);
    for (const w of ["χ²", "Welch", "razón de varianzas", "Razón de varianzas", "más estable", "varianza σ²"]) {
      expect(all).not.toContain(w);
    }
    expect(all).not.toMatch(/\bF\(/);
  });
});
