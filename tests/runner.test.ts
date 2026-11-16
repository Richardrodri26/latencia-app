import { describe, expect, it } from "vitest";
import { applyBatch, runNotice } from "@/lib/measurements";
import { MeasureApiError, runBatches, type RunDeps } from "@/lib/runner";
import { DEFAULT_CONFIG } from "@/lib/presets";
import type { ExperimentConfig, Measurement, MeasureRequest, Phase } from "@/lib/schemas";

function m(phase: Phase, seq: number, runId: string): Measurement {
  return {
    id: `${runId}-${phase}-${seq}`,
    runId,
    phase,
    target: seq % 2 === 0 ? "A" : "B",
    seq,
    startedAt: "2026-11-14T10:00:00.000Z",
    latencyMs: 100 + seq,
    status: 200,
    ok: true,
    bytes: 10,
    error: null,
    warmup: false,
  };
}

const config: ExperimentConfig = { ...DEFAULT_CONFIG, phase: "principal", warmup: 0, samplesPerTarget: 4, delayMs: 0 };
const old = [m("piloto", 0, "p"), m("principal", 0, "old"), m("principal", 1, "old")];

/** Simula el almacén: aplica cada lote con applyBatch, igual que ExperimentContext. */
function harness(post: RunDeps["post"]) {
  let store = [...old];
  const waits: Array<number | null> = [];
  const requests: MeasureRequest[] = [];
  const deps: RunDeps = {
    runId: "new",
    post: async (body, signal) => {
      requests.push(body);
      return post(body, signal);
    },
    waitForSlot: async () => {},
    sleep: async () => {},
    onBatch: (batch, first) => {
      store = applyBatch(store, "principal", batch, first);
    },
    onProgress: () => {},
    onWait: (s) => waits.push(s),
  };
  return { deps, waits, requests, getStore: () => store };
}

const okBatch = (body: MeasureRequest) =>
  Array.from({ length: body.countPerTarget * 2 }, (_, i) => m("principal", body.seqOffset + i, body.runId));

describe("applyBatch", () => {
  it("el primer lote reemplaza solo la fase; los siguientes se agregan", () => {
    const first = applyBatch(old, "principal", [m("principal", 0, "n")], true);
    expect(first.filter((x) => x.phase === "principal").map((x) => x.runId)).toEqual(["n"]);
    expect(first.filter((x) => x.phase === "piloto")).toHaveLength(1);
    const second = applyBatch(first, "principal", [m("principal", 1, "n")], false);
    expect(second.filter((x) => x.phase === "principal")).toHaveLength(2);
  });
});

describe("runBatches: reemplazo de la fase", () => {
  it("ejecución completa: reemplaza, seq desde 0, secuencial, sin filas viejas", async () => {
    const h = harness(async (b) => okBatch(b));
    const r = await runBatches(config, h.deps, new AbortController().signal);
    expect(r.status).toBe("done");
    expect(h.requests.map((q) => q.seqOffset)).toEqual([0, 4]);
    const principal = h.getStore().filter((x) => x.phase === "principal");
    expect(principal).toHaveLength(8);
    expect(principal.every((x) => x.runId === "new")).toBe(true);
    expect(principal[0].seq).toBe(0);
    expect(h.getStore().filter((x) => x.phase === "piloto")).toHaveLength(1);
  });

  it("falla en el primer lote (error de red): se conservan los datos anteriores", async () => {
    const h = harness(async () => {
      throw new Error("fallo de red");
    });
    const r = await runBatches(config, h.deps, new AbortController().signal);
    expect(r.status).toBe("error");
    expect(r.replaced).toBe(false);
    expect(h.getStore()).toEqual(old);
  });

  it("429 agotado antes del primer lote: reintenta 3 veces con cuenta regresiva y conserva lo anterior", async () => {
    let calls = 0;
    const h = harness(async () => {
      calls++;
      throw new MeasureApiError("Demasiadas solicitudes.", 429, 2000);
    });
    const r = await runBatches(config, h.deps, new AbortController().signal);
    expect(calls).toBe(4);
    expect(r.status).toBe("error");
    expect(r.replaced).toBe(false);
    expect(h.getStore()).toEqual(old);
    expect(h.waits).toContain(2);
    expect(h.waits.at(-1)).toBeNull();
  });

  it("cancelar antes del primer lote conserva lo anterior", async () => {
    const controller = new AbortController();
    const h = harness(async () => {
      controller.abort();
      throw new DOMException("Cancelado", "AbortError");
    });
    const r = await runBatches(config, h.deps, controller.signal);
    expect(r.status).toBe("cancelled");
    expect(r.replaced).toBe(false);
    expect(h.getStore()).toEqual(old);
  });

  it("cancelar durante la espera del 429 funciona y no deja la espera activa", async () => {
    const controller = new AbortController();
    const h = harness(async () => {
      throw new MeasureApiError("Demasiadas solicitudes.", 429, 5000);
    });
    h.deps.sleep = async () => controller.abort();
    const r = await runBatches(config, h.deps, controller.signal);
    expect(r.status).toBe("cancelled");
    expect(h.getStore()).toEqual(old);
    expect(h.waits.at(-1)).toBeNull();
  });

  it("falla tras el primer lote: queda solo lo nuevo (ya reemplazó), nunca viejo + nuevo", async () => {
    let n = 0;
    const h = harness(async (b) => {
      if (++n === 2) throw new Error("fallo");
      return okBatch(b);
    });
    const r = await runBatches(config, h.deps, new AbortController().signal);
    expect(r.status).toBe("error");
    expect(r.replaced).toBe(true);
    const principal = h.getStore().filter((x) => x.phase === "principal");
    expect(principal).toHaveLength(4);
    expect(principal.every((x) => x.runId === "new")).toBe(true);
  });

  it("un 429 que se recupera continúa y reemplaza con el primer lote", async () => {
    let n = 0;
    const h = harness(async (b) => {
      if (++n === 1) throw new MeasureApiError("Espera", 429, 1000);
      return okBatch(b);
    });
    const r = await runBatches(config, h.deps, new AbortController().signal);
    expect(r.status).toBe("done");
    expect(h.getStore().filter((x) => x.phase === "principal").every((x) => x.runId === "new")).toBe(true);
  });
});

describe("runNotice", () => {
  it("done no genera aviso", () => {
    expect(runNotice({ status: "done", replaced: true, previousCount: 2, savedCount: 8 })).toBeNull();
  });
  it("error antes del primer lote indica que se conservaron las anteriores", () => {
    const n = runNotice({ status: "error", replaced: false, previousCount: 62, savedCount: 0, detail: "Demasiadas solicitudes." });
    expect(n?.kind).toBe("error");
    expect(n?.text).toContain("se conservaron las 62 mediciones anteriores");
    expect(n?.text).toContain("Demasiadas solicitudes.");
  });
  it("error sin datos previos no promete conservar nada", () => {
    expect(runNotice({ status: "error", replaced: false, previousCount: 0, savedCount: 0 })?.text).not.toContain("conservaron");
  });
  it("error tras el primer lote indica lo guardado", () => {
    expect(runNotice({ status: "error", replaced: true, previousCount: 2, savedCount: 6 })?.text).toContain("6 mediciones nuevas");
  });
  it("cancelado antes y después del primer lote", () => {
    expect(runNotice({ status: "cancelled", replaced: false, previousCount: 1, savedCount: 0 })?.text).toContain("se conservó la medición anterior");
    expect(runNotice({ status: "cancelled", replaced: true, previousCount: 1, savedCount: 2 })?.text).toContain("2 mediciones nuevas");
  });
});
