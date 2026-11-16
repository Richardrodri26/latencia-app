import type { Measurement, Phase } from "@/lib/schemas";

/** Cantidad de mediciones guardadas de una fase (incluye calentamiento y fallos). */
export function countPhase(measurements: Measurement[], phase: Phase): number {
  return measurements.filter((m) => m.phase === phase).length;
}

/** Quita las mediciones de una fase y deja intactas las de la otra. No muta el arreglo original. */
export function removePhase(measurements: Measurement[], phase: Phase): Measurement[] {
  return measurements.filter((m) => m.phase !== phase);
}

/**
 * Aplica un lote recibido durante una ejecución de `phase`. El primer lote (`first`) reemplaza de una vez
 * las mediciones previas de esa fase por el lote nuevo; los siguientes se agregan. Así el almacenamiento
 * nunca contiene filas viejas y nuevas de la misma fase a la vez, y la otra fase no se toca (decisión 71).
 */
export function applyBatch(measurements: Measurement[], phase: Phase, batch: Measurement[], first: boolean): Measurement[] {
  return first ? [...removePhase(measurements, phase), ...batch] : [...measurements, ...batch];
}

export type RunNotice = { kind: "error" | "info"; text: string };

type OutcomeInput = {
  status: "done" | "cancelled" | "error";
  /** true si ya llegó el primer lote y por tanto las mediciones previas de la fase fueron reemplazadas. */
  replaced: boolean;
  /** Mediciones de la fase antes de empezar la ejecución. */
  previousCount: number;
  /** Mediciones nuevas recibidas en esta ejecución. */
  savedCount: number;
  detail?: string;
};

const plural = (n: number) => `${n} ${n === 1 ? "medición" : "mediciones"}`;

/** Mensaje persistente (en español) sobre cómo terminó la ejecución y qué datos quedaron guardados. */
export function runNotice({ status, replaced, previousCount, savedCount, detail }: OutcomeInput): RunNotice | null {
  if (status === "done") return null;
  const kept =
    previousCount > 0
      ? `No se guardó ninguna medición nueva: ${
          previousCount === 1 ? "se conservó la medición anterior" : `se conservaron las ${previousCount} mediciones anteriores`
        } de esta fase.`
      : "No se guardó ninguna medición nueva.";
  const saved = `Se guardaron las ${plural(savedCount)} nuevas obtenidas hasta ahora${
    previousCount > 0 ? ` (reemplazaron las ${previousCount} anteriores de esta fase)` : ""
  }.`;
  if (status === "cancelled") {
    return { kind: "info", text: replaced ? `Ejecución cancelada. ${saved}` : `Ejecución cancelada antes del primer lote. ${kept}` };
  }
  const reason = detail ? ` Motivo: ${detail}` : "";
  return {
    kind: "error",
    text: replaced
      ? `La medición se interrumpió. ${saved}${reason}`
      : `No se pudo completar la medición. ${kept}${reason}`,
  };
}

/** Mensaje de confirmación al reemplazar las mediciones de una fase. */
export function replaceMessage(phase: Phase, count: number): string {
  const nombre = phase === "piloto" ? "piloto" : "principal";
  const medicion = count === 1 ? "medición" : "mediciones";
  return `La fase ${nombre} ya tiene ${count} ${medicion}. Ejecutar de nuevo las reemplaza (la otra fase no se toca). ¿Continuar?`;
}
