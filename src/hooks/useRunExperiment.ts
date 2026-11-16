"use client";

import { useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRateLimiter } from "@tanstack/react-pacer";
import { toast } from "sonner";
import { useExperiment } from "@/context/ExperimentContext";
import {
  maxCountForBudget,
  measurementSchema,
  type ExperimentConfig,
  type Measurement,
  type MeasureRequest,
} from "@/lib/schemas";
import { z } from "zod";

/** Peticiones por API en cada lote (la especificación permite "hasta 10"). Lotes chicos = progreso fluido y menos pérdida al cancelar. */
const BATCH_SIZE = 2;

/** Tope de lotes por minuto del cliente (el servidor admite 120): nunca se envía más de lo que el servidor permite. */
const CLIENT_MAX_BATCHES_PER_MIN = 100;
/** Reintentos ante un 429 del servidor (se espera Retry-After entre cada uno). */
const MAX_429_RETRIES = 3;
const MAX_RETRY_WAIT_MS = 30_000;

/** Error HTTP de /api/measure; conserva el estado y el Retry-After para decidir si reintentar. */
export class MeasureApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number | null,
  ) {
    super(message);
    this.name = "MeasureApiError";
  }
}

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
  const { addMeasurements, removePhaseMeasurements, setStatus, setProgress, setConfig } = useExperiment();
  const controllerRef = useRef<AbortController | null>(null);
  // Pacer: ventana deslizante en el cliente para no superar el límite del servidor.
  const sendLimiter = useRateLimiter(() => undefined, {
    limit: CLIENT_MAX_BATCHES_PER_MIN,
    window: 60_000,
    windowType: "sliding",
  });

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

      const batchSize = Math.min(BATCH_SIZE, maxCountForBudget(config.timeoutMs, config.delayMs));

      /** Espera un hueco en la ventana del limitador y envía; ante un 429 espera Retry-After y reintenta (acotado). */
      const send = async (body: MeasureRequest): Promise<Measurement[]> => {
        for (let attempt = 0; ; attempt++) {
          while (!sendLimiter.maybeExecute()) {
            await pause(Math.max(50, sendLimiter.getMsUntilNextWindow()), controller.signal);
            if (controller.signal.aborted) throw new DOMException("Cancelado", "AbortError");
          }
          try {
            return await postMeasure(body, controller.signal);
          } catch (error) {
            if (!(error instanceof MeasureApiError) || error.status !== 429) throw error;
            if (attempt >= MAX_429_RETRIES) {
              throw new MeasureApiError(`${error.message} Se conservó lo medido hasta ahora.`, 429, error.retryAfterMs);
            }
            await pause(Math.min(error.retryAfterMs ?? 2000, MAX_RETRY_WAIT_MS), controller.signal);
            if (controller.signal.aborted) throw new DOMException("Cancelado", "AbortError");
          }
        }
      };

      try {
        while (doneTarget < perTarget) {
          if (doneTarget > 0) {
            await pause(config.delayMs, controller.signal);
            if (controller.signal.aborted) throw new DOMException("Cancelado", "AbortError");
          }
          const count = Math.min(batchSize, perTarget - doneTarget);
          const batch = await send({
              runId,
              phase: config.phase,
              targets: config.targets,
              countPerTarget: count,
              seqOffset: doneTarget * 2,
              warmupRemaining: Math.min(count, Math.max(0, config.warmup - doneTarget)),
              delayMs: config.delayMs,
              timeoutMs: config.timeoutMs,
              order: config.order,
          });
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
