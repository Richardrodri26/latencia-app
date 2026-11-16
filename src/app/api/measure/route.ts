import { NextResponse } from "next/server";
import * as z from "zod";
import { MAX_BODY_BYTES_IN, measureRequestSchema } from "@/lib/schemas";
import { measureBatch } from "@/lib/measure.server";
import { checkUrl } from "@/lib/urlGuard.server";
import { clientIp, measureLimiter as limiter } from "@/lib/rateLimit.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Next exige un literal aquí. Debe coincidir con MAX_DURATION_S de schemas.ts (lo verifica un test).
// 60 s es válido en el plan Hobby de Vercel con o sin Fluid Compute (decisión 68).
export const maxDuration = 60;

const json = (body: unknown, status: number, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers });

/** Rechaza POST desde otros sitios cuando el navegador envía Sec-Fetch-Site u Origin; curl y pruebas (sin cabeceras) pasan. */
function isCrossSite(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return true;
    }
    const hosts = [request.headers.get("host"), request.headers.get("x-forwarded-host"), new URL(request.url).host];
    return !hosts.some((h) => h && h.toLowerCase() === originHost.toLowerCase());
  }
  return false;
}

export async function POST(request: Request) {
  if (isCrossSite(request)) return json({ error: "Origen no permitido" }, 403);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json({ error: "El Content-Type debe ser application/json" }, 415);
  }
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES_IN) {
    return json({ error: "El cuerpo de la solicitud es demasiado grande" }, 413);
  }

  const slot = limiter.acquire(clientIp(request.headers));
  if (!slot.ok) {
    const error =
      slot.reason === "concurrent"
        ? "Ya hay una medición en curso desde tu conexión. Espera a que termine."
        : "Demasiadas solicitudes. Espera un momento antes de volver a intentar.";
    return json({ error }, 429, { "Retry-After": String(slot.retryAfterSec) });
  }

  try {
    let text: string;
    try {
      text = await request.text();
    } catch {
      return json({ error: "No se pudo leer el cuerpo de la solicitud" }, 400);
    }
    if (text.length > MAX_BODY_BYTES_IN) return json({ error: "El cuerpo de la solicitud es demasiado grande" }, 413);

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "El cuerpo debe ser JSON válido" }, 400);
    }

    const parsed = measureRequestSchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Solicitud inválida", ...z.flattenError(parsed.error) }, 400);
    }

    const checks = await Promise.all(parsed.data.targets.map((t) => checkUrl(t.url)));
    const blocked = parsed.data.targets.flatMap((t, i) => {
      const c = checks[i];
      return c.ok ? [] : [{ url: t.url, reason: c.reason }];
    });
    if (blocked.length > 0) {
      return json(
        {
          error: `URL no permitida: ${blocked[0].reason}. Solo se aceptan URLs http/https de hosts públicos.`,
          urls: blocked.map((b) => b.url),
          reasons: blocked.map((b) => b.reason),
        },
        400,
      );
    }

    const measurements = await measureBatch(parsed.data, request.signal);
    return json({ measurements }, 200);
  } finally {
    slot.release();
  }
}
