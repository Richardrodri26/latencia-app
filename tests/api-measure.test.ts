import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/measure/route";

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

const post = (body: unknown, raw = false) =>
  POST(
    new Request("http://localhost/api/measure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );

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
});
