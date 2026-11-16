"use client";

import { useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRateLimiter } from "@tanstack/react-pacer";
import { toast } from "sonner";
import { useExperiment } from "@/context/ExperimentContext";
import { countPhase, runNotice } from "@/lib/measurements";
import { MeasureApiError, pause, runBatches, type RunResult } from "@/lib/runner";
import { measurementSchema, type ExperimentConfig, type Measurement, type MeasureRequest } from "@/lib/schemas";
import { z } from "zod";

/** Tope de lotes por minuto del cliente (el servidor admite 120): nunca se envía más de lo que el servidor permite. */
const CLIENT_MAX_BATCHES_PER_MIN = 100;

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
    const retry = Number(res.headers.get("retry-after"));
    throw new MeasureApiError(msg, res.status, Number.isFinite(retry) && retry > 0 ? retry * 1000 : null);
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
  const { measurements, applyRunBatch, setStatus, setProgress, setConfig, setNotice, setWaitSeconds } = useExperiment();
  const controllerRef = useRef<AbortController | null>(null);
  // Pacer: ventana deslizante en el cliente para no superar el límite del servidor.
  const sendLimiter = useRateLimiter(() => undefined, {
    limit: CLIENT_MAX_BATCHES_PER_MIN,
    window: 60_000,
    windowType: "sliding",
  });

  const mutation = useMutation({
    mutationFn: async (config: ExperimentConfig): Promise<RunResult & { previousCount: number }> => {
      const controller = new AbortController();
      controllerRef.current = controller;
      const previousCount = countPhase(measurements, config.phase);
      setConfig(config);
      setNotice(null);
      setWaitSeconds(null);
      setStatus("running");
      // Las mediciones previas de la fase NO se tocan aquí: se reemplazan al llegar el primer lote.
      try {
        const result = await runBatches(
          config,
          {
            runId: newRunId(),
            post: postMeasure,
            waitForSlot: async (signal) => {
              while (!sendLimiter.maybeExecute()) {
                await pause(Math.max(50, sendLimiter.getMsUntilNextWindow()), signal);
                if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
              }
            },
            sleep: pause,
            onBatch: (batch, first) => applyRunBatch(config.phase, batch, first),
            onProgress: (done, total) => setProgress({ done, total }),
            onWait: setWaitSeconds,
          },
          controller.signal,
        );
        setStatus(result.status);
        setNotice(
          runNotice({
            status: result.status,
            replaced: result.replaced,
            previousCount,
            savedCount: result.collected.length,
            detail: result.error instanceof Error ? result.error.message : result.error ? "error desconocido" : undefined,
          }),
        );
        return { ...result, previousCount };
      } finally {
        controllerRef.current = null;
      }
    },
    onSuccess: ({ status, collected, replaced, previousCount, error }, config) => {
      const names: [string, string] = [config.targets[0].name, config.targets[1].name];
      const summary = summarize(collected, names);
      if (status === "cancelled") {
        toast.info(replaced ? `Ejecución cancelada. Se conservó lo medido. ${summary}` : "Ejecución cancelada. No se guardó nada nuevo.");
      } else if (status === "error") {
        const reason = error instanceof Error ? error.message : "desconocido";
        toast.error(
          `Error durante la medición: ${reason}${!replaced && previousCount > 0 ? " Se conservaron los datos anteriores." : ""}`,
        );
      } else {
        toast.success(`Experimento terminado. ${summary}`);
      }
    },
  });

  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  return { run: mutation.mutate, cancel, isRunning: mutation.isPending };
}
