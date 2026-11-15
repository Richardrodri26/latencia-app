"use client";

import { useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useExperiment } from "@/context/ExperimentContext";
import {
  measurementSchema,
  type ExperimentConfig,
  type Measurement,
  type MeasureRequest,
} from "@/lib/schemas";
import { z } from "zod";

/** Peticiones por API en cada lote (la especificación permite "hasta 10"). Lotes chicos = progreso fluido y menos pérdida al cancelar. */
const BATCH_SIZE = 2;

/** Espera delayMs entre lotes (el servidor solo pausa dentro de un lote); se interrumpe al cancelar. */
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done);
  });
}

const responseSchema = z.object({ measurements: z.array(measurementSchema) });

export async function postMeasure(body: MeasureRequest, signal?: AbortSignal): Promise<Measurement[]> {
  const res = await fetch("/api/measure", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : "La solicitud de medición no es válida";
    throw new Error(msg);
  }
  return responseSchema.parse(json).measurements;
}

function newRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function summarize(ms: Measurement[], names: [string, string]): string {
  return (["A", "B"] as const)
    .map((id, i) => {
      const own = ms.filter((m) => m.target === id && !m.warmup);
      const valid = own.filter((m) => m.ok).length;
      return `${names[i]}: ${valid} válidos, ${own.length - valid} fallos`;
    })
    .join(" · ");
}

/** Ejecuta el experimento por lotes secuenciales, con progreso y cancelación. */
export function useRunExperiment() {
  const { addMeasurements, removePhaseMeasurements, setStatus, setProgress, setConfig } = useExperiment();
  const controllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (config: ExperimentConfig) => {
      const controller = new AbortController();
      controllerRef.current = controller;
      setConfig(config);
      // Ejecutar una fase reemplaza sus mediciones previas (la otra fase no se toca).
      removePhaseMeasurements(config.phase);
      setStatus("running");

      const perTarget = config.warmup + config.samplesPerTarget;
      const total = perTarget * 2;
      const runId = newRunId();
      const collected: Measurement[] = [];
      let doneTarget = 0;
      setProgress({ done: 0, total });

      try {
        while (doneTarget < perTarget) {
          if (doneTarget > 0) {
            await pause(config.delayMs, controller.signal);
            if (controller.signal.aborted) throw new DOMException("Cancelado", "AbortError");
          }
          const count = Math.min(BATCH_SIZE, perTarget - doneTarget);
          const batch = await postMeasure(
            {
              runId,
              phase: config.phase,
              targets: config.targets,
              countPerTarget: count,
              seqOffset: doneTarget * 2,
              warmupRemaining: Math.min(count, Math.max(0, config.warmup - doneTarget)),
              delayMs: config.delayMs,
              timeoutMs: config.timeoutMs,
              order: config.order,
            },
            controller.signal,
          );
          addMeasurements(batch);
          collected.push(...batch);
          doneTarget += count;
          setProgress({ done: doneTarget * 2, total });
        }
        setStatus("done");
        return { collected, cancelled: false };
      } catch (error) {
        if (controller.signal.aborted) {
          setStatus("cancelled");
          return { collected, cancelled: true };
        }
        setStatus("error");
        throw error;
      } finally {
        controllerRef.current = null;
      }
    },
    onSuccess: ({ collected, cancelled }, config) => {
      const names: [string, string] = [config.targets[0].name, config.targets[1].name];
      const summary = summarize(collected, names);
      if (cancelled) toast.info(`Ejecución cancelada. Se conservó lo medido. ${summary}`);
      else toast.success(`Experimento terminado. ${summary}`);
    },
    onError: (error) => {
      toast.error(`Error durante la medición: ${error instanceof Error ? error.message : "desconocido"}`);
    },
  });

  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  return { run: mutation.mutate, cancel, isRunning: mutation.isPending };
}
