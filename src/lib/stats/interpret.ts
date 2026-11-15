import type { ConfidenceInterval } from "./intervals";

export const fmtMs = (x: number) => x.toFixed(2);
export const fmt4 = (x: number) => x.toFixed(4);
export const fmtPct = (p: number) => (p * 100).toFixed(2);
const confPct = (c: number) => String(Math.round(c * 100));

export function interpretMean(ci: ConfidenceInterval, api: string): string {
  return `Con ${confPct(ci.confidence)}% de confianza, el tiempo medio de respuesta de ${api} está entre ${fmtMs(ci.lower)} ms y ${fmtMs(ci.upper)} ms.`;
}

export function interpretSd(ci: ConfidenceInterval, api: string): string {
  return `Con ${confPct(ci.confidence)}% de confianza, la desviación estándar del tiempo de respuesta de ${api} está entre ${fmtMs(ci.lower)} ms y ${fmtMs(ci.upper)} ms.`;
}

export function interpretVariance(ci: ConfidenceInterval, api: string): string {
  return `Con ${confPct(ci.confidence)}% de confianza, la varianza del tiempo de respuesta de ${api} está entre ${fmtMs(ci.lower)} ms² y ${fmtMs(ci.upper)} ms².`;
}

export function interpretSla(ci: ConfidenceInterval, api: string, slaMs: number): string {
  return `Con ${confPct(ci.confidence)}% de confianza, entre el ${fmtPct(ci.lower)}% y el ${fmtPct(ci.upper)}% de las peticiones a ${api} superan ${slaMs} ms.`;
}

export function interpretFailures(ci: ConfidenceInterval, api: string): string {
  return `Con ${confPct(ci.confidence)}% de confianza, entre el ${fmtPct(ci.lower)}% y el ${fmtPct(ci.upper)}% de las peticiones a ${api} fallan (error de red, timeout o estado distinto de 2xx).`;
}

export function interpretDiffMeans(
  ci: ConfidenceInterval,
  nameA: string,
  nameB: string,
): string {
  if (ci.upper < 0) {
    return `${nameA} es más rápida que ${nameB}: en promedio responde entre ${fmtMs(Math.abs(ci.upper))} y ${fmtMs(Math.abs(ci.lower))} ms antes.`;
  }
  if (ci.lower > 0) {
    return `${nameB} es más rápida que ${nameA}: en promedio responde entre ${fmtMs(ci.lower)} y ${fmtMs(ci.upper)} ms antes.`;
  }
  return `Con ${confPct(ci.confidence)}% de confianza no hay evidencia de diferencia en el tiempo medio.`;
}

export function interpretVarianceRatio(
  ci: ConfidenceInterval,
  nameA: string,
  nameB: string,
): string {
  if (ci.lower <= 1 && ci.upper >= 1) {
    return `El intervalo contiene 1: ${nameA} y ${nameB} tienen una estabilidad similar (no hay evidencia de varianzas distintas).`;
  }
  const stable = ci.upper < 1 ? nameA : nameB;
  const other = ci.upper < 1 ? nameB : nameA;
  return `El intervalo no contiene 1: ${stable} es más estable (menor varianza) que ${other}.`;
}

export function interpretDiffProportions(
  ci: ConfidenceInterval,
  nameA: string,
  nameB: string,
): string {
  if (ci.upper < 0) {
    return `${nameA} incumple el SLA con menos frecuencia que ${nameB}: la diferencia de proporciones está entre ${fmtPct(ci.lower)} y ${fmtPct(ci.upper)} puntos porcentuales.`;
  }
  if (ci.lower > 0) {
    return `${nameB} incumple el SLA con menos frecuencia que ${nameA}: la diferencia de proporciones está entre ${fmtPct(ci.lower)} y ${fmtPct(ci.upper)} puntos porcentuales.`;
  }
  return `Con ${confPct(ci.confidence)}% de confianza no hay evidencia de diferencia en la proporción de incumplimiento del SLA.`;
}

export type RecommendationInput = {
  nameA: string;
  nameB: string;
  diffMeans: ConfidenceInterval;
  diffSla: ConfidenceInterval;
  varianceRatio: ConfidenceInterval;
};

export type RecommendationResult = {
  winner: "A" | "B" | null;
  criterion: "media" | "sla" | "varianza" | null;
  text: string;
};

/**
 * Gana la API con mejor media (IC de la diferencia sin 0). Si no hay diferencia clara en la media,
 * desempata por menor proporción de incumplimiento del SLA y luego por menor varianza.
 */
export function recommend(input: RecommendationInput): RecommendationResult {
  const { nameA, nameB, diffMeans, diffSla, varianceRatio } = input;
  const name = (w: "A" | "B") => (w === "A" ? nameA : nameB);

  if (diffMeans.upper < 0 || diffMeans.lower > 0) {
    const w = diffMeans.upper < 0 ? "A" : "B";
    return {
      winner: w,
      criterion: "media",
      text: `Se recomienda ${name(w)}: el IC de la diferencia de medias no contiene 0 y ${name(w)} responde más rápido.`,
    };
  }
  if (diffSla.upper < 0 || diffSla.lower > 0) {
    const w = diffSla.upper < 0 ? "A" : "B";
    return {
      winner: w,
      criterion: "sla",
      text: `No hay diferencia clara en el tiempo medio. Se recomienda ${name(w)} por incumplir el SLA con menor frecuencia (el IC de la diferencia de proporciones no contiene 0).`,
    };
  }
  if (varianceRatio.upper < 1 || varianceRatio.lower > 1) {
    const w = varianceRatio.upper < 1 ? "A" : "B";
    return {
      winner: w,
      criterion: "varianza",
      text: `No hay diferencia clara en el tiempo medio ni en el SLA. Se recomienda ${name(w)} por ser más estable (menor varianza).`,
    };
  }
  return {
    winner: null,
    criterion: null,
    text: "No hay evidencia suficiente para preferir una API; aumentar n o considerar otros criterios.",
  };
}
