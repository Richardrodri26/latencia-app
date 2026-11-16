import { maxCountForBudget, type ExperimentConfig, type Measurement, type MeasureRequest } from "@/lib/schemas";

/** Peticiones por API en cada lote (la especificación permite "hasta 10"). Lotes chicos = progreso fluido y menos pérdida al cancelar. */
export const BATCH_SIZE = 2;
/** Reintentos ante un 429 del servidor (se espera Retry-After entre cada uno). */
export const MAX_429_RETRIES = 3;
export const MAX_RETRY_WAIT_MS = 30_000;

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

/** Espera ms; se interrumpe (resuelve) al cancelar. */
export function pause(ms: number, signal: AbortSignal): Promise<void> {
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

const abortError = () => new DOMException("Cancelado", "AbortError");

/** Dependencias inyectables del ciclo de medición (permiten probarlo sin red ni temporizadores reales). */
export type RunDeps = {
  runId: string;
  post: (body: MeasureRequest, signal: AbortSignal) => Promise<Measurement[]>;
  /** Espera un hueco del limitador del cliente; debe lanzar si se cancela. */
  waitForSlot: (signal: AbortSignal) => Promise<void>;
  sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  /** Recibe cada lote; `first` es true solo en el primero (aquí se reemplazan los datos previos de la fase). */
  onBatch: (batch: Measurement[], first: boolean) => void;
  onProgress: (done: number, total: number) => void;
  /** Segundos que faltan de la espera por un 429, o null cuando no se espera. */
  onWait: (secondsLeft: number | null) => void;
};

export type RunResult = {
  status: "done" | "cancelled" | "error";
  collected: Measurement[];
  /** true si llegó al menos un lote (y por tanto se reemplazó la fase). */
  replaced: boolean;
  error?: unknown;
};

/** Espera ms en pasos de 1 s informando la cuenta regresiva; cancelable. */
async function waitWithCountdown(ms: number, deps: RunDeps, signal: AbortSignal): Promise<void> {
  let remaining = ms;
  try {
    while (remaining > 0 && !signal.aborted) {
      deps.onWait(Math.ceil(remaining / 1000));
      const step = Math.min(1000, remaining);
      await deps.sleep(step, signal);
      remaining -= step;
    }
  } finally {
    deps.onWait(null);
  }
  if (signal.aborted) throw abortError();
}

/**
 * Ejecuta el experimento por lotes secuenciales. Nunca lanza: devuelve cómo terminó.
 * Las mediciones previas de la fase solo se reemplazan cuando llega el primer lote (decisión 71).
 */
export async function runBatches(config: ExperimentConfig, deps: RunDeps, signal: AbortSignal): Promise<RunResult> {
  const perTarget = config.warmup + config.samplesPerTarget;
  const total = perTarget * 2;
  const batchSize = Math.min(BATCH_SIZE, maxCountForBudget(config.timeoutMs, config.delayMs));
  const collected: Measurement[] = [];
  let replaced = false;
  let doneTarget = 0;
  deps.onProgress(0, total);

  const send = async (body: MeasureRequest): Promise<Measurement[]> => {
    for (let attempt = 0; ; attempt++) {
      await deps.waitForSlot(signal);
      try {
        return await deps.post(body, signal);
      } catch (error) {
        if (!(error instanceof MeasureApiError) || error.status !== 429 || attempt >= MAX_429_RETRIES) throw error;
        await waitWithCountdown(Math.min(error.retryAfterMs ?? 2000, MAX_RETRY_WAIT_MS), deps, signal);
      }
    }
  };

  try {
    while (doneTarget < perTarget) {
      if (doneTarget > 0) {
        await deps.sleep(config.delayMs, signal);
        if (signal.aborted) throw abortError();
      }
      const count = Math.min(batchSize, perTarget - doneTarget);
      const batch = await send({
        runId: deps.runId,
        phase: config.phase,
        targets: config.targets,
        countPerTarget: count,
        seqOffset: doneTarget * 2,
        warmupRemaining: Math.min(count, Math.max(0, config.warmup - doneTarget)),
        delayMs: config.delayMs,
        timeoutMs: config.timeoutMs,
        order: config.order,
      });
      deps.onBatch(batch, !replaced);
      replaced = true;
      collected.push(...batch);
      doneTarget += count;
      deps.onProgress(doneTarget * 2, total);
    }
    return { status: "done", collected, replaced };
  } catch (error) {
    if (signal.aborted) return { status: "cancelled", collected, replaced };
    return { status: "error", collected, replaced, error };
  }
}
