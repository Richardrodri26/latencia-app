import { measurementSchema, type Measurement } from "@/lib/schemas";

export const CSV_HEADER = [
  "id",
  "runId",
  "phase",
  "target",
  "seq",
  "startedAt",
  "latencyMs",
  "status",
  "ok",
  "bytes",
  "error",
  "warmup",
] as const;

export type RowError = { row: number; message: string };
export type ParseResult = { valid: Measurement[]; errors: RowError[] };

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function cell(value: string | number | boolean | null): string {
  return value === null ? "" : escapeField(String(value));
}

/** Serializa mediciones: coma como separador, punto decimal y vacío para null. */
export function toCsv(measurements: Measurement[]): string {
  const lines = [CSV_HEADER.join(",")];
  for (const m of measurements) {
    lines.push(
      [
        m.id,
        m.runId,
        m.phase,
        m.target,
        m.seq,
        m.startedAt,
        m.latencyMs,
        m.status,
        m.ok,
        m.bytes,
        m.error,
        m.warmup,
      ]
        .map(cell)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}

/** Parser CSV mínimo (RFC 4180): comillas dobles, comas y saltos de línea dentro de campos. */
export function parseCsvRecords(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      endField();
    } else if (ch === "\n") {
      endRecord();
    } else if (ch === "\r") {
      if (src[i + 1] === "\n") i++;
      endRecord();
    } else {
      field += ch;
    }
  }
  if (field !== "" || record.length > 0) endRecord();
  // Ignorar líneas totalmente vacías.
  return records.filter((r) => !(r.length === 1 && r[0] === ""));
}

const NUMERIC = new Set(["seq", "latencyMs", "status", "bytes"]);
const BOOLEAN = new Set(["ok", "warmup"]);
const NULLABLE = new Set(["latencyMs", "status", "bytes", "error"]);

function convert(column: string, raw: string): unknown {
  if (raw === "") return NULLABLE.has(column) ? null : "";
  if (NUMERIC.has(column)) return Number(raw);
  if (BOOLEAN.has(column)) return raw === "true" ? true : raw === "false" ? false : raw;
  return raw;
}

function describeIssues(error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues.map((i) => `${i.path.join(".") || "fila"}: ${i.message}`).join("; ");
}

/**
 * Importa un CSV validando cada fila con measurementSchema.
 * Las filas inválidas se reportan (número de fila de datos, empezando en 1) sin perder las demás.
 */
export function parseCsv(text: string): ParseResult {
  const records = parseCsvRecords(text);
  if (records.length === 0) {
    return { valid: [], errors: [{ row: 0, message: "El archivo está vacío" }] };
  }
  const header = records[0].map((h) => h.trim());
  const missing = CSV_HEADER.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return {
      valid: [],
      errors: [{ row: 0, message: `Encabezado inválido. Faltan columnas: ${missing.join(", ")}` }],
    };
  }

  const valid: Measurement[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();

  records.slice(1).forEach((rec, idx) => {
    const row = idx + 1;
    if (rec.length !== header.length) {
      errors.push({ row, message: `Se esperaban ${header.length} columnas y hay ${rec.length}` });
      return;
    }
    const obj: Record<string, unknown> = {};
    header.forEach((col, c) => {
      obj[col] = convert(col, rec[c]);
    });
    const parsed = measurementSchema.safeParse(obj);
    if (!parsed.success) {
      errors.push({ row, message: describeIssues(parsed.error) });
    } else if (seen.has(parsed.data.id)) {
      errors.push({ row, message: `id duplicado: ${parsed.data.id}` });
    } else {
      seen.add(parsed.data.id);
      valid.push(parsed.data);
    }
  });
  return { valid, errors };
}

/** Importa un arreglo JSON de mediciones con la misma validación por fila. */
export function parseJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { valid: [], errors: [{ row: 0, message: "JSON inválido" }] };
  }
  if (!Array.isArray(data)) {
    return { valid: [], errors: [{ row: 0, message: "Se esperaba un arreglo de mediciones" }] };
  }
  const valid: Measurement[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();
  data.forEach((item, idx) => {
    const parsed = measurementSchema.safeParse(item);
    if (!parsed.success) errors.push({ row: idx + 1, message: describeIssues(parsed.error) });
    else if (seen.has(parsed.data.id)) errors.push({ row: idx + 1, message: `id duplicado: ${parsed.data.id}` });
    else {
      seen.add(parsed.data.id);
      valid.push(parsed.data);
    }
  });
  return { valid, errors };
}
