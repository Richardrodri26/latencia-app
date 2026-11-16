/**
 * Limitador en memoria por clave (IP): ventana deslizante de peticiones + máximo de peticiones simultáneas.
 * El estado vive en la memoria de la instancia: en serverless es "mejor esfuerzo" (docs/decisiones.md, decisión 69).
 */

export type LimiterOptions = {
  maxRequests: number;
  windowMs: number;
  maxConcurrent: number;
  maxKeys?: number;
  now?: () => number;
};

export type Acquire =
  | { ok: true; release: () => void }
  | { ok: false; reason: "rate" | "concurrent"; retryAfterSec: number };

type Entry = { times: number[]; active: number };

export function createLimiter(options: LimiterOptions) {
  const { maxRequests, windowMs, maxConcurrent, maxKeys = 5000, now = Date.now } = options;
  const entries = new Map<string, Entry>();

  function sweep(t: number) {
    for (const [key, e] of entries) {
      if (e.active === 0 && (e.times.length === 0 || t - e.times[e.times.length - 1] >= windowMs)) entries.delete(key);
    }
  }

  function acquire(rawKey: string): Acquire {
    const t = now();
    if (entries.size >= maxKeys) sweep(t);
    // Con demasiadas claves distintas, las nuevas comparten un cubo común (acota la memoria).
    const key = entries.has(rawKey) || entries.size < maxKeys ? rawKey : "__overflow__";
    let e = entries.get(key);
    if (!e) {
      e = { times: [], active: 0 };
      entries.set(key, e);
    }
    while (e.times.length > 0 && t - e.times[0] >= windowMs) e.times.shift();

    if (e.active >= maxConcurrent) return { ok: false, reason: "concurrent", retryAfterSec: 2 };
    if (e.times.length >= maxRequests) {
      return { ok: false, reason: "rate", retryAfterSec: Math.max(1, Math.ceil((e.times[0] + windowMs - t) / 1000)) };
    }
    e.times.push(t);
    e.active++;
    const entry = e;
    let released = false;
    return {
      ok: true,
      release: () => {
        if (released) return;
        released = true;
        entry.active = Math.max(0, entry.active - 1);
      },
    };
  }

  return { acquire, size: () => entries.size, clear: () => entries.clear() };
}

/** IP del cliente: x-real-ip (Vercel) o primer valor de x-forwarded-for; "unknown" si no hay cabeceras. */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}

/** Límites por IP de /api/measure: 120 peticiones por minuto y 1 en curso (el cliente es secuencial). Decisión 69. */
export const MEASURE_RATE_LIMIT = { maxRequests: 120, windowMs: 60_000, maxConcurrent: 1 } as const;

const g = globalThis as typeof globalThis & { __measureLimiter?: ReturnType<typeof createLimiter> };
/** Singleton en globalThis para sobrevivir a recargas en desarrollo; en serverless es por instancia. */
export const measureLimiter = (g.__measureLimiter ??= createLimiter(MEASURE_RATE_LIMIT));
