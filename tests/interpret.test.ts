import { describe, expect, it } from "vitest";
import {
  interpretDiffMeans,
  interpretDiffProportions,
  interpretFailures,
  interpretMean,
  interpretMeanVsSla,
  interpretSla,
  recommend,
  summaryFromSums,
  meanCI,
  type ConfidenceInterval,
} from "@/lib/stats";

function ci(lower: number, upper: number, confidence = 0.95): ConfidenceInterval {
  return {
    kind: "mean-z",
    distribution: "z",
    confidence,
    estimate: (lower + upper) / 2,
    lower,
    upper,
    margin: (upper - lower) / 2,
    standardError: 1,
    criticalValue: 1.96,
    warnings: [],
  };
}

describe("plantillas de interpretación", () => {
  it("media", () => {
    expect(interpretMean(ci(10.073514, 17.926486), "API A")).toBe(
      "Con 95% de confianza, el promedio real del tiempo de respuesta de API A está entre 10.07 ms y 17.93 ms.",
    );
  });

  it("media frente al SLA: cumple, no cumple y cae dentro", () => {
    expect(interpretMeanVsSla(ci(81.89, 99.13), "API A", 300)).toBe(
      "El límite superior (99.13 ms) está por debajo de 300 ms: con 95% de confianza, el promedio real de API A cumple el SLA.",
    );
    expect(interpretMeanVsSla(ci(320, 340), "API B", 300)).toBe(
      "El límite inferior (320.00 ms) supera 300 ms: con 95% de confianza, el promedio real de API B no cumple el SLA.",
    );
    expect(interpretMeanVsSla(ci(290, 310), "API B", 300)).toBe(
      "El valor 300 ms cae dentro del intervalo: con 95% de confianza no se puede garantizar que API B cumpla el SLA, porque el promedio real podría estar por encima.",
    );
  });

  it("C3 con SLA 220: el valor cae dentro del intervalo", () => {
    const c3 = meanCI(summaryFromSums(15, 3218, 693666), 0.99);
    expect(interpretMeanVsSla(c3, "la API", 220)).toContain("cae dentro del intervalo");
  });

  it("proporción SLA (con la lectura complementaria) y fallos", () => {
    expect(interpretSla(ci(0.1216, 0.2784), "API A", 300)).toBe(
      "Con 95% de confianza, entre el 12.16% y el 27.84% de las peticiones a API A superan 300 ms; también significa que entre el 72.16% y el 87.84% sí responden dentro del SLA.",
    );
    expect(interpretFailures(ci(0, 0.05), "API B")).toContain(
      "entre el 0.00% y el 5.00% de las peticiones a API B fallan",
    );
  });

  it("diferencia de medias: contiene 0, A más rápida y B más rápida", () => {
    expect(interpretDiffMeans(ci(-1, 2), "A", "B")).toBe(
      "El intervalo contiene al cero: con 95% de confianza no hay diferencias entre el tiempo medio de A y el de B.",
    );
    expect(interpretDiffMeans(ci(-160.4377, -126.9589), "API A", "API B")).toBe(
      "El intervalo no contiene al cero: hay diferencia. API A responde en promedio entre 126.96 y 160.44 ms antes que API B.",
    );
    expect(interpretDiffMeans(ci(5.388, 14.612), "A", "B")).toBe(
      "El intervalo no contiene al cero: hay diferencia. B responde en promedio entre 5.39 y 14.61 ms antes que A.",
    );
  });

  it("diferencia de proporciones: contiene 0, A mejor y B mejor", () => {
    expect(interpretDiffProportions(ci(-0.1, 0.1), "A", "B")).toBe(
      "El intervalo contiene al cero: con 95% de confianza no hay diferencias en la proporción de peticiones que incumplen el SLA.",
    );
    expect(interpretDiffProportions(ci(-0.2, -0.05), "A", "B")).toBe(
      "El intervalo no contiene al cero: hay diferencia. A incumple el SLA con menos frecuencia que B (entre 5.00 y 20.00 puntos porcentuales menos).",
    );
    expect(interpretDiffProportions(ci(0.002002, 0.197998), "A", "B")).toBe(
      "El intervalo no contiene al cero: hay diferencia. B incumple el SLA con menos frecuencia que A (entre 0.20 y 19.80 puntos porcentuales menos).",
    );
  });
});

describe("recommend", () => {
  const none = ci(-1, 1);

  it("gana por media (A y B)", () => {
    const a = recommend({ nameA: "A", nameB: "B", diffMeans: ci(-5, -1), diffSla: none });
    expect(a).toMatchObject({ winner: "A", criterion: "media" });
    expect(a.text).toBe(
      "Se recomienda A: el IC de la diferencia de medias no contiene al cero y A responde más rápido.",
    );
    const b = recommend({ nameA: "A", nameB: "B", diffMeans: ci(1, 5), diffSla: none });
    expect(b).toMatchObject({ winner: "B", criterion: "media" });
  });

  it("si la media contiene 0, decide el SLA", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: none, diffSla: ci(0.05, 0.2) });
    expect(r).toMatchObject({ winner: "B", criterion: "sla" });
    expect(r.text).toBe(
      "No hay diferencias en el tiempo medio (el IC contiene al cero). Se recomienda B por incumplir el SLA con menor frecuencia (el IC de la diferencia de proporciones no contiene al cero).",
    );
    const r2 = recommend({ nameA: "A", nameB: "B", diffMeans: none, diffSla: ci(-0.2, -0.05) });
    expect(r2).toMatchObject({ winner: "A", criterion: "sla" });
  });

  it("sin evidencia suficiente", () => {
    const r = recommend({ nameA: "A", nameB: "B", diffMeans: none, diffSla: none });
    expect(r).toEqual({
      winner: null,
      criterion: null,
      text: "No hay evidencia suficiente para preferir una API; aumentar n o considerar otros criterios.",
    });
  });
});
