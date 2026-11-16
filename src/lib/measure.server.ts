import { checkUrl } from "@/lib/urlGuard.server";
import type { Measurement, MeasureRequest, TargetId } from "@/lib/schemas";

export type SingleResult = {
  latencyMs: number | null;
  status: number | null;
  ok: boolean;
  bytes: number | null;
  error: "timeout" | "network" | "http" | null;
};

/** Tope del cuerpo que se descarga por medición (se lee y descarta; nunca se acumula en memoria). */
export const MAX_BODY_BYTES = 5 * 1024 * 1024;
/** Saltos de redirección que se siguen (cada uno se valida como una URL nueva). */
export const MAX_REDIRECTS = 3;

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

/** Lee y descarta el cuerpo contando bytes; devuelve truncated=true si supera el tope. */
async function drainBody(res: Response, cap: number): Promise<{ bytes: number; truncated: boolean }> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > cap) {
    await res.body?.cancel().catch(() => undefined);
    return { bytes: 0, truncated: true };
  }
  if (!res.body) return { bytes: 0, truncated: false };
  const reader = res.body.getReader();
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > cap) {
      await reader.cancel().catch(() => undefined);
      return { bytes, truncated: true };
    }
  }
  return { bytes, truncated: false };
}

/**
 * Mide una petición GET incluyendo la descarga completa del cuerpo (hasta MAX_BODY_BYTES).
 *
 * Redirecciones: se siguen a mano hasta MAX_REDIRECTS saltos y cada destino se valida igual que la URL
 * inicial (un redirect a un host privado se rechaza). La latencia es la SUMA de los tiempos de red de cada
 * salto (fetch + lectura del cuerpo); la validación DNS entre saltos no cuenta. El timeout cubre toda la cadena.
 */
export async function measureOnce(url: string, timeoutMs: number, abortSignal?: AbortSignal): Promise<SingleResult> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = abortSignal ? AbortSignal.any([timeout, abortSignal]) : timeout;
  const fail = (): SingleResult => ({
    latencyMs: null,
    status: null,
    ok: false,
    bytes: null,
    error: timeout.aborted ? "timeout" : "network",
  });

  let current = url;
  let elapsed = 0;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const check = await checkUrl(current);
      if (!check.ok) return fail();

      const t0 = performance.now();
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal,
        headers: { "cache-control": "no-cache", "user-agent": "LatenciaLab/1.0 (proyecto academico)" },
      });

      const location = res.headers.get("location");
      if (REDIRECT_STATUS.has(res.status) && location) {
        await res.body?.cancel().catch(() => undefined);
        elapsed += performance.now() - t0;
        current = new URL(location, current).href;
        continue;
      }

      const { bytes, truncated } = await drainBody(res, MAX_BODY_BYTES);
      elapsed += performance.now() - t0;
      if (truncated) return fail();
      return { latencyMs: elapsed, status: res.status, ok: res.ok, bytes, error: res.ok ? null : "http" };
    }
    return fail(); // demasiadas redirecciones
  } catch {
    return fail();
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Baraja con Fisher-Yates (copia). */
export function shuffle<T>(items: T[], rand: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Orden de las peticiones de un lote: A,B,A,B... o barajado. */
export function buildOrder(count: number, order: "intercalado" | "aleatorio"): TargetId[] {
  const list: TargetId[] = [];
  for (let i = 0; i < count; i++) list.push("A", "B");
  return order === "aleatorio" ? shuffle(list) : list;
}

/**
 * Mide un lote de forma SECUENCIAL (nunca en paralelo, la concurrencia distorsiona
 * las latencias), con una pausa de delayMs entre peticiones consecutivas.
 */
export async function measureBatch(req: MeasureRequest, signal?: AbortSignal): Promise<Measurement[]> {
  const urls: Record<TargetId, string> = { A: req.targets[0].url, B: req.targets[1].url };
  const sequence = buildOrder(req.countPerTarget, req.order);
  const seen: Record<TargetId, number> = { A: 0, B: 0 };
  const out: Measurement[] = [];

  for (let i = 0; i < sequence.length; i++) {
    if (i > 0 && req.delayMs > 0) await sleep(req.delayMs);
    if (signal?.aborted) break; // el cliente canceló: se devuelve lo medido hasta ahora
    const target = sequence[i];
    const warmup = seen[target] < req.warmupRemaining;
    seen[target]++;
    const seq = req.seqOffset + i;
    const startedAt = new Date().toISOString();
    const result = await measureOnce(urls[target], req.timeoutMs, signal);
    if (signal?.aborted) break;
    out.push({
      id: `${req.runId}-${seq}`,
      runId: req.runId,
      phase: req.phase,
      target,
      seq,
      startedAt,
      ...result,
      warmup,
    });
  }
  return out;
}

export { isPrivateHost, urlAllowed } from "@/lib/urlGuard.server";
