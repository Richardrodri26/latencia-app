import { describe, expect, it } from "vitest";
import { CSV_HEADER, parseCsv, parseJson, toCsv } from "@/lib/csv";
import type { Measurement } from "@/lib/schemas";

const sample: Measurement[] = [
  {
    id: "r-0",
    runId: "r",
    phase: "piloto",
    target: "A",
    seq: 0,
    startedAt: "2026-11-10T15:00:00.000Z",
    latencyMs: 275.3878000000004,
    status: 200,
    ok: true,
    bytes: 292,
    error: null,
    warmup: true,
  },
  {
    id: "r-1",
    runId: "r",
    phase: "piloto",
    target: "B",
    seq: 1,
    startedAt: "2026-11-10T15:00:01.000Z",
    latencyMs: null,
    status: null,
    ok: false,
    bytes: null,
    error: "timeout",
    warmup: false,
  },
];

describe("csv", () => {
  it("usa el encabezado exacto", () => {
    expect(toCsv([]).trim()).toBe(
      "id,runId,phase,target,seq,startedAt,latencyMs,status,ok,bytes,error,warmup",
    );
    expect(CSV_HEADER).toHaveLength(12);
  });
  it("exportar e importar devuelve los mismos datos", () => {
    const result = parseCsv(toCsv(sample));
    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual(sample);
  });
  it("una fila corrupta se reporta sin perder las demás", () => {
    const lines = toCsv(sample).trim().split("\n");
    lines.splice(1, 0, "x,r,piloto,Z,abc,fecha,12,200,true,10,,false");
    const result = parseCsv(lines.join("\n"));
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(1);
  });
  it("soporta CRLF, BOM y campos entre comillas", () => {
    const csv = "﻿" + toCsv(sample).replace(/\n/g, "\r\n");
    expect(parseCsv(csv).valid).toEqual(sample);
    const quoted = parseCsv(toCsv([{ ...sample[0], id: 'a,"b"' }]));
    expect(quoted.valid[0].id).toBe('a,"b"');
  });
  it("rechaza encabezados inválidos", () => {
    expect(parseCsv("a,b,c\n1,2,3").errors[0].row).toBe(0);
  });
  it("JSON valida por fila", () => {
    const r = parseJson(JSON.stringify([...sample, { id: 1 }]));
    expect(r.valid).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
  });
});
