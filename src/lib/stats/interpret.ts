import type { ConfidenceInterval } from "./intervals";

export const fmtMs = (x: number) => x.toFixed(2);
export const fmt4 = (x: number) => x.toFixed(4);
export const fmtPct = (p: number) => (p * 100).toFixed(2);
const confPct = (c: number) => String(Math.round(c * 100));
export const containsZero = (ci: ConfidenceInterval) => ci.lower <= 0 && ci.upper >= 0;

export function interpretMean(ci: ConfidenceInterval, api: string): string {
  return `Con ${confPct(ci.confidence)}% de confianza, el promedio real del tiempo de respuesta de ${api} está entre ${fmtMs(ci.lower)} ms y ${fmtMs(ci.upper)} ms.`;
}

/** Paso 4 del Problema 2 de clase: compara el IC de la media con el SLA. */
export function interpretMeanVsSla(ci: ConfidenceInterval, api: string, slaMs: number): string {
  const conf = confPct(ci.confidence);
  if (ci.upper < slaMs) {
    return `El límite superior (${fmtMs(ci.upper)} ms) está por debajo de ${slaMs} ms: con ${conf}% de confianza, el promedio real de ${api} cumple el SLA.`;
  }
  if (ci.lower > slaMs) {
    return `El límite inferior (${fmtMs(ci.lower)} ms) supera ${slaMs} ms: con ${conf}% de confianza, el promedio real de ${api} no cumple el SLA.`;
  }
  return `El valor ${slaMs} ms cae dentro del intervalo: con ${conf}% de confianza no se puede garantizar que ${api} cumpla el SLA, porque el promedio real podría estar por encima.`;
}

export function interpretSla(ci: ConfidenceInterval, api: string, slaMs: number): string {
  return `Con ${confPct(ci.confidence)}% de confianza, entre el ${fmtPct(ci.lower)}% y el ${fmtPct(ci.upper)}% de las peticiones a ${api} superan ${slaMs} ms; también significa que entre el ${fmtPct(1 - ci.upper)}% y el ${fmtPct(1 - ci.lower)}% sí responden dentro del SLA.`;
}

export function interpretFailures(ci: ConfidenceInterval, api: string): string {
  return `Con ${confPct(ci.confidence)}% de confianza, entre el ${fmtPct(ci.lower)}% y el ${fmtPct(ci.upper)}% de las peticiones a ${api} fallan (error de red, timeout o estado distinto de 2xx).`;
}

export function interpretDiffMeans(ci: ConfidenceInterval, nameA: string, nameB: string): string {
  if (containsZero(ci)) {
    return `El intervalo contiene al cero: con ${confPct(ci.confidence)}% de confianza no hay diferencias entre el tiempo medio de ${nameA} y el de ${nameB}.`;
  }
  if (ci.upper < 0) {
    return `El intervalo no contiene al cero: hay diferencia. ${nameA} responde en promedio entre ${fmtMs(Math.abs(ci.upper))} y ${fmtMs(Math.abs(ci.lower))} ms antes que ${nameB}.`;
  }
  return `El intervalo no contiene al cero: hay diferencia. ${nameB} responde en promedio entre ${fmtMs(ci.lower)} y ${fmtMs(ci.upper)} ms antes que ${nameA}.`;
}

export function interpretDiffProportions(
  ci: ConfidenceInterval,
  nameA: string,
  nameB: string,
): string {
  if (containsZero(ci)) {
    return `El intervalo contiene al cero: con ${confPct(ci.confidence)}% de confianza no hay diferencias en la proporción de peticiones que incumplen el SLA.`;
  }
  if (ci.upper < 0) {
    return `El intervalo no contiene al cero: hay diferencia. ${nameA} incumple el SLA con menos frecuencia que ${nameB} (entre ${fmtPct(Math.abs(ci.upper))} y ${fmtPct(Math.abs(ci.lower))} puntos porcentuales menos).`;
  }
  return `El intervalo no contiene al cero: hay diferencia. ${nameB} incumple el SLA con menos frecuencia que ${nameA} (entre ${fmtPct(ci.lower)} y ${fmtPct(ci.upper)} puntos porcentuales menos).`;
}

export type RecommendationInput = {
  nameA: string;
  nameB: string;
  diffMeans: ConfidenceInterval;
  diffSla: ConfidenceInterval;
};

export type RecommendationResult = {
  winner: "A" | "B" | null;
  criterion: "media" | "sla" | null;
  text: string;
};

/**
 * 1) IC de la diferencia de medias sin 0 → gana la más rápida.
 * 2) Si no, IC de la diferencia de proporciones del SLA sin 0 → gana la que incumple menos.
 * 3) Si no, sin evidencia suficiente.
 */
export function recommend(input: RecommendationInput): RecommendationResult {
  const { nameA, nameB, diffMeans, diffSla } = input;
  const name = (w: "A" | "B") => (w === "A" ? nameA : nameB);

  if (!containsZero(diffMeans)) {
    const w = diffMeans.upper < 0 ? "A" : "B";
    return {
      winner: w,
      criterion: "media",
      text: `Se recomienda ${name(w)}: el IC de la diferencia de medias no contiene al cero y ${name(w)} responde más rápido.`,
    };
  }
  if (!containsZero(diffSla)) {
    const w = diffSla.upper < 0 ? "A" : "B";
    return {
      winner: w,
      criterion: "sla",
      text: `No hay diferencias en el tiempo medio (el IC contiene al cero). Se recomienda ${name(w)} por incumplir el SLA con menor frecuencia (el IC de la diferencia de proporciones no contiene al cero).`,
    };
  }
  return {
    winner: null,
    criterion: null,
    text: "No hay evidencia suficiente para preferir una API; aumentar n o considerar otros criterios.",
  };
}
