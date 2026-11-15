import type { Measurement, Phase } from "@/lib/schemas";

/** Cantidad de mediciones guardadas de una fase (incluye calentamiento y fallos). */
export function countPhase(measurements: Measurement[], phase: Phase): number {
  return measurements.filter((m) => m.phase === phase).length;
}

/** Quita las mediciones de una fase y deja intactas las de la otra. No muta el arreglo original. */
export function removePhase(measurements: Measurement[], phase: Phase): Measurement[] {
  return measurements.filter((m) => m.phase !== phase);
}

/** Mensaje de confirmación al reemplazar las mediciones de una fase. */
export function replaceMessage(phase: Phase, count: number): string {
  const nombre = phase === "piloto" ? "piloto" : "principal";
  const medicion = count === 1 ? "medición" : "mediciones";
  return `La fase ${nombre} ya tiene ${count} ${medicion}. Ejecutar de nuevo las reemplaza (la otra fase no se toca). ¿Continuar?`;
}
