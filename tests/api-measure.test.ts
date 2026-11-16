import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// DNS simulado: los hosts de prueba resuelven a IPs públicas; "evil.example.com" a una privada.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (host: string) =>
    host === "evil.example.com" ? [{ address: "10.0.0.5", family: 4 }] : [{ address: "93.184.216.34", family: 4 }],
  ),
}));

import { POST, maxDuration } from "@/app/api/measure/route";
import { MAX_DURATION_S } from "@/lib/schemas";
import { measureLimiter } from "@/lib/rateLimit.server";
import { clearUrlGuardCache } from "@/lib/urlGuard.server";

const validBody = {
  runId: "run1",
  phase: "piloto",
  targets: [
    { id: "A", name: "API A", url: "https://a.example.com/x" },
    { id: "B", name: "API B", url: "https://b.example.com/y" },
  ],
  countPerTarget: 2,
  seqOffset: 10,
  warmupRemaining: 1,
  delayMs: 0,
  timeoutMs: 1000,
  order: "intercalado",
};

const post = (body: unknown, raw = false, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/measure", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  measureLimiter.clear();
  clearUrlGuardCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/measure", () => {
  it("cuerpo que no es JSON -> 400", async () => {
    const res = await post("{no es json", true);
    expect(res.status).toBe(400);
  });

  it("cuerpo inválido -> 400 con errores de Zod", async () => {
    const res = await post({ ...validBody, countPerTarget: 0 });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors.countPerTarget).toBeDefined();
  });

  it("host privado -> 400 y no hace ninguna petición", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const body = {
      ...validBody,
      targets: [validBody.targets[0], { id: "B", name: "Local", url: "http://192.168.1.10/api" }],
    };
    const res = await post(body);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.urls).toEqual(["http://192.168.1.10/api"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lote válido: mide en orden A,B,A,B con calentamiento y secuencia", async () => {
    const calls: string[] = [];
    let active = 0;
    let maxActive = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 1));
        active--;
        return new Response("hola", { status: 200 });
      }),
    );

    const res = await post(validBody);
    expect(res.status).toBe(200);
    const { measurements } = await res.json();

    expect(measurements).toHaveLength(4);
    expect(calls).toEqual([
      "https://a.example.com/x",
      "https://b.example.com/y",
      "https://a.example.com/x",
      "https://b.example.com/y",
    ]);
    expect(maxActive).toBe(1); // secuencial, nunca en paralelo
    expect(measurements.map((m: { target: string }) => m.target)).toEqual(["A", "B", "A", "B"]);
    expect(measurements.map((m: { seq: number }) => m.seq)).toEqual([10, 11, 12, 13]);
    expect(measurements.map((m: { warmup: boolean }) => m.warmup)).toEqual([true, true, false, false]);
    for (const m of measurements) {
      expect(m).toMatchObject({ ok: true, status: 200, bytes: 4, error: null, phase: "piloto", runId: "run1" });
      expect(m.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("errores de red y HTTP se registran como ok = false", async () => {
    let i = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        i++;
        if (i === 1) throw new TypeError("fallo de red");
        return new Response("x", { status: 500 });
      }),
    );
    const res = await post({ ...validBody, countPerTarget: 1, warmupRemaining: 0 });
    const { measurements } = await res.json();
    expect(measurements[0]).toMatchObject({ ok: false, error: "network", latencyMs: null, status: null });
    expect(measurements[1]).toMatchObject({ ok: false, error: "http", status: 500 });
  });

  it("host público que resuelve a IP privada -> 400 y no hace peticiones", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const body = { ...validBody, targets: [validBody.targets[0], { id: "B", name: "X", url: "https://evil.example.com/" }] };
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).reasons[0]).toMatch(/privada/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("IP de metadata y credenciales -> 400", async () => {
    vi.stubGlobal("fetch", vi.fn());
    for (const url of ["http://169.254.169.254/latest/meta-data", "https://user:pw@a.example.com/"]) {
      const res = await post({ ...validBody, targets: [validBody.targets[0], { id: "B", name: "X", url }] });
      expect(res.status).toBe(400);
    }
  });

  it("peor caso fuera del presupuesto -> 400", async () => {
    const res = await post({ ...validBody, countPerTarget: 10, timeoutMs: 15000 });
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.countPerTarget).toBeDefined();
  });

  it("cuerpo demasiado grande -> 413", async () => {
    const res = await post("x".repeat(20_000), true);
    expect(res.status).toBe(413);
  });

  it("Content-Type distinto de JSON -> 415", async () => {
    const res = await post(validBody, false, { "content-type": "text/plain" });
    expect(res.status).toBe(415);
  });

  it("POST de otro sitio -> 403; mismo origen -> pasa", async () => {
    expect((await post(validBody, false, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post(validBody, false, { origin: "https://otro.com", host: "localhost" })).status).toBe(403);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x")));
    const ok = await post(validBody, false, { origin: "http://localhost", host: "localhost", "sec-fetch-site": "same-origin" });
    expect(ok.status).toBe(200);
  });

  it("supera el límite por minuto -> 429 con Retry-After", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x")));
    const headers = { "x-forwarded-for": "203.0.113.9" };
    for (let i = 0; i < 120; i++) expect((await post({ ...validBody, countPerTarget: 1, warmupRemaining: 0 }, false, headers)).status).toBe(200);
    const res = await post(validBody, false, headers);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    // otra IP no se ve afectada
    expect((await post(validBody, false, { "x-forwarded-for": "198.51.100.7" })).status).toBe(200);
  });

  it("segunda petición simultánea de la misma IP -> 429", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { await new Promise((r) => setTimeout(r, 30)); return new Response("x"); }));
    const headers = { "x-real-ip": "192.0.2.50" };
    const [a, b] = await Promise.all([post(validBody, false, headers), post(validBody, false, headers)]);
    expect([a.status, b.status].sort()).toEqual([200, 429]);
  });

  it("maxDuration del route coincide con MAX_DURATION_S", () => {
    expect(maxDuration).toBe(MAX_DURATION_S);
    expect(readFileSync("src/app/api/measure/route.ts", "utf8")).toMatch(new RegExp(`maxDuration = ${MAX_DURATION_S};`));
  });
});
