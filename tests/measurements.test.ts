import { describe, expect, it } from "vitest";
import { countPhase, removePhase, replaceMessage } from "@/lib/measurements";
import type { Measurement, Phase } from "@/lib/schemas";

function m(phase: Phase, seq: number, runId = "r1"): Measurement {
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

describe("mediciones por fase", () => {
  const data = [m("piloto", 0), m("piloto", 1), m("principal", 0, "r2"), m("principal", 1, "r2"), m("principal", 2, "r2")];

  it("cuenta las mediciones de cada fase", () => {
    expect(countPhase(data, "piloto")).toBe(2);
    expect(countPhase(data, "principal")).toBe(3);
    expect(countPhase([], "piloto")).toBe(0);
  });

  it("removePhase quita solo la fase indicada", () => {
    const sinPiloto = removePhase(data, "piloto");
    expect(sinPiloto).toHaveLength(3);
    expect(sinPiloto.every((x) => x.phase === "principal")).toBe(true);
    const sinPrincipal = removePhase(data, "principal");
    expect(sinPrincipal).toEqual(data.filter((x) => x.phase === "piloto"));
  });

  it("removePhase no muta el original y reiniciar una fase deja seq desde 0", () => {
    const copia = [...data];
    removePhase(data, "principal");
    expect(data).toEqual(copia);
    const nueva = [...removePhase(data, "principal"), m("principal", 0, "r3")];
    expect(countPhase(nueva, "principal")).toBe(1);
    expect(new Set(nueva.filter((x) => x.phase === "principal").map((x) => x.runId))).toEqual(new Set(["r3"]));
  });

  it("el mensaje indica cuántas mediciones se reemplazan", () => {
    expect(replaceMessage("piloto", 62)).toContain("62 mediciones");
    expect(replaceMessage("principal", 1)).toContain("1 medición");
  });
});
