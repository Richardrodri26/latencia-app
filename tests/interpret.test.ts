import { describe, expect, it } from "vitest";
import {
  interpretDiffMeans,
  interpretDiffProportions,
  interpretFailures,
  interpretMean,
  interpretSd,
  interpretSla,
  interpretVariance,
  interpretVarianceRatio,
  recommend,
  type ConfidenceInterval,
} from "@/lib/stats";

function ci(lower: number, upper: number, confidence = 0.95): ConfidenceInterval {
  return {
    kind: "mean-t",
    confidence,
    estimate: (lower + upper) / 2,
    lower,
    upper,
    criticalValue: 1.96,
    warnings: [],
  };
}

describe("plantillas de interpretación", () => {
  it("media, desviación y varianza", () => {
    expect(interpretMean(ci(10.073514, 17.926486), "API A")).toBe(
      "Con 95% de confianza, el tiempo medio de respuesta de API A está entre 10.07 ms y 17.93 ms.",
    );
    expect(interpretSd(ci(1.894625, 9.086981, 0.9), "API A")).toBe(
      "Con 90% de confianza, la desviación estándar del tiempo de respuesta de API A está entre 1.89 ms y 9.09 ms.",
    );
    expect(interpretVariance(ci(3.589605, 82.57322, 0.99), "API A")).toBe(
      "Con 99% de confianza, la varianza del tiempo de respuesta de API A está entre 3.59 ms² y 82.57 ms².",
    );
  });

  it("proporción SLA y fallos en porcentaje", () => {
    expect(interpretSla(ci(0.1216, 0.2784), "API A", 300)).toBe(
      "Con 95% de confianza, entre el 12.16% y el 27.84% de las peticiones a API A superan 300 ms.",
    );
    expect(interpretFailures(ci(0, 0.05), "API B")).toContain("entre el 0.00% y el 5.00% de las peticiones a API B fallan");
  });

  it("diferencia de medias: A más rápida, B más rápida y sin evidencia", () => {
    expect(interpretDiffMeans(ci(-14.612, -5.388), "A", "B")).toBe(
      "A es más rápida que B: en promedio responde entre 5.39 y 14.61 ms antes.",
    );
    expect(interpretDiffMeans(ci(5.388, 14.612), "A", "B")).toBe(
      "B es más rápida que A: en promedio responde entre 5.39 y 14.61 ms antes.",
    );
    expect(interpretDiffMeans(ci(-1, 2), "A", "B")).toBe(
      "Con 95% de confianza no hay evidencia de diferencia en el tiempo medio.",
    );
  });

  it("razón de varianzas: contiene 1, A más estable, B más estable", () => {
    expect(interpretVarianceRatio(ci(0.104118, 9.60453), "A", "B")).toContain("estabilidad similar");
    expect(interpretVarianceRatio(ci(0.1, 0.9), "A", "B")).toBe(
      "El intervalo no contiene 1: A es más estable (menor varianza) que B.",
    );
    expect(interpretVarianceRatio(ci(1.5, 4), "A", "B")).toBe(
      "El intervalo no contiene 1: B es más estable (menor varianza) que A.",
    );
  });

  it("diferencia de proporciones: A mejor, B mejor y sin evidencia", () => {
    expect(interpretDiffProportions(ci(-0.2, -0.05), "A", "B")).toContain("A incumple el SLA con menos frecuencia que B");
    expect(interpretDiffProportions(ci(0.002002, 0.197998), "A", "B")).toContain(
      "B incumple el SLA con menos frecuencia que A: la diferencia de proporciones está entre 0.20 y 19.80 puntos porcentuales.",
    );
    expect(interpretDiffProportions(ci(-0.1, 0.1), "A", "B")).toBe(
      "Con 95% de confianza no hay evidencia de diferencia en la proporción de incumplimiento del SLA.",
    );
  });
});

describe("recommend", () => {
  const none = ci(-1, 1);
  const ratioOne = ci(0.5, 2);

  it("gana por media (A y B)", () => {
    const a = recommend({ nameA: "A", nameB: "B", diffMeans: ci(-5, -1), diffSla: none, varianceRatio: ratioOne });
    expect(a).toMatchObject({ winner: "A", criterion: "media" });
    const b = recommend({ nameA: "A", nameB: "B", diffMeans: ci(1, 5), diffSla: none, varianceRatio: ratioOne });
    expect(b).toMatchObject({ winner: "B", criterion: "media" });
  });

  it("desempata por SLA", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: none, diffSla: ci(0.05, 0.2), varianceRatio: ratioOne });
    expect(r).toMatchObject({ winner: "B", criterion: "sla" });
    expect(r.text).toContain("No hay diferencia clara en el tiempo medio");
  });

  it("desempata por varianza", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: none, diffSla: none, varianceRatio: ci(0.1, 0.8) });
    expect(r).toMatchObject({ winner: "A", criterion: "varianza" });
    const r2 = recommend({ nameA: "A", nameB: "B", diffMeans: none, diffSla: none, varianceRatio: ci(1.2, 3) });
    expect(r2).toMatchObject({ winner: "B", criterion: "varianza" });
  });

  it("sin evidencia suficiente", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: none, diffSla: none, varianceRatio: ratioOne });
    expect(r).toEqual({
      winner: null,
      criterion: null,
      text: "No hay evidencia suficiente para preferir una API; aumentar n o considerar otros criterios.",
    });
  });
});
