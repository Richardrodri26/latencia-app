import type { Measurement, MeasureRequest, TargetId } from "@/lib/schemas";

export type SingleResult = {
  latencyMs: number | null;
  status: number | null;
  ok: boolean;
  bytes: number | null;
  error: "timeout" | "network" | "http" | null;
};

/** Mide una petición GET incluyendo la descarga completa del cuerpo. */
export async function measureOnce(url: string, timeoutMs: number): Promise<SingleResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "cache-control": "no-cache", "user-agent": "LatenciaLab/1.0 (proyecto academico)" },
    });
    const body = await res.arrayBuffer();
    const latencyMs = performance.now() - start;
    return {
      latencyMs,
      status: res.status,
      ok: res.ok,
      bytes: body.byteLength,
      error: res.ok ? null : "http",
    };
  } catch {
    return {
      latencyMs: null,
      status: null,
      ok: false,
      bytes: null,
      error: controller.signal.aborted ? "timeout" : "network",
    };
  } finally {
    clearTimeout(timer);
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
export async function measureBatch(req: MeasureRequest): Promise<Measurement[]> {
  const urls: Record<TargetId, string> = { A: req.targets[0].url, B: req.targets[1].url };
  const sequence = buildOrder(req.countPerTarget, req.order);
  const seen: Record<TargetId, number> = { A: 0, B: 0 };
  const out: Measurement[] = [];

  for (let i = 0; i < sequence.length; i++) {
    if (i > 0 && req.delayMs > 0) await sleep(req.delayMs);
    const target = sequence[i];
    const warmup = seen[target] < req.warmupRemaining;
    seen[target]++;
    const seq = req.seqOffset + i;
    const startedAt = new Date().toISOString();
    const result = await measureOnce(urls[target], req.timeoutMs);
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

/** Hosts privados o locales que se rechazan salvo ALLOW_PRIVATE_URLS=true. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1" || h === "0.0.0.0") return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  const m = /^172\.(\d{1,3})\./.exec(h);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export function urlAllowed(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (process.env.ALLOW_PRIVATE_URLS === "true") return true;
  return !isPrivateHost(u.hostname);
}
